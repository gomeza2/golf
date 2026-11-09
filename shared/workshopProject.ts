import {
  parseWorkshop,
  importWorkshop,
  type WorkshopDocument,
} from "./workshop";
export const MAX_PROJECT_BYTES = 80000;
export type EditorGroup = { id: string; name: string; pieces: string[] };
export type WorkshopEditor = { locked: string[]; groups: EditorGroup[] };
export const emptyEditor = (): WorkshopEditor => ({ locked: [], groups: [] });
/** Editing metadata never participates in the playable document or its checksum. */
export function cleanEditor(
  doc: WorkshopDocument,
  raw?: Partial<WorkshopEditor>,
): WorkshopEditor {
  const valid = new Set(doc.pieces.map((p) => p.id)),
    used = new Set<string>();
  const ids = (value: unknown) =>
    Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (x): x is string => typeof x === "string" && valid.has(x),
            ),
          ),
        ]
      : [];
  const groups: EditorGroup[] = [];
  for (const g of Array.isArray(raw?.groups) ? raw.groups.slice(0, 40) : []) {
    if (
      !g ||
      typeof g.id !== "string" ||
      !/^[\w-]{1,64}$/.test(g.id) ||
      groups.some((x) => x.id === g.id)
    )
      continue;
    const pieces = ids(g.pieces).filter((id) => !used.has(id));
    if (pieces.length < 2) continue;
    pieces.forEach((id) => used.add(id));
    groups.push({
      id: g.id,
      name:
        typeof g.name === "string" && g.name.trim()
          ? g.name.trim().slice(0, 48)
          : "Grupo",
      pieces,
    });
  }
  return { locked: ids(raw?.locked), groups };
}
export function groupSelection(
  doc: WorkshopDocument,
  editor: WorkshopEditor,
  selection: string[],
  makeId: () => string = () => crypto.randomUUID(),
): WorkshopEditor {
  const pieces = [...new Set(selection)].filter((id) =>
    doc.pieces.some((p) => p.id === id),
  );
  if (pieces.length < 2) throw Error("Selecciona al menos dos piezas.");
  return cleanEditor(doc, {
    ...editor,
    groups: [
      ...editor.groups.filter(
        (g) => !g.pieces.some((id) => pieces.includes(id)),
      ),
      { id: makeId(), name: `Grupo ${editor.groups.length + 1}`, pieces },
    ],
  });
}
export function selectedGroup(editor: WorkshopEditor, id: string): string[] {
  return editor.groups.find((g) => g.pieces.includes(id))?.pieces ?? [id];
}
export function assertUnlocked(editor: WorkshopEditor, ids: string[]) {
  if (ids.some((id) => editor.locked.includes(id)))
    throw Error("Desbloquea las piezas seleccionadas antes de modificarlas.");
}
export function exportWorkshopProject(
  document: WorkshopDocument,
  editor: WorkshopEditor,
) {
  return JSON.stringify(
    {
      projectVersion: 1,
      document: parseWorkshop(document),
      editor: cleanEditor(document, editor),
    },
    null,
    2,
  );
}
export function importWorkshopProject(text: string) {
  if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES)
    throw Error("El proyecto supera 80 KB.");
  let input: any;
  try {
    input = JSON.parse(text);
  } catch {
    throw Error("JSON del proyecto no válido.");
  }
  if (input?.projectVersion !== undefined) {
    if (input.projectVersion !== 1)
      throw Error("Versión de proyecto no compatible.");
    const doc = parseWorkshop(input.document);
    // The archive cannot bypass the existing 60 KB document limit.
    importWorkshop(JSON.stringify(doc));
    if (
      !input.editor ||
      !Array.isArray(input.editor.locked) ||
      !Array.isArray(input.editor.groups)
    )
      throw Error("Faltan grupos o bloqueos válidos del proyecto.");
    const editor = cleanEditor(doc, input.editor);
    if (
      editor.locked.length !== input.editor.locked.length ||
      editor.groups.length !== input.editor.groups.length ||
      input.editor.groups.some(
        (g: any) =>
          !g ||
          !Array.isArray(g.pieces) ||
          editor.groups.find((x) => x.id === g.id)?.pieces.length !==
            g.pieces.length,
      )
    )
      throw Error(
        "Los grupos o bloqueos no coinciden con las piezas del proyecto.",
      );
    return { doc, editor };
  }
  return { doc: importWorkshop(text), editor: emptyEditor() };
}
