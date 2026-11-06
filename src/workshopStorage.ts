import { parseWorkshop, type WorkshopDocument } from "../shared/workshop";
export const WORKSHOP_LIBRARY_KEY = "club-workshop-library-v1";
export const WORKSHOP_DRAFT_KEY = "club-workshop-draft-v1";
export type WorkshopSave = {
  id: string;
  updated: string;
  doc: WorkshopDocument;
};
export function readWorkshopLibrary(): WorkshopSave[] {
  try {
    const raw = JSON.parse(localStorage.getItem(WORKSHOP_LIBRARY_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .slice(0, 12)
      .flatMap((s) => {
        try {
          if (
            typeof s.id !== "string" ||
            !/^[\w-]{1,64}$/.test(s.id) ||
            typeof s.updated !== "string" ||
            !Number.isFinite(Date.parse(s.updated))
          )
            return [];
          return [{ id: s.id, updated: s.updated, doc: parseWorkshop(s.doc) }];
        } catch {
          return [];
        }
      })
      .filter((s, i, all) => all.findIndex((v) => v.id === s.id) === i);
  } catch {
    return [];
  }
}
export function saveWorkshopLibrary(saves: WorkshopSave[]) {
  if (saves.length > 12)
    throw Error(
      "La biblioteca admite 12 diseños. Borra uno o exporta el archivo.",
    );
  localStorage.setItem(
    WORKSHOP_LIBRARY_KEY,
    JSON.stringify(saves.map((s) => ({ ...s, doc: parseWorkshop(s.doc) }))),
  );
}
export function readWorkshopDraft(): WorkshopDocument | null {
  try {
    return parseWorkshop(
      JSON.parse(localStorage.getItem(WORKSHOP_DRAFT_KEY) || "null"),
    );
  } catch {
    return null;
  }
}
export function saveWorkshopDraft(doc: WorkshopDocument) {
  try {
    localStorage.setItem(
      WORKSHOP_DRAFT_KEY,
      JSON.stringify(parseWorkshop(doc)),
    );
    return true;
  } catch {
    return false;
  }
}
export type WorkshopHistory = {
  past: WorkshopDocument[];
  present: WorkshopDocument;
  future: WorkshopDocument[];
};
export function workshopEdit(
  h: WorkshopHistory,
  doc: WorkshopDocument,
): WorkshopHistory {
  const clean = parseWorkshop(doc);
  if (JSON.stringify(clean) === JSON.stringify(h.present)) return h;
  return {
    past: [...h.past.slice(-59), h.present],
    present: clean,
    future: [],
  };
}
export function workshopUndo(h: WorkshopHistory): WorkshopHistory {
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past.at(-1)!,
    future: [h.present, ...h.future],
  };
}
export function workshopRedo(h: WorkshopHistory): WorkshopHistory {
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  };
}
