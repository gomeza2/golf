import { courseSize, type Course, type V3 } from "../shared/courses";

export function overviewFrame(width: number, height: number, inMatch = true) {
  const portrait = width / height < 0.8;
  const short = height < 500;
  const margins = !inMatch
    ? [24, 24, 24, 24]
    : portrait
      ? [16, 16, Math.min(210, height * 0.28), Math.min(164, height * 0.24)]
      : short
        ? [Math.min(240, width * 0.25), 154, 65, 126]
        : [Math.min(300, width * 0.22), Math.min(210, width * 0.16), 70, 154];
  const [left, right, top, bottom] = margins;
  return {
    width: Math.max(100, width - left - right),
    height: Math.max(100, height - top - bottom),
    offsetX: (right - left) / 2,
    offsetY: (bottom - top) / 2,
  };
}
export function overviewBounds(course: Course) {
  const size = courseSize(course);
  const height = Math.max(
    course.cup.y + 2.7,
    course.start.y + 1,
    ...(course.terrain || []).map(
      (b) =>
        b.pos[1] +
        (Math.abs(Math.sin(b.rotation || 0)) * b.size[2]) / 2 +
        b.size[1] / 2,
    ),
    ...course.blocks.map((b) => b.pos[1] + b.size[1] / 2),
  );
  return { width: size.width + 1, length: size.length + 1, height };
}
/** Fit the actual 3D bounds into the usable screen, including perspective depth. */
export function overviewPose(
  course: Course,
  width: number,
  height: number,
  look: CameraLook = defaultLook,
  inMatch = true,
) {
  const frame = overviewFrame(width, height, inMatch),
    bounds = overviewBounds(course);
  const azimuth = (width / height < 0.8 ? 0.16 : 0.63) + look.yaw;
  const elevation = Math.max(
    0.45,
    Math.min(1.18, (width / height < 0.8 ? 0.86 : 0.72) + look.pitch),
  );
  const direction = {
    x: Math.sin(azimuth) * Math.cos(elevation),
    y: Math.sin(elevation),
    z: Math.cos(azimuth) * Math.cos(elevation),
  };
  const right = { x: Math.cos(azimuth), y: 0, z: -Math.sin(azimuth) };
  const up = {
    x: -Math.sin(azimuth) * Math.sin(elevation),
    y: Math.cos(elevation),
    z: -Math.cos(azimuth) * Math.sin(elevation),
  };
  const tanY = Math.tan((43 * Math.PI) / 360),
    tanX = (tanY * width) / height;
  const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
  let distance = 1;
  for (const x of [-bounds.width / 2, bounds.width / 2])
    for (const y of [-bounds.height / 2, bounds.height / 2])
      for (const z of [-bounds.length / 2, bounds.length / 2]) {
        const point = { x, y, z },
          depth = dot(point, direction);
        distance = Math.max(
          distance,
          depth +
            Math.abs(dot(point, right)) /
              (((tanX * frame.width) / width) * 0.92),
          depth +
            Math.abs(dot(point, up)) /
              (((tanY * frame.height) / height) * 0.92),
        );
      }
  distance *= look.zoom;
  const target = { x: 0, y: bounds.height / 2, z: 0 };
  return {
    position: {
      x: direction.x * distance,
      y: target.y + direction.y * distance,
      z: direction.z * distance,
    },
    target,
  };
}
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
