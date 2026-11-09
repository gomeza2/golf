import {
  parseWorkshop,
  type WorkshopDocument,
  type WorkshopPiece,
} from "./workshop";
export const structures = [
  {
    id: "platform",
    name: "Plataforma elevada",
    detail: "Plataforma de 6 × 6 m, a 2 m del suelo.",
  },
  {
    id: "bridge",
    name: "Puente con bandas",
    detail: "Paso elevado de 3 × 8 m y dos bandas físicas.",
  },
  {
    id: "tunnel",
    name: "Túnel transitable",
    detail: "Suelo, paredes y cubierta real. 1,6 m de altura libre.",
  },
  {
    id: "curve",
    name: "Rampa curva",
    detail:
      "Un cuarto de giro en ocho tramos conectados, con 1,2 m de ascenso.",
  },
  {
    id: "narrow",
    name: "Pasarela estrecha",
    detail: "Un paso elevado de 1,4 × 10 m sin bandas.",
  },
] as const;
export type StructureId = (typeof structures)[number]["id"];
export function insertStructure(
  doc: WorkshopDocument,
  kind: StructureId,
  x: number,
  z: number,
  height = 0,
  makeId: () => string = () => crypto.randomUUID(),
) {
  const pieces: WorkshopPiece[] = [];
  const part = (
    kind: WorkshopPiece["kind"],
    dx: number,
    dz: number,
    width: number,
    length: number,
    h: number,
    endHeight = h,
    angle = 0,
  ) =>
    pieces.push({
      id: makeId(),
      kind,
      x: x + dx,
      z: z + dz,
      width,
      length,
      height: height + h,
      endHeight: height + endHeight,
      angle,
    });
  if (kind === "platform") part("floor", 0, 0, 6, 6, 2);
  else if (kind === "narrow") part("floor", 0, 0, 1.4, 10, 2);
  else if (kind === "bridge") {
    part("floor", 0, 0, 3, 8, 2);
    for (const side of [-1, 1]) part("wall", side * 1.75, 0, 0.5, 8, 2);
  } else if (kind === "tunnel") {
    part("floor", 0, 0, 3, 6, 0);
    for (const side of [-1, 1])
      for (const layer of [0, 0.9]) part("wall", side * 1.75, 0, 0.5, 6, layer);
    part("floor", 0, 0, 4, 6, 2);
  } else if (kind === "curve") {
    const radius = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 16,
        b = ((i + 1) * Math.PI) / 16;
      const p = { x: radius * Math.cos(a), z: -radius * Math.sin(a) },
        q = { x: radius * Math.cos(b), z: -radius * Math.sin(b) };
      part(
        "ramp",
        (p.x + q.x) / 2,
        (p.z + q.z) / 2,
        2.5,
        Math.hypot(q.x - p.x, q.z - p.z) + 0.04,
        i * 0.15,
        (i + 1) * 0.15,
        (Math.atan2(p.x - q.x, p.z - q.z) * 180) / Math.PI,
      );
    }
  } else throw Error("Estructura desconocida.");
  return {
    doc: parseWorkshop({ ...doc, pieces: [...doc.pieces, ...pieces] }),
    ids: pieces.map((p) => p.id),
  };
}
