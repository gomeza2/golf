import { useMemo } from "react";
import {
  geometry,
  greenArea,
  type Course,
  type FloorMesh,
} from "../shared/courses";
export function topSurfacePath(mesh: FloorMesh) {
  const path: string[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const ids = mesh.indices.slice(i, i + 3).map((n) => n * 3),
      [a, b, c] = ids.map((n) => [mesh.vertices[n], mesh.vertices[n + 2]]);
    if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) > 1e-9)
      path.push(`M${a[0]},${a[1]}L${b[0]},${b[1]}L${c[0]},${c[1]}Z`);
  }
  return path.join("");
}
/** Same slabs/meshes as Rapier, projected into map coordinates. */
export function CourseFootprint({
  course,
  color,
}: {
  course: Course;
  color: string;
}) {
  const shape = useMemo(() => geometry(course), [course]);
  const paths = useMemo(() => shape.meshes.map(topSurfacePath), [shape]);
  const green = greenArea(course);
  return (
    <g>
      {shape.surfaces.map((b, i) => (
        <rect
          key={i}
          x={-b.size[0] / 2}
          y={(-b.size[2] * Math.cos(b.rotation || 0)) / 2}
          width={b.size[0]}
          height={b.size[2] * Math.cos(b.rotation || 0)}
          transform={`translate(${b.pos[0]} ${b.pos[2]}) rotate(${(-(b.yaw || 0) * 180) / Math.PI})`}
          fill={b.color || color}
        />
      ))}
      {shape.meshes.map((mesh, i) => (
        <path key={`m${i}`} d={paths[i]} fill={mesh.color || color} />
      ))}
      <rect
        x={green.minX}
        y={green.minZ}
        width={green.maxX - green.minX}
        height={green.maxZ - green.minZ}
        fill={color}
      />
    </g>
  );
}
