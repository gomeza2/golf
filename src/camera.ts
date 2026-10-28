import type { V3 } from "../shared/courses";
export function followPose(ball: V3, heading: number, aspect: number) {
  const compact = aspect < 0.8;
  const distance = compact ? 12 : 10.5,
    height = compact ? 8.6 : 7.5;
  const ahead = compact ? 0.15 : 1.8;
  const dx = Math.sin(heading),
    dz = -Math.cos(heading);
  return {
    position: {
      x: ball.x - dx * distance,
      y: ball.y + height,
      z: ball.z - dz * distance,
    },
    target: { x: ball.x + dx * ahead, y: ball.y + 0.4, z: ball.z + dz * ahead },
  };
}
export function turnAngle(from: number, to: number, amount: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * Math.min(1, Math.max(0, amount));
}
