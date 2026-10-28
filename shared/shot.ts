import { blockPose, geometry, type Course, type V3 } from "./courses";
export type ShotStyle = "putt" | "chip";
export const wrapAngle = (angle: number) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));
export function shotVelocity(
  angle: number,
  power: number,
  style: ShotStyle = "putt",
): V3 {
  const speed = power * 20 * (style === "chip" ? 0.82 : 1);
  return {
    x: Math.sin(angle) * speed,
    y: style === "chip" ? power * 7 : 0,
    z: -Math.cos(angle) * speed,
  };
}
// A short guide exposes only the first bank, not the full solution to the hole.
export function aimGuide(
  course: Course,
  from: V3,
  angle: number,
  power: number,
  time: number,
  style: ShotStyle,
) {
  const direction = { x: Math.sin(angle), z: -Math.cos(angle) };
  let distance = 2 + power * 9;
  let normal: { x: number; z: number } | undefined;
  if (style === "putt")
    for (const block of [...geometry(course).walls, ...course.blocks]) {
      const pose = blockPose(block, time);
      if (
        from.y < pose.pos[1] - block.size[1] / 2 - 0.22 ||
        from.y > pose.pos[1] + block.size[1] / 2 + 0.22
      )
        continue;
      const c = Math.cos(pose.yaw),
        s = Math.sin(pose.yaw);
      const ox = c * (from.x - pose.pos[0]) - s * (from.z - pose.pos[2]);
      const oz = s * (from.x - pose.pos[0]) + c * (from.z - pose.pos[2]);
      const dx = c * direction.x - s * direction.z,
        dz = s * direction.x + c * direction.z;
      let enter = 0,
        exit = distance,
        axis = -1,
        sign = 1;
      for (const [index, origin, delta, half] of [
        [0, ox, dx, block.size[0] / 2 + 0.22],
        [1, oz, dz, block.size[2] / 2 + 0.22],
      ]) {
        if (Math.abs(delta) < 1e-8) {
          if (Math.abs(origin) > half) exit = -1;
          continue;
        }
        const lo = (-half - origin) / delta,
          hi = (half - origin) / delta;
        const start = Math.min(lo, hi);
        if (start > enter) {
          enter = start;
          axis = index;
          sign = delta > 0 ? -1 : 1;
        }
        exit = Math.min(exit, Math.max(lo, hi));
      }
      if (axis >= 0 && enter < exit && enter > 0.03 && enter < distance) {
        distance = enter;
        normal =
          axis === 0
            ? { x: c * sign, z: -s * sign }
            : { x: s * sign, z: c * sign };
      }
    }
  const velocity = shotVelocity(angle, power, style);
  const points: V3[] = [];
  for (let i = 0; i <= 20; i++) {
    const d = (distance * i) / 20;
    const t = d / Math.max(0.6, Math.hypot(velocity.x, velocity.z));
    points.push({
      x: from.x + direction.x * d,
      y:
        from.y +
        (style === "chip" ? Math.max(0, velocity.y * t - 4.905 * t * t) : 0),
      z: from.z + direction.z * d,
    });
  }
  const hit = normal ? points[points.length - 1] : undefined;
  if (normal) {
    const dot = direction.x * normal.x + direction.z * normal.z;
    points.push({
      x: hit!.x + (direction.x - 2 * dot * normal.x) * 2,
      y: from.y,
      z: hit!.z + (direction.z - 2 * dot * normal.z) * 2,
    });
  }
  return { points, hit };
}
