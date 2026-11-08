import { currentPower, upgradeRoute } from "./power";
// Verified physical aces. These are test routes, never shown as aiming assistance.
const legacy_aceShots = [
  { hole: 0, wait: 0, angle: 0.30675055439664217, power: 0.953 },
  { hole: 1, wait: 0, angle: 0.845, power: 1 },
  { hole: 2, wait: 30, angle: -0.01, power: 0.88 },
];
const legacy_aceRoundShots: [number, number][][] = [
  [
    [5.675135116162207, 0.4],
    [0.07342845121955252, 0.3],
    [1.2427247055175512, 0.4],
    [0.3886824618784611, 0.22],
  ],
  [
    [5.472451719156414, 0.3],
    [0.0086888982150111, 0.3],
    [1.0392693565051934, 0.4],
    [1.4664168231147017, 0.15],
  ],
  [[0, 1]],
];

export const legacyAceShots = legacy_aceShots;
export const aceShots = legacy_aceShots.map((s) => ({
  ...s,
  power: currentPower(s.power),
}));

export const aceRoundShots = legacy_aceRoundShots.map(upgradeRoute);
