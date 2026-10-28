import { getCourse, blockPose, colors } from "../shared/courses";
import type { State } from "../shared/game";
export function HoleMap({ s }: { s: State }) {
  const course = getCourse(s);
  return (
    <aside className="hole-map">
      <div className="eyebrow">TU LÍNEA, DESDE ARRIBA</div>
      <svg
        viewBox="-7 -13 14 26"
        role="img"
        aria-label={`Mapa de ${course.name}`}
      >
        <rect
          x={-6.2}
          y={-12.2}
          width={12.4}
          height={24.4}
          rx={0.3}
          fill="#205b4b"
          stroke="#c4d4be"
          strokeWidth={0.25}
        />
        {course.blocks.map((b, i) => {
          const pose = blockPose(b, s.time);
          return (
            <rect
              key={i}
              x={-b.size[0] / 2}
              y={-b.size[2] / 2}
              width={b.size[0]}
              height={b.size[2]}
              transform={`translate(${pose.pos[0]} ${pose.pos[2]}) rotate(${(-pose.yaw * 180) / Math.PI})`}
              fill={b.moving ? "#f5cc77" : "#c4d4be"}
            />
          );
        })}
        <circle
          cx={course.cup.x}
          cy={course.cup.z}
          r={0.55}
          fill="#0a2422"
          stroke="#f5cc77"
          strokeWidth={0.2}
        />
        {s.players.map(
          (p, i) =>
            !p.withdrawn && (
              <circle
                key={p.id}
                cx={p.pos.x}
                cy={p.pos.z}
                r={i === s.turn ? 0.38 : 0.23}
                fill={colors[i]}
                stroke={i === s.turn ? "#fff" : "none"}
                strokeWidth={0.12}
                opacity={i === s.turn ? 1 : 0.55}
              />
            ),
        )}
      </svg>
      <small>La pelota con borde blanco tiene el turno.</small>
    </aside>
  );
}
