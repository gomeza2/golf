import { geometry, cupWalls, cupGreen } from "./courses";
import {
  compileWorkshop,
  parseWorkshop,
  workshopIssues,
  MAX_WORKSHOP_BYTES,
  workshopPhysics,
} from "./workshop";

/** A room fixes one normalized document. Validation is not a playability certificate. */
export function validateRoomWorkshop(value: unknown) {
  if (
    new TextEncoder().encode(JSON.stringify(value)).length > MAX_WORKSHOP_BYTES
  )
    throw Error("La cancha supera 60 KB.");
  const document = parseWorkshop(value);
  const issues = workshopIssues(document);
  if (issues.length) throw Error(issues[0]);
  const course = compileWorkshop(document);
  course.subtitle = "Cancha privada del taller · Sin récords oficiales";
  const shape = geometry(course);
  const colliders =
    shape.surfaces.length +
    shape.walls.length +
    course.blocks.length +
    cupWalls(course).length +
    shape.meshes.length +
    1;
  const triangles =
    cupGreen(course).indices.length / 3 +
    shape.meshes.reduce((n, m) => n + m.indices.length / 3, 0);
  const mechanisms = course.blocks.filter((b) => b.moving).length;
  if (colliders > 220 || triangles > 2048 || mechanisms > 8)
    throw Error(
      "La cancha excede el presupuesto online: 220 colisiones, 2048 triángulos u 8 mecanismos.",
    );
  return {
    document,
    physics: workshopPhysics(document),
    course,
    canonical: JSON.stringify(document),
    cost: { colliders, triangles, mechanisms },
  };
}

export async function workshopFingerprint(canonical: string) {
  if (!globalThis.crypto?.subtle)
    throw Error("La verificación de canchas necesita HTTPS o localhost.");
  const bytes = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(bytes), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
