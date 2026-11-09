import {
  parseWorkshop,
  WORKSHOP_WATER_LEVEL,
  type WorkshopDocument,
} from "./workshop";
export type EditorTransform = {
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  scaleX?: number;
  scaleZ?: number;
};
export function selectionPivot(doc: WorkshopDocument, ids: string[]) {
  const pieces = doc.pieces.filter((p) => ids.includes(p.id));
  if (!pieces.length) return { x: 0, y: 0, z: 0 };
  return {
    x:
      (Math.min(...pieces.map((p) => p.x)) +
        Math.max(...pieces.map((p) => p.x))) /
      2,
    y: Math.min(
      ...pieces.map((p) =>
        p.kind === "water" ? WORKSHOP_WATER_LEVEL : p.height,
      ),
    ),
    z:
      (Math.min(...pieces.map((p) => p.z)) +
        Math.max(...pieces.map((p) => p.z))) /
      2,
  };
}
/** One rigid, reversible operation. Invalid transforms reject the whole selection. */
export function transformWorkshop3D(
  doc: WorkshopDocument,
  ids: string[],
  transform: EditorTransform,
  step: number,
) {
  if (
    !Number.isFinite(step) ||
    step < 0.1 ||
    step > 1 ||
    Object.values(transform).some((n) => !Number.isFinite(n))
  )
    throw Error("Transformación inválida.");
  const pivot = selectionPivot(doc, ids),
    snap = (n: number) => Math.round(Math.round(n / step) * step * 1e6) / 1e6;
  const x = snap(transform.x ?? 0),
    y = snap(transform.y ?? 0),
    z = snap(transform.z ?? 0);
  if (
    y !== 0 &&
    doc.pieces.some((p) => ids.includes(p.id) && p.kind === "water")
  )
    throw Error(
      "El agua tiene una cota fija. Selecciona solo el suelo para cambiar alturas.",
    );
  const quarterTurn = doc.pieces.some(
    (p) =>
      ids.includes(p.id) &&
      ["floor", "water", "sand", "rough", "dirt"].includes(p.kind),
  );
  const yaw =
      Math.round((transform.yaw ?? 0) / (quarterTurn ? 90 : 5)) *
      (quarterTurn ? 90 : 5),
    a = (yaw * Math.PI) / 180;
  const sx = transform.scaleX ?? 1,
    sz = transform.scaleZ ?? 1;
  if (sx <= 0 || sz <= 0 || sx > 10 || sz > 10)
    throw Error("Escala fuera de límites.");
  if (
    Math.abs(sx - sz) > 1e-6 &&
    doc.pieces.some((p) => ids.includes(p.id) && Math.abs(p.angle % 90) > 1e-6)
  )
    throw Error(
      "En piezas oblicuas, escala ambos ejes por igual o usa Ancho/Largo.",
    );
  const angle = (n: number) => ((((n + 180) % 360) + 360) % 360) - 180;
  return parseWorkshop({
    ...doc,
    pieces: doc.pieces.map((p) => {
      if (!ids.includes(p.id)) return p;
      const px = (p.x - pivot.x) * sx,
        pz = (p.z - pivot.z) * sz;
      const zone = ["water", "sand", "rough", "dirt"].includes(p.kind),
        swap = zone && Math.abs(yaw % 180) === 90;
      const quarter = Math.abs(Math.round(p.angle / 90)) % 2 === 1;
      const wx = quarter ? sz : sx,
        lz = quarter ? sx : sz;
      const width =
          Math.abs(wx - 1) < 1e-8 ? p.width : Math.max(0.5, snap(p.width * wx)),
        length =
          Math.abs(lz - 1) < 1e-8
            ? p.length
            : Math.max(0.5, snap(p.length * lz));
      return {
        ...p,
        x:
          Math.round(
            (pivot.x + px * Math.cos(a) + pz * Math.sin(a) + x) * 1e6,
          ) / 1e6 || 0,
        z:
          Math.round(
            (pivot.z - px * Math.sin(a) + pz * Math.cos(a) + z) * 1e6,
          ) / 1e6 || 0,
        height:
          p.kind === "water"
            ? p.height
            : Math.round((p.height + y) * 1e6) / 1e6,
        endHeight:
          p.kind === "ramp"
            ? Math.round((p.endHeight + y) * 1e6) / 1e6
            : p.endHeight,
        width: swap ? length : width,
        length: swap ? width : length,
        angle: zone ? 0 : angle(p.angle + yaw),
      };
    }),
  });
}
