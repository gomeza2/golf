import type { V3 } from "../shared/courses";
export function followPose(
  ball: V3,
  heading: number,
  aspect: number,
  look: CameraLook = defaultLook,
) {
  const compact = aspect < 0.8;
  const distance = compact ? 12 : 10.5,
    height = compact ? 8.6 : 7.5;
  const ahead = compact ? 0.15 : 0.35;
  const elevation = Math.atan2(height, distance) + look.pitch;
  const radius = Math.hypot(distance, height) * look.zoom;
  const horizontal = Math.cos(elevation) * radius;
  const dx = Math.sin(heading + look.yaw),
    dz = -Math.cos(heading + look.yaw);
  return {
    position: {
      x: ball.x - dx * horizontal,
      y: ball.y + Math.sin(elevation) * radius,
      z: ball.z - dz * horizontal,
    },
    target: { x: ball.x + dx * ahead, y: ball.y + 0.4, z: ball.z + dz * ahead },
  };
}
export function turnAngle(from: number, to: number, amount: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * Math.min(1, Math.max(0, amount));
}
export type CameraLook = { yaw: number; pitch: number; zoom: number };
export const defaultLook: CameraLook = { yaw: 0, pitch: 0, zoom: 1 };
export function changeLook(
  look: CameraLook,
  delta: Partial<CameraLook>,
): CameraLook {
  return {
    yaw: Math.atan2(
      Math.sin(look.yaw + (delta.yaw || 0)),
      Math.cos(look.yaw + (delta.yaw || 0)),
    ),
    pitch: Math.max(-0.22, Math.min(0.55, look.pitch + (delta.pitch || 0))),
    zoom: Math.max(0.75, Math.min(1.65, look.zoom + (delta.zoom || 0))),
  };
}
