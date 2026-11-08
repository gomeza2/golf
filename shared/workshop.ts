import {
  deck,
  rampDeck,
  surfaceHeight,
  type Block,
  type Course,
} from "./courses";
import type { PhysicsEdition } from "./rules";
export const WORKSHOP_VERSION = 2;
export const MAX_WORKSHOP_BYTES = 60000;
export const pieceKinds = [
  "floor",
  "wall",
  "ramp",
  "sand",
  "rough",
  "water",
  "gate",
] as const;
export type PieceKind = (typeof pieceKinds)[number];
export type WorkshopPiece = {
  id: string;
  kind: PieceKind;
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  endHeight: number;
  angle: number;
};
export type WorkshopDocument = (
  { version: 1; physics?: never } | { version: 2; physics: 2 }
) & {
  name: string;
  par: number;
  start: { x: number; z: number };
  cup: { x: number; z: number; height: number };
  pieces: WorkshopPiece[];
};
const number = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const point = (v: any) => v && number(v.x, -11, 11) && number(v.z, -23, 23);
export function parseWorkshop(value: unknown): WorkshopDocument {
  const v = value as any;
  if (
    !v ||
    ![1, 2].includes(v.version) ||
    (v.version === 1 && v.physics !== undefined) ||
    (v.version === 2 && v.physics !== 2) ||
    typeof v.name !== "string" ||
    !v.name.trim() ||
    v.name.length > 48 ||
    !Number.isInteger(v.par) ||
    !number(v.par, 2, 8) ||
    !point(v.start) ||
    !point(v.cup) ||
    !number(v.cup.height, 0, 4) ||
    !Array.isArray(v.pieces) ||
    v.pieces.length > 80
  )
    throw Error(
      "Diseño inválido: formato, nombre, salida, copa o límite de 80 piezas.",
    );
  const ids = new Set<string>();
  const pieces = v.pieces.map((p: any): WorkshopPiece => {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^[\w-]{1,64}$/.test(p.id) ||
      ids.has(p.id) ||
      p.id === "start" ||
      p.id === "cup" ||
      !pieceKinds.includes(p.kind) ||
      !point(p) ||
      !number(p.width, 0.5, 22) ||
      !number(p.length, 0.5, 44) ||
      !number(p.height, 0, 4) ||
      !number(p.endHeight, 0, 4) ||
      !number(p.angle, -180, 180)
    )
      throw Error("Hay una pieza inválida o un identificador repetido.");
    if (
      (p.kind === "floor" && p.angle % 90 !== 0) ||
      (["water", "sand", "rough"].includes(p.kind) && p.angle !== 0)
    )
      throw Error("Las plataformas giran de 90° en 90° y las zonas no giran.");
    ids.add(p.id);
    return {
      id: p.id,
      kind: p.kind,
      x: p.x,
      z: p.z,
      width: p.width,
      length: p.length,
      height: p.height,
      endHeight: p.endHeight,
      angle: p.angle,
    };
  });
  return {
    ...(v.version === 2
      ? { version: 2 as const, physics: 2 as const }
      : { version: 1 as const }),
    name: v.name.trim(),
    par: v.par,
    start: { x: v.start.x, z: v.start.z },
    cup: { x: v.cup.x, z: v.cup.z, height: v.cup.height },
    pieces,
  };
}
export function importWorkshop(text: string) {
  if (new TextEncoder().encode(text).length > MAX_WORKSHOP_BYTES)
    throw Error("El archivo supera 60 KB.");
  try {
    return parseWorkshop(JSON.parse(text));
  } catch (e) {
    if (e instanceof SyntaxError) throw Error("No es un archivo JSON válido.");
    throw e;
  }
}
export const exportWorkshop = (doc: WorkshopDocument) =>
  JSON.stringify(parseWorkshop(doc), null, 2);
export const workshopPhysics = (doc: WorkshopDocument): PhysicsEdition =>
  doc.version === 2 ? 2 : 1;
