import { wrapAngle } from "../shared/shot";
import type { ControlMode, ShotReview } from "./shotControls";
export function ShotControlFeedback({
  mode,
  active,
  armed,
  power,
  angle,
  referencePower,
  referenceAngle,
  review,
}: {
  mode: ControlMode;
  active: boolean;
  armed: boolean;
  power: number;
  angle: number;
  referencePower: number;
  referenceAngle: number;
  review: ShotReview | null;
}) {
  if (mode === "classic" || (!active && !review)) return null;
  const reading = active
    ? { power, referencePower, angleError: wrapAngle(angle - referenceAngle) }
    : review!;
  const degrees = (reading.angleError * 180) / Math.PI;
  const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}°`;
  const inWindow =
    mode === "pulse" &&
    Math.abs(degrees) <= 1 &&
    Math.abs(reading.power - reading.referencePower) <= 0.025;
  return (
    <div
      className={`control-feedback ${inWindow && active ? "control-in-window" : ""}`}
      data-control={mode}
      data-active={active}
    >
      {active && mode === "pulse" && (
        <svg
          className="direction-meter"
          viewBox="0 0 84 22"
          role="img"
          aria-label="Oscilación de dirección"
          data-drift-degrees={degrees.toFixed(2)}
        >
          <path
            d="M5 11H79M42 3V19"
            fill="none"
            stroke="currentColor"
            opacity=".45"
          />
          <rect
            x="37"
            y="4"
            width="10"
            height="14"
            rx="3"
            fill="currentColor"
            opacity=".15"
          />
          <circle
            cx={42 + Math.max(-1, Math.min(1, degrees / 7)) * 35}
            cy="11"
            r="3.5"
            fill="currentColor"
          />
        </svg>
      )}
      {active ? (
        <span>
          {mode === "pull" && !armed
            ? "Dentro del círculo: soltar cancela"
            : `Referencia ${Math.round(reading.referencePower * 100)}% · Actual ${Math.round(reading.power * 100)}%`}
          {mode === "pulse" && (
            <small>
              {inWindow ? "En tu ventana · " : ""}Desvío {signed(degrees)}
            </small>
          )}
        </span>
      ) : (
        <p
          role="status"
          aria-label="Lectura del último golpe"
          data-power={reading.power}
          data-reference-power={reading.referencePower}
          data-drift-degrees={degrees.toFixed(2)}
        >
          <b>Último golpe</b> {Math.round(reading.power * 100)}% · Ref.{" "}
          {Math.round(reading.referencePower * 100)}% ·{" "}
          {mode === "pulse" ? "Desvío" : "Giro"} {signed(degrees)}
        </p>
      )}
    </div>
  );
}
