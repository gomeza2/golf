import type { V3 } from "./courses";
import { powerSpeed } from "./power";
export { MAX_SHOT_SPEED } from "./power";
export const MAX_GUIDE_LENGTH = 2.4;
export const wrapAngle = (angle: number) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));
export function shotVelocity(angle: number, power: number): V3 {
  const speed = powerSpeed(power);
  return { x: Math.sin(angle) * speed, y: 0, z: -Math.cos(angle) * speed };
}
// A short directional cue, never a predicted landing point or rebound solution.
export function aimGuide(from: V3, angle: number, power: number) {
  const distance = 1.2 + Math.max(0, Math.min(1, power)) * 1.2;
  return {
    points: [
      from,
      {
        x: from.x + Math.sin(angle) * distance,
        y: from.y,
        z: from.z - Math.cos(angle) * distance,
      },
    ],
  };
}