export const workshopPhysicsLabel = (physics: PhysicsEdition) =>
  physics === 2 ? "Física actual" : "Física original";
/** Explicit, reversible conversion. Original canonical bytes remain unchanged. */
export function withWorkshopPhysics(
  input: WorkshopDocument,
  physics: PhysicsEdition,
): WorkshopDocument {
  const {
    version: _version,
    physics: _physics,
    ...fields
  } = parseWorkshop(input);
  if (physics !== 1 && physics !== 2) throw Error("Física de cancha inválida.");
  return parseWorkshop(
    physics === 2
      ? { version: 2, physics: 2, ...fields }
      : { version: 1, ...fields },
  );
}
export function newWorkshop(): WorkshopDocument {
  return {
    version: 1,
    name: "Mi primer desafío",
    par: 3,
    start: { x: 0, z: 9 },
    cup: { x: 0, z: -9, height: 0 },
    pieces: [
      {
        id: "base",
        kind: "floor",
        x: 0,
        z: 0,
        width: 8,
        length: 24,
        height: 0,
        endHeight: 0,
        angle: 0,
      },
    ],
  };
}
function rectangle(p: WorkshopPiece) {
  // Platforms rotate in quarter turns; barriers and ramps allow continuous angles.
  const swap = Math.abs(Math.round(p.angle / 90)) % 2 === 1;
  return {
    x: p.x,
    z: p.z,
    w: swap ? p.length : p.width,
    l: swap ? p.width : p.length,
  };
}
export function compileWorkshop(input: WorkshopDocument): Course {
  const d = parseWorkshop(input),
    green = {
      minX: d.cup.x - 2,
      maxX: d.cup.x + 2,
      minZ: d.cup.z - 2,
      maxZ: d.cup.z + 2,
    };
  const terrain: Block[] = [],
    blocks: Block[] = [];
  const c: Course = {
    name: d.name,
    subtitle: "Prueba del taller · Sin récords oficiales",
    par: d.par,
    dimensions: { width: 24, length: 48 },
    outerWalls: false,
    start: { ...d.start, y: 0.24 },
    cup: { x: d.cup.x, z: d.cup.z, y: d.cup.height },
    greenBounds: green,
    terrain,
    blocks,
    water: [],
    sand: [],
    rough: [],
  };
  for (const p of d.pieces) {
    const a = (p.angle * Math.PI) / 180;
    if (p.kind === "floor") {
      const r = rectangle(p),
        x0 = r.x - r.w / 2,
        x1 = r.x + r.w / 2,
        z0 = r.z - r.l / 2,
        z1 = r.z + r.l / 2;
      const add = (l: number, r: number, b: number, t: number) => {
        if (r - l > 0.01 && t - b > 0.01)
          terrain.push(deck((l + r) / 2, (b + t) / 2, r - l, t - b, p.height));
      };
      if (
        Math.abs(p.height - d.cup.height) < 0.01 &&
        x1 > green.minX &&
        x0 < green.maxX &&
        z1 > green.minZ &&
        z0 < green.maxZ
      ) {
        add(x0, x1, z0, Math.min(z1, green.minZ));
        add(x0, x1, Math.max(z0, green.maxZ), z1);
        add(
          x0,
          Math.min(x1, green.minX),
          Math.max(z0, green.minZ),
          Math.min(z1, green.maxZ),
        );
        add(
          Math.max(x0, green.maxX),
          x1,
          Math.max(z0, green.minZ),
          Math.min(z1, green.maxZ),
        );
      } else add(x0, x1, z0, z1);
    } else if (p.kind === "ramp") {
      const b = rampDeck(
        0,
        p.width,
        p.length / 2,
        -p.length / 2,
        p.height,
        p.endHeight,
      );
      terrain.push({
        ...b,
        pos: [
          p.x + Math.sin(a) * b.pos[2],
          b.pos[1],
          p.z + Math.cos(a) * b.pos[2],
        ],
        yaw: a,
      });
    } else if (p.kind === "wall" || p.kind === "gate") {
      blocks.push({
        pos: [p.x, p.height + 0.45, p.z],
        size: [p.width, 0.9, p.length],
        yaw: a,
        bevel: 0.06,
        ...(p.kind === "gate"
          ? { moving: true, motion: "slide" as const }
          : {}),
      });
    } else {
      c[
        p.kind === "water" ? "water" : p.kind === "sand" ? "sand" : "rough"
      ]!.push({
        x: p.x,
        z: p.z,
        width: p.width,
        length: p.length,
        y: p.kind === "water" ? -1.4 : p.height,
      });
    }
  }
  const heights = terrain
    .map((b) => surfaceHeight(b, d.start.x, d.start.z))
    .filter(
      (v): v is number => v !== null && v !== undefined && Number.isFinite(v),
    );
  if (
    d.start.x > green.minX &&
    d.start.x < green.maxX &&
    d.start.z > green.minZ &&
    d.start.z < green.maxZ
  )
    heights.push(d.cup.height);
  c.start.y = (heights.length ? Math.max(...heights) : 0) + 0.24;
  return c;
}
export function workshopIssues(doc: WorkshopDocument): string[] {
  const d = parseWorkshop(doc),
    c = compileWorkshop(d),
    issues: string[] = [];
  if (Math.hypot(d.cup.x - d.start.x, d.cup.z - d.start.z) < 2)
    issues.push("Separa la salida de la copa al menos 2 m.");
  if (Math.abs(d.cup.x) > 9 || Math.abs(d.cup.z) > 21)
    issues.push("La plataforma de la copa debe quedar dentro del mapa.");
  const green = c.greenBounds!;
  if (
    !c.terrain!.some((b) => surfaceHeight(b, d.start.x, d.start.z) !== null) &&
    !(
      d.start.x > green.minX &&
      d.start.x < green.maxX &&
      d.start.z > green.minZ &&
      d.start.z < green.maxZ
    )
  )
    issues.push("La salida necesita una plataforma o rampa debajo.");
  for (const p of d.pieces) {
    const a =
      ((p.kind === "floor" ? Math.round(p.angle / 90) * 90 : p.angle) *
        Math.PI) /
      180;
    const w =
      p.kind === "sand" || p.kind === "rough" || p.kind === "water"
        ? p.width
        : Math.abs(Math.cos(a) * p.width) + Math.abs(Math.sin(a) * p.length);
    const l =
      p.kind === "sand" || p.kind === "rough" || p.kind === "water"
        ? p.length
        : Math.abs(Math.sin(a) * p.width) + Math.abs(Math.cos(a) * p.length);
    if (Math.abs(p.x) + w / 2 > 12.01 || Math.abs(p.z) + l / 2 > 24.01)
      issues.push("Hay piezas que salen de los límites del mapa.");
    if (p.kind === "ramp" && Math.abs(p.height - p.endHeight) / p.length > 0.5)
      issues.push("La rampa supera la pendiente máxima de 1:2.");
    if (
      (p.kind === "ramp" ||
        p.kind === "wall" ||
        p.kind === "gate" ||
        (p.kind === "floor" && Math.abs(p.height - d.cup.height) > 0.01)) &&
      Math.abs(p.x - d.cup.x) < w / 2 + 2 &&
      Math.abs(p.z - d.cup.z) < l / 2 + 2
    )
      issues.push("Deja libre la plataforma de 4 × 4 m de la copa.");
    if (p.kind === "wall" || p.kind === "gate") {
      const dx = d.start.x - p.x,
        dz = d.start.z - p.z;
      if (
        Math.abs(Math.cos(a) * dx - Math.sin(a) * dz) < p.width / 2 + 0.24 &&
        Math.abs(Math.sin(a) * dx + Math.cos(a) * dz) < p.length / 2 + 0.24 &&
        Math.abs(c.start.y - p.height) < 1.1
      )
        issues.push("La salida está dentro de una barrera.");
    }
  }
  return [...new Set(issues)];
}
