import { courseSize, type Course, type CircuitId } from "../shared/courses";

export type SceneryItem = { x: number; z: number; scale: number; yaw: number };
/** Decoration stays beyond the playable boundary, never an invisible obstacle. */
export function sceneryLayout(course: Course, detail: number): SceneryItem[] {
  const { width, length } = courseSize(course);
  const count = detail === 0 ? 4 : detail === 1 ? 8 : 14;
  return Array.from({ length: count }, (_, i) => ({
    x: (i % 2 ? -1 : 1) * (width / 2 + 4 + (i % 3) * 1.4),
    z: -length / 2 + (length * (Math.floor(i / 2) + 0.5)) / (count / 2),
    scale: 0.8 + ((i * 7) % 5) * 0.14,
    yaw: i * 2.39996,
  }));
}
export function sceneryTheme(circuit: CircuitId) {
  return circuit === "skyruins"
    ? "ruins"
    : circuit === "moonlight"
      ? "lunar"
      : "garden";
}
