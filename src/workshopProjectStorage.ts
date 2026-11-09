import { parseWorkshop, type WorkshopDocument } from "../shared/workshop";
import {
  cleanEditor,
  emptyEditor,
  type WorkshopEditor,
} from "../shared/workshopProject";
import { saveWorkshopDraft, type WorkshopHistory } from "./workshopStorage";
export const PROJECT_KEY = "club-workshop-project-v1";
export type ProjectHistory = WorkshopHistory & {
  editor: WorkshopEditor;
  pastEditors: WorkshopEditor[];
  futureEditors: WorkshopEditor[];
};
export function readEditor(doc: WorkshopDocument): WorkshopEditor {
  try {
    const project = JSON.parse(localStorage.getItem(PROJECT_KEY) || "null");
    if (JSON.stringify(parseWorkshop(project.document)) === JSON.stringify(doc))
      return cleanEditor(doc, project.editor);
  } catch {
    /* The legacy playable draft remains authoritative. */
  }
  return emptyEditor();
}
export function saveProject(doc: WorkshopDocument, editor: WorkshopEditor) {
  if (!saveWorkshopDraft(doc)) return false;
  try {
    localStorage.setItem(
      PROJECT_KEY,
      JSON.stringify({
        document: parseWorkshop(doc),
        editor: cleanEditor(doc, editor),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function projectEdit(
  h: ProjectHistory,
  input: WorkshopDocument,
  metadata = h.editor,
): ProjectHistory {
  const doc = parseWorkshop(input),
    editor = cleanEditor(doc, metadata);
  if (
    JSON.stringify(h.present) === JSON.stringify(doc) &&
    JSON.stringify(h.editor) === JSON.stringify(editor)
  )
    return h;
  return {
    past: [...h.past.slice(-59), h.present],
    pastEditors: [...h.pastEditors.slice(-59), h.editor],
    present: doc,
    editor,
    future: [],
    futureEditors: [],
  };
}
export function projectUndo(h: ProjectHistory): ProjectHistory {
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    pastEditors: h.pastEditors.slice(0, -1),
    present: h.past.at(-1)!,
    editor: h.pastEditors.at(-1) ?? emptyEditor(),
    future: [h.present, ...h.future],
    futureEditors: [h.editor, ...h.futureEditors],
  };
}
export function projectRedo(h: ProjectHistory): ProjectHistory {
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    pastEditors: [...h.pastEditors, h.editor],
    present: h.future[0],
    editor: h.futureEditors[0] ?? emptyEditor(),
    future: h.future.slice(1),
    futureEditors: h.futureEditors.slice(1),
  };
}
