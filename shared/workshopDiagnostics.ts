import { compileWorkshop, type WorkshopDocument } from "./workshop";
import { surfaceHeight, type Course } from "./courses";
export type WorkshopDiagnostic = {
  kind: "connection" | "surface" | "unused" | "clearance";
  message: string;
  pieces: string[];
};
export function workshopFloorHeights(
  course: Course,
  x: number,
  z: number,
): number[] {
  const heights: number[] = [];
  for (const b of course.terrain ?? []) {
    const y = surfaceHeight(b, x, z);
    if (y !== null && !heights.some((v) => Math.abs(v - y) < 0.01))
      heights.push(y);
  }
  const g = course.greenBounds!;
  if (
    x >= g.minX &&
    x <= g.maxX &&
    z >= g.minZ &&
    z <= g.maxZ &&
    !heights.some((v) => Math.abs(v - course.cup.y) < 0.01)
  )
    heights.push(course.cup.y);
  return heights.sort((a, b) => a - b);
}
export function workshopFloorHeight(course: Course, x: number, z: number) {
  return workshopFloorHeights(course, x, z).at(-1) ?? null;
}
/** Coarse floor connectivity, not a shot solution or a guarantee of playability. */
export function diagnoseWorkshop(doc: WorkshopDocument): WorkshopDiagnostic[] {
  const c = compileWorkshop(doc),
    result: WorkshopDiagnostic[] = [];
  for (const p of doc.pieces.filter(
    (p) => p.kind === "sand" || p.kind === "rough" || p.kind === "dirt",
  )) {
    const samples = [
      [0, 0],
      [-0.4, -0.4],
      [-0.4, 0.4],
      [0.4, -0.4],
      [0.4, 0.4],
    ];
    if (
      samples.some(([x, z]) => {
        const levels = workshopFloorHeights(
          c,
          p.x + x * p.width,
          p.z + z * p.length,
        );
        return !levels.some((y) => Math.abs(y - p.height) <= 0.18);
      })
    )
      result.push({
        kind: "surface",
        message: `${p.kind === "sand" ? "Arena" : p.kind === "dirt" ? "Tierra" : "Césped alto"}: parte de la zona no coincide con un suelo a su altura.`,
        pieces: [p.id],
      });
  }
  const step = 0.5,
    w = 49,
    h = 97;
  const cells: number[][] = Array.from({ length: w * h }, () => []),
    nodes: { cell: number; height: number }[] = [];
  for (let iz = 0; iz < h; iz++)
    for (let ix = 0; ix < w; ix++) {
      const cell = iz * w + ix;
      for (const height of workshopFloorHeights(
        c,
        -12 + ix * step,
        -24 + iz * step,
      )) {
        cells[cell].push(nodes.length);
        nodes.push({ cell, height });
      }
    }
  const nearest = (x: number, z: number, y: number) => {
    let best = -1,
      distance = Infinity;
    nodes.forEach((n, i) => {
      const d = Math.hypot(
        -12 + (n.cell % w) * step - x,
        -24 + Math.floor(n.cell / w) * step - z,
      );
      if (d < 0.8 && Math.abs(n.height - y) < 0.3 && d < distance) {
        best = i;
        distance = d;
      }
    });
    return best;
  };
  const start = nearest(doc.start.x, doc.start.z, c.start.y - 0.24),
    end = nearest(doc.cup.x, doc.cup.z, doc.cup.height),
    seen = new Uint8Array(nodes.length),
    queue: number[] = [];
  if (start >= 0) {
    queue.push(start);
    seen[start] = 1;
  }
  for (let q = 0; q < queue.length; q++) {
    const node = nodes[queue[q]],
      x = node.cell % w,
      z = Math.floor(node.cell / w);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz;
      if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
      for (const id of cells[nz * w + nx])
        if (!seen[id] && Math.abs(nodes[id].height - node.height) <= 0.29) {
          seen[id] = 1;
          queue.push(id);
        }
    }
  }
  if (start >= 0 && end >= 0 && !seen[end])
    result.push({
      kind: "connection",
      message:
        "No se detecta suelo continuo entre salida y copa en la cuadrícula de 0,5 m. Revisa uniones y alturas; los saltos deben probarse en 3D.",
      pieces: [],
    });
  if (start >= 0 && nodes.some((_, i) => !seen[i]))
    result.push({
      kind: "unused",
      message:
        "Hay zonas de suelo separadas de la salida. Pueden ser islas intencionales; comprueba cómo llegar.",
      pieces: [],
    });
  const lowClearance: string[] = [];
  for (const roof of doc.pieces.filter(
    (p) => p.kind === "floor" && p.height > 0.4,
  )) {
    const under = workshopFloorHeights(c, roof.x, roof.z).filter(
      (y) => y < roof.height - 0.01,
    );
    if (
      under.some(
        (y) => roof.height - 0.4 - y < 0.5 && roof.height - 0.4 - y > 0.01,
      )
    )
      lowClearance.push(roof.id);
  }
  if (lowClearance.length)
    result.push({
      kind: "clearance",
      message:
        "Una cubierta deja menos de 0,5 m de altura libre. La pelota mide 0,44 m; revisa el espacio y prueba el paso.",
      pieces: lowClearance,
    });
  const walls = doc.pieces.filter((p) => p.kind === "wall"),
    tight = new Set<string>();
  for (let i = 0; i < walls.length; i++)
    for (let j = i + 1; j < walls.length; j++) {
      const a = walls[i],
        b = walls[j];
      if (
        Math.abs(Math.sin(((a.angle - b.angle) * Math.PI) / 180)) > 0.01 ||
        a.length > a.width !== b.length > b.width ||
        Math.max(a.height, b.height) >= Math.min(a.height, b.height) + 0.9
      )
        continue;
      const theta = (a.angle * Math.PI) / 180,
        dx = Math.cos(theta) * (b.x - a.x) - Math.sin(theta) * (b.z - a.z),
        dz = Math.sin(theta) * (b.x - a.x) + Math.cos(theta) * (b.z - a.z);
      const longZ = a.length > a.width,
        gap = longZ
          ? Math.abs(dx) - (a.width + b.width) / 2
          : Math.abs(dz) - (a.length + b.length) / 2;
      const overlap = longZ
        ? (a.length + b.length) / 2 - Math.abs(dz)
        : (a.width + b.width) / 2 - Math.abs(dx);
      if (
        gap > 0.01 &&
        gap < 0.5 &&
        overlap > 1 &&
        workshopFloorHeights(c, (a.x + b.x) / 2, (a.z + b.z) / 2).some(
          (y) => Math.abs(y - Math.max(a.height, b.height)) < 0.2,
        )
      ) {
        tight.add(a.id);
        tight.add(b.id);
      }
    }
  if (tight.size)
    result.push({
      kind: "clearance",
      message:
        "Hay un paso de menos de 0,5 m entre paredes. Puede bloquear una pelota de 0,44 m; amplía la separación y prueba la salida.",
      pieces: [...tight],
    });
  return result;
}
