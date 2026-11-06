import { compileWorkshop, type WorkshopDocument } from "./workshop";
import { surfaceHeight, type Course } from "./courses";
export type WorkshopDiagnostic = {
  kind: "connection" | "surface" | "unused";
  message: string;
  pieces: string[];
};
export function workshopFloorHeight(course: Course, x: number, z: number) {
  let height: number | null = null;
  for (const b of course.terrain ?? []) {
    const y = surfaceHeight(b, x, z);
    if (y !== null && (height === null || y > height)) height = y;
  }
  const g = course.greenBounds!;
  if (x >= g.minX && x <= g.maxX && z >= g.minZ && z <= g.maxZ)
    height = Math.max(height ?? -Infinity, course.cup.y);
  return height;
}
/** Coarse floor connectivity, not a shot solution or a guarantee of playability. */
export function diagnoseWorkshop(doc: WorkshopDocument): WorkshopDiagnostic[] {
  const c = compileWorkshop(doc),
    result: WorkshopDiagnostic[] = [];
  for (const p of doc.pieces.filter(
    (p) => p.kind === "sand" || p.kind === "rough",
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
        const y = workshopFloorHeight(c, p.x + x * p.width, p.z + z * p.length);
        return y === null || Math.abs(y - p.height) > 0.18;
      })
    )
      result.push({
        kind: "surface",
        message: `${p.kind === "sand" ? "Arena" : "Césped alto"}: parte de la zona no coincide con un suelo a su altura.`,
        pieces: [p.id],
      });
  }
  const step = 0.5,
    w = 49,
    h = 97,
    grid = new Float32Array(w * h).fill(NaN);
  for (let iz = 0; iz < h; iz++)
    for (let ix = 0; ix < w; ix++) {
      const y = workshopFloorHeight(c, -12 + ix * step, -24 + iz * step);
      if (y !== null) grid[iz * w + ix] = y;
    }
  const nearest = (x: number, z: number) => {
    let best = -1,
      distance = Infinity;
    for (let i = 0; i < grid.length; i++) {
      if (!Number.isFinite(grid[i])) continue;
      const d = Math.hypot(
        -12 + (i % w) * step - x,
        -24 + Math.floor(i / w) * step - z,
      );
      if (d < distance) {
        distance = d;
        best = i;
      }
    }
    return distance <= 0.8 ? best : -1;
  };
  const start = nearest(doc.start.x, doc.start.z),
    end = nearest(doc.cup.x, doc.cup.z),
    seen = new Uint8Array(grid.length),
    queue: number[] = [];
  if (start >= 0) {
    queue.push(start);
    seen[start] = 1;
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q],
      x = i % w,
      z = Math.floor(i / w);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz;
      if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
      const n = nz * w + nx;
      if (
        !seen[n] &&
        Number.isFinite(grid[n]) &&
        Math.abs(grid[n] - grid[i]) <= 0.29
      ) {
        seen[n] = 1;
        queue.push(n);
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
  if (
    start >= 0 &&
    Array.from(grid).some((v, i) => Number.isFinite(v) && !seen[i])
  )
    result.push({
      kind: "unused",
      message:
        "Hay zonas de suelo separadas de la salida. Pueden ser islas intencionales; comprueba cómo llegar.",
      pieces: [],
    });
  return result;
}
