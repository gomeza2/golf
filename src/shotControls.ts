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
    description: "Mantén, tira hacia atrás y suelta para golpear.",
    difficulty: "DIRECTO",
  },
  {
    id: "pulse" as const,
    name: "Precisión",
    description: "Fuerza y ángulo oscilan. Suelta en el instante exacto.",
    difficulty: "EXPERTO",
  },
];
export const isControlMode = (value: unknown): value is ControlMode =>
  controlModes.some((mode) => mode.id === value);
export function pullShot(dx: number, dy: number, heading: number) {
  const distance = Math.hypot(dx, dy);
  return {
    angle: wrapAngle(heading + Math.atan2(-dx, dy)),
    power: Math.min(1, distance / 180),
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
