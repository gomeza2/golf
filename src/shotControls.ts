import { wrapAngle } from "../shared/shot";
export type ControlMode = "classic" | "pull" | "pulse";
export const controlModes = [
  {
    id: "classic" as const,
    name: "Clásico",
    description: "Apunta, regula la potencia y pulsa Golpear.",
    difficulty: "PRECISO",
  },
  {
    id: "pull" as const,
    name: "Retroceso",
    description:
      "Arrastra y suelta para tirar. Vuelve al círculo para cancelar.",
    difficulty: "DIRECTO",
  },
  {
    id: "pulse" as const,
    name: "Precisión",
    description:
      "Elige tu referencia. Fuerza y ángulo oscilan: mantén y suelta.",
    difficulty: "EXPERTO",
  },
];
export const isControlMode = (value: unknown): value is ControlMode =>
  controlModes.some((mode) => mode.id === value);
export function pullShot(
  dx: number,
  dy: number,
  heading: number,
  fine = false,
) {
  const distance = Math.hypot(dx, dy);
  return {
    angle: wrapAngle(heading + Math.atan2(-dx, dy)),
    power: fine
      ? Math.max(0.03, Math.min(0.35, (distance / 180) * 0.35))
      : Math.min(1, distance / 180),
    valid: distance >= 12,
  };
}
export function pulseShot(elapsed: number, heading: number) {
  const phase = (Math.max(0, elapsed) % 1500) / 1500;
  return {
    power: 0.04 + 0.96 * (1 - Math.abs(phase * 2 - 1)),
    angle: wrapAngle(heading + Math.sin((elapsed * Math.PI * 2) / 1100) * 0.12),
  };
}

export type ShotReview = {
  power: number;
  referencePower: number;
  angleError: number;
};
// Describe input accuracy only. This never changes the physical shot.
export function shotReview(
  shot: { angle: number; power: number },
  reference: { angle: number; power: number },
): ShotReview {
  return {
    power: shot.power,
    referencePower: reference.power,
    angleError: wrapAngle(shot.angle - reference.angle),
  };
}

// Modern input events share the performance clock. Older epoch-based stamps
// fall back safely instead of producing an enormous or negative hold time.
export function shotEventTime(stamp: number | undefined, now: number) {
  return typeof stamp === "number" &&
    Number.isFinite(stamp) &&
    stamp >= 0 &&
    stamp <= now &&
    now - stamp <= 60000
    ? stamp
    : now;
}
