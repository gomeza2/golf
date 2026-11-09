import type { WorkshopDocument } from "../shared/workshop";
import { groupSelection, type WorkshopEditor } from "../shared/workshopProject";
import { names } from "./workshopLabels";
export function WorkshopOrganization({
  doc,
  editor,
  selection,
  onCopy,
  onPaste,
  onScale,
  onEditor,
  onSelect,
  onError,
}: {
  doc: WorkshopDocument;
  editor: WorkshopEditor;
  selection: string[];
  onCopy: () => void;
  onPaste: () => void;
  onScale: (scale: number) => void;
  onEditor: (editor: WorkshopEditor) => void;
  onSelect: (ids: string[]) => void;
  onError: (message: string) => void;
}) {
  const grouped = selection.some((id) =>
      editor.groups.some((g) => g.pieces.includes(id)),
    ),
    locked = selection.some((id) => editor.locked.includes(id));
  return (
    <>
      <div className="workshop-edit-tools" aria-label="Organización de piezas">
        <button disabled={!selection.length} onClick={() => onScale(1.1)}>
          Ampliar selección
        </button>
        <button disabled={!selection.length} onClick={() => onScale(0.9)}>
          Reducir selección
        </button>
        <button disabled={!selection.length} onClick={onCopy}>
          Copiar piezas
        </button>
        <button onClick={onPaste}>Pegar piezas</button>
        <button
          disabled={selection.length < 2}
          onClick={() => {
            try {
              onEditor(groupSelection(doc, editor, selection));
            } catch (e) {
              onError((e as Error).message);
            }
          }}
        >
          Agrupar selección
        </button>
        <button
          disabled={!grouped}
          onClick={() =>
            onEditor({
              ...editor,
              groups: editor.groups.filter(
                (g) => !g.pieces.some((id) => selection.includes(id)),
              ),
            })
          }
        >
          Desagrupar selección
        </button>
        <button
          disabled={!selection.length}
          onClick={() =>
            onEditor({
              ...editor,
              locked: locked
                ? editor.locked.filter((id) => !selection.includes(id))
                : [...editor.locked, ...selection],
            })
          }
        >
          {locked ? "Desbloquear selección" : "Bloquear selección"}
        </button>
      </div>
      <details className="workshop-objects">
        <summary>Objetos y grupos · {doc.pieces.length}</summary>
        {editor.groups.map((g, i) => (
          <div key={g.id} className="workshop-object-group">
            <label>
              Nombre del grupo
              <input
                key={g.name}
                aria-label={`Nombre de grupo ${i + 1}`}
                defaultValue={g.name}
                maxLength={48}
                onBlur={(e) => {
                  if (e.target.value.trim())
                    onEditor({
                      ...editor,
                      groups: editor.groups.map((x) =>
                        x.id === g.id
                          ? { ...x, name: e.target.value.trim() }
                          : x,
                      ),
                    });
                  else e.target.value = g.name;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            </label>
            <button onClick={() => onSelect(g.pieces)}>
              {g.name} · {g.pieces.length} piezas
            </button>
          </div>
        ))}
        {doc.pieces.map((p, i) => (
          <button
            key={p.id}
            aria-pressed={selection.includes(p.id)}
            onClick={() => onSelect([p.id])}
          >
            {i + 1}. {names[p.kind]} · {p.height} m
            {editor.locked.includes(p.id) ? " · Bloqueado" : ""}
          </button>
        ))}
      </details>
    </>
  );
}
