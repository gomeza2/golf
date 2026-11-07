import { useMemo } from "react";
import { validateRoomWorkshop } from "../shared/roomWorkshop";
import type { WorkshopDocument } from "../shared/workshop";
import { CourseFootprint } from "./CourseFootprint";
export function CommunityPreview({ document }: { document: WorkshopDocument }) {
  const course = useMemo(() => {
    try {
      return validateRoomWorkshop(document).course;
    } catch {
      return null;
    }
  }, [document]);
  if (!course) return <p>Plano no disponible.</p>;
  return (
    <svg
      className="community-preview"
      viewBox="-13 -25 26 50"
      role="img"
      aria-label={`Plano de ${course.name}`}
    >
      <rect x="-13" y="-25" width="26" height="50" fill="#173d36" />
      {course.water?.map((z, i) => (
        <rect
          key={`w${i}`}
          x={z.x - z.width / 2}
          y={z.z - z.length / 2}
          width={z.width}
          height={z.length}
          fill="#438e9b"
        />
      ))}
      <CourseFootprint course={course} color="#83b58e" />
      {course.sand?.map((z, i) => (
        <rect
          key={`s${i}`}
          x={z.x - z.width / 2}
          y={z.z - z.length / 2}
          width={z.width}
          height={z.length}
          fill="#dac390"
        />
      ))}
      {course.blocks.map((b, i) => (
        <rect
          key={i}
          x={-b.size[0] / 2}
          y={-b.size[2] / 2}
          width={b.size[0]}
          height={b.size[2]}
          transform={`translate(${b.pos[0]} ${b.pos[2]}) rotate(${(-(b.yaw || 0) * 180) / Math.PI})`}
          fill={b.moving ? "#e9b85c" : "#ded3b4"}
        />
      ))}
      <circle cx={course.start.x} cy={course.start.z} r=".65" fill="#fff5cc" />
      <circle
        cx={course.cup.x}
        cy={course.cup.z}
        r=".7"
        fill="#18332f"
        stroke="#efcb77"
        strokeWidth=".25"
      />
    </svg>
  );
}
