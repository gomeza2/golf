import type { PhysicsEdition } from "./rules";
// Measured with Rapier on flat grass: speed, settled distance. Not a trajectory aid.
// Recalibrate when damping, contact friction or rolling resistance changes.
export const grassCalibration: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.25, 0.02208],
  [0.5, 0.08199],
  [0.75, 0.17571],
  [1, 0.29964],
  [1.5, 0.62624],
  [2, 1.04234],
  [3, 2.08733],
  [4, 3.35167],
  [5, 4.78252],
  [6, 6.34409],
  [7, 8.01099],
  [8, 9.76459],
  [9, 11.59082],
  [10, 13.47876],
  [11, 15.4198],
  [12, 17.407],
  [13, 19.43464],
  [14, 21.29796],
  [15, 23.37672],
  [15.8, 25.06046],
  [16.2, 25.90873],
  [18, 30.05619],
  [20, 34.44513],
];
export const MAX_SHOT_SPEED = 20;
const LEGACY_RANGE = 25.90873;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
function distanceFraction(power: number) {
  const p = clamp(power),
    t = Math.min(1, p / 0.2);
  return p * t * t * (3 - 2 * t);
}
export function powerSpeed(power: number, physics: PhysicsEdition = 2) {
  const p = clamp(power),
    t = Math.max(0, (p - 0.75) / 0.25);
  const target =
    LEGACY_RANGE * distanceFraction(p) +
    (physics === 2 ? (34.44513 - LEGACY_RANGE) * t * t * (3 - 2 * t) : 0);
  for (let i = 1; i < grassCalibration.length; i++) {
    const [speed, distance] = grassCalibration[i],
      prior = grassCalibration[i - 1];
    if (target <= distance)
      return (
        prior[0] +
        ((speed - prior[0]) * (target - prior[1])) / (distance - prior[1])
      );
  }
  return MAX_SHOT_SPEED;
}
export function powerForSpeed(speed: number, physics: PhysicsEdition = 2) {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (powerSpeed(mid, physics) < speed) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
