import { insertStructure } from "./workshopStructures";
import {
  newWorkshop,
  withWorkshopResources,
  parseWorkshop,
  type WorkshopDocument,
  type WorkshopPiece,
} from "./workshop";
export const workshopBlueprints = [
  {
    id: "clock",
    name: "El pulso del puente",
    description:
      "Un rodeo ancho o una línea sobre agua junto a una barra que gira por completo. Un as es posible, pero exige dirección, fuerza y tiempo.",
  },
  {
    id: "lock",
    name: "La esclusa de tierra",
    description:
      "Espera la puerta del camino ancho o sube al puente estrecho. La tierra frena de verdad: la altura también cambia tu estrategia.",
  },
  {
    id: "laboratory",
    name: "Laboratorio en altura",
    description:
      "Un diseño de construcción completo: curva por tramos, rampa, pasarela, túnel de dos niveles, tierra y puerta. Edítalo y prueba sus rutas reales.",
  },
] as const;
export type WorkshopBlueprintId = (typeof workshopBlueprints)[number]["id"];
export function workshopBlueprint(id: WorkshopBlueprintId): WorkshopDocument {
  if (id === "laboratory") {
    let n = 0;
    let doc = workshopBlueprint("lock");
    doc.name = "Laboratorio en altura";
    doc = insertStructure(doc, "tunnel", 6, 0, 2, () => `tunnel-${++n}`).doc;
    doc = insertStructure(doc, "curve", -3, 8, 0, () => `curve-${++n}`).doc;
    doc.pieces.push(
      {
        id: "curve-entry",
        kind: "floor",
        x: 1,
        z: 10,
        width: 3,
        length: 4,
        height: 0,
        endHeight: 0,
        angle: 0,
      },
      {
        id: "curve-exit",
        kind: "ramp",
        x: -5,
        z: 5,
        width: 2.5,
        length: Math.sqrt(20) + 0.04,
        height: 1.2,
        endHeight: 0,
        angle: (Math.atan2(4, -2) * 180) / Math.PI,
      },
    );
    return parseWorkshop(doc);
  }
  const piece = (
    id: string,
    kind: WorkshopPiece["kind"],
    x: number,
    z: number,
    width: number,
    length: number,
    height = 0,
    endHeight = 0,
  ): WorkshopPiece => ({
    id,
    kind,
    x,
    z,
    width,
    length,
    height,
    endHeight,
    angle: 0,
  });
  const doc = withWorkshopResources(newWorkshop());
  doc.pieces = [];
  if (id === "clock") {
    doc.name = "El pulso del puente";
    doc.par = 5;
    doc.start = { x: 0, z: 14 };
    doc.cup = { x: 0, z: -16, height: 0 };
    doc.pieces = [
      piece("tee", "floor", 0, 14, 18, 8),
      piece("safe", "floor", -7, 0, 4, 28),
      piece("back", "floor", 0, -14, 18, 4),
      piece("bridge", "floor", 0, 0, 3.4, 24),
      piece("clock", "rotor", 1.2, 0, 6, 0.6),
      piece("water", "water", 0, 0, 22, 44),
    ];
  } else if (id === "lock") {
    doc.name = "La esclusa de tierra";
    doc.par = 5;
    doc.start = { x: 0, z: 18 };
    doc.cup = { x: 6, z: -16, height: 2 };
    doc.pieces = [
      piece("tee", "floor", 0, 16, 20, 8),
      piece("safe", "floor", -7, 12, 4, 12),
      piece("safe-up", "ramp", -7, -4, 4, 20, 0, 2),
      piece("back", "floor", 0, -16, 18, 4, 2),
      piece("lock", "lift", -7, 10, 4, 0.6),
      piece("up", "ramp", 6, 10, 3, 12, 0, 2),
      piece("viaduct", "floor", 6, 0, 3, 8, 2),
      piece("landing", "floor", 6, -9, 3, 10, 2),
      piece("soil", "dirt", 6, 0, 3, 6, 2),
      piece("water", "water", 0, 0, 22, 44),
    ];
  } else throw Error("Plantilla inexistente.");
  return parseWorkshop(doc);
}
