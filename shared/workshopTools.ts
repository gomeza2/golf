import { parseWorkshop, type WorkshopDocument } from "./workshop";
export type SelectionAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "rotate"
  | "alignX"
  | "alignZ"
  | "alignHeight"
  | "duplicate"
  | "delete";
export function moveWorkshopPieces(
  doc: WorkshopDocument,
  ids: string[],
  dx: number,
  dz: number,
) {
  if (!Number.isFinite(dx) || !Number.isFinite(dz))
    throw Error("Movimiento inválido.");
  return parseWorkshop({
    ...doc,
    pieces: doc.pieces.map((p) =>
      ids.includes(p.id)
        ? {
            ...p,
            x: Math.round((p.x + dx) * 1e6) / 1e6,
            z: Math.round((p.z + dz) * 1e6) / 1e6,
          }
        : p,
    ),
  });
}
export function transformWorkshopSelection(
  doc: WorkshopDocument,
  ids: string[],
  action: SelectionAction,
  step = 0.5,
  makeId: () => string = () => crypto.randomUUID(),
) {
  const pieces = doc.pieces.filter((p) => ids.includes(p.id));
  if (!pieces.length) return { doc, ids: [] };
  if (!Number.isFinite(step) || step <= 0 || step > 1)
    throw Error("El paso debe estar entre 0 y 1 m.");
  if (action === "alignHeight" && pieces.some((p) => p.kind === "water"))
    throw Error(
      "El agua tiene una cota fija. Alinea alturas sin incluir el agua.",
    );
  if (["left", "right", "up", "down"].includes(action))
    return {
      doc: moveWorkshopPieces(
        doc,
        ids,
        action === "left" ? -step : action === "right" ? step : 0,
        action === "up" ? -step : action === "down" ? step : 0,
      ),
      ids,
    };
  if (action === "delete")
    return {
      doc: parseWorkshop({
        ...doc,
        pieces: doc.pieces.filter((p) => !ids.includes(p.id)),
      }),
      ids: [],
    };
  if (action === "duplicate") {
    if (doc.pieces.length + pieces.length > 80)
      throw Error("La copia supera el máximo de 80 piezas.");
    const copies = pieces.map((p) => ({
      ...p,
      id: makeId(),
      x: p.x + step,
      z: p.z + step,
    }));
    return {
      doc: parseWorkshop({ ...doc, pieces: [...doc.pieces, ...copies] }),
      ids: copies.map((p) => p.id),
    };
  }
  const cx =
      (Math.min(...pieces.map((p) => p.x)) +
        Math.max(...pieces.map((p) => p.x))) /
      2,
    cz =
      (Math.min(...pieces.map((p) => p.z)) +
        Math.max(...pieces.map((p) => p.z))) /
      2;
  const angle = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
  return {
    doc: parseWorkshop({
      ...doc,
      pieces: doc.pieces.map((p) => {
        if (!ids.includes(p.id)) return p;
        if (action === "alignX") return { ...p, x: cx };
        if (action === "alignZ") return { ...p, z: cz };
        if (action === "alignHeight")
          return {
            ...p,
            height: pieces[0].height,
            ...(p.kind === "ramp"
              ? {
                  endHeight:
                    Math.round(
                      (p.endHeight + pieces[0].height - p.height) * 1e6,
                    ) / 1e6,
                }
              : {}),
          };
        const zone = ["water", "sand", "rough", "dirt"].includes(p.kind);
        return {
          ...p,
          x: cx + (p.z - cz),
          z: cz - (p.x - cx),
          ...(zone
            ? { width: p.length, length: p.width }
            : { angle: angle(p.angle + 90) }),
        };
      }),
    }),
    ids,
  };
}
