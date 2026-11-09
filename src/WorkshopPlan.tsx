import { useMemo, type PointerEventHandler } from "react";
import { compileWorkshop, type WorkshopDocument } from "../shared/workshop";
import { colors } from "./workshopLabels";
import { CourseFootprint } from "./CourseFootprint";
export function WorkshopPlan({
  doc,
  selection,
  selected,
  pointerDown,
  pointerMove,
  pointerUp,
  pointerCancel,
}: {
  doc: WorkshopDocument;
  selection: string[];
  selected: string | null;
  pointerDown: PointerEventHandler<SVGSVGElement>;
  pointerMove: PointerEventHandler<SVGSVGElement>;
  pointerUp: PointerEventHandler<SVGSVGElement>;
  pointerCancel: PointerEventHandler<SVGSVGElement>;
}) {
  const course = useMemo(() => compileWorkshop(doc), [doc]);
  return (
    <svg
      aria-label="Plano editable de la cancha"
      role="img"
      viewBox="-12 -24 24 48"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerCancel}
      onLostPointerCapture={pointerCancel}
    >
      <defs>
        <pattern
          id="workshop-grid"
          width="1"
          height="1"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 1 0 L 0 0 0 1"
            fill="none"
            stroke="#aac2bd"
            strokeOpacity="0.14"
            strokeWidth="0.025"
          />
        </pattern>
      </defs>
      <rect x="-12" y="-24" width="24" height="48" fill="#173f46" />
      {doc.pieces
        .filter((p) => p.kind === "water")
        .map((p) => (
          <rect
            key={p.id}
            x={p.x - p.width / 2}
            y={p.z - p.length / 2}
            width={p.width}
            height={p.length}
            fill={colors.water}
          />
        ))}
      <CourseFootprint course={course} color="#58896c" />
      {doc.pieces.map((p) => (
        <g
          key={p.id}
          data-piece={p.id}
          transform={`translate(${p.x} ${p.z}) rotate(${-(p.kind === "floor" ? Math.round(p.angle / 90) * 90 : p.kind === "water" || p.kind === "sand" || p.kind === "rough" || p.kind === "dirt" ? 0 : p.angle)})`}
        >
          <rect
            x={-p.width / 2}
            y={-p.length / 2}
            width={p.width}
            height={p.length}
            fill={
              p.kind === "floor" || p.kind === "ramp"
                ? "transparent"
                : colors[p.kind]
            }
            fillOpacity={0.8}
            stroke={selection.includes(p.id) ? "#ffe19a" : "#b4c6a5"}
            strokeOpacity={selection.includes(p.id) ? 1 : 0.5}
            strokeWidth={selection.includes(p.id) ? 0.14 : 0.035}
          />
          {p.kind === "rotor" && (
            <circle
              r={Math.hypot(p.width, p.length) / 2}
              fill="none"
              stroke="#efcd87"
              strokeDasharray=".3 .25"
              strokeWidth=".06"
              pointerEvents="none"
            />
          )}
          {p.kind === "lift" && (
            <path
              d="M0 1.1V-1.1M-.4-.6L0-1.1L.4-.6"
              stroke="#e3f0d1"
              strokeWidth=".12"
              fill="none"
              pointerEvents="none"
            />
          )}
          {p.kind === "ramp" && (
            <path
              d={`M0 ${p.length / 3}L0 ${-p.length / 3}M-0.4 ${-p.length / 3 + 0.5}L0 ${-p.length / 3}L0.4 ${-p.length / 3 + 0.5}`}
              fill="none"
              stroke="#fae0a2"
              strokeWidth="0.12"
            />
          )}
        </g>
      ))}
      <rect
        x="-12"
        y="-24"
        width="24"
        height="48"
        fill="url(#workshop-grid)"
        pointerEvents="none"
      />
      <circle
        data-piece="start"
        cx={doc.start.x}
        cy={doc.start.z}
        r="0.45"
        fill="#ffe19a"
        stroke={selected === "start" ? "white" : "#244743"}
        strokeWidth="0.12"
      />
      <text
        x={doc.start.x + 0.7}
        y={doc.start.z + 0.2}
        fontSize="0.65"
        fill="white"
        pointerEvents="none"
      >
        SALIDA
      </text>
      <g data-piece="cup">
        <circle
          cx={doc.cup.x}
          cy={doc.cup.z}
          r="0.5"
          fill="#c0cacb"
          stroke={selected === "cup" ? "#ffe19a" : "#fff"}
          strokeWidth="0.12"
        />
        <path
          d={`M${doc.cup.x} ${doc.cup.z}v-1.6h1v0.7h-1`}
          stroke="white"
          strokeWidth="0.12"
          fill="#f3ca79"
        />
      </g>
    </svg>
  );
}
