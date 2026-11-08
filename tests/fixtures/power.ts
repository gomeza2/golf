import { powerSpeed, powerForSpeed } from "../../shared/power";
// Preserve the measured route's initial velocity when migrating its power to
// edition 2. Real collision/landing tests still decide whether it is playable.
export const currentPower = (p: number) =>
  p <= 0.75 ? p : powerForSpeed(powerSpeed(p, 1));
export const upgradeRoute = (shots: [number, number][]) =>
  shots.map(([a, p]): [number, number] => [a, currentPower(p)]);
