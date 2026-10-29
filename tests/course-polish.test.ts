import { beforeAll, afterEach, it, expect } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { Game, initPhysics } from "../shared/game";
import {
  uniqueCourses,
  courseSize,
  geometry,
  surfaceHeight,
  courses,
} from "../shared/courses";
import { shotVelocity, MAX_SHOT_SPEED } from "../shared/shot";
beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => games.splice(0).forEach((g) => g.dispose()));
it("the first six full-width greens have continuous physical support outside the actual cups", () => {
  const g = new Game();
  games.push(g);
  g.selectCircuit("tour");
  g.add("a", "A");
  g.start();
  for (let hole = 0; hole < 6; hole++) {
    g.state.hole = hole;
    g.load();
    g.tick();
    const c = uniqueCourses[hole];
    for (let x = -5.7; x < 5.8; x += 0.6)
      for (let z = -11.7; z < 11.8; z += 0.6) {
        if (Math.hypot(x - c.cup.x, z - c.cup.z) < 0.8) continue;
        const hit = g.world.castRay(
          new R.Ray({ x, y: 5, z }, { x: 0, y: -1, z: 0 }),
          6,
          true,
          undefined,
          undefined,
          undefined,
          g.ball,
        );
        expect(hit, `${c.name} unsupported at ${x},${z}`).not.toBeNull();
        expect(hit!.timeOfImpact).toBeLessThanOrEqual(5.01);
      }
  }
});
it("the training ramp meets both decks without a raised lip or crack", () => {
  const c = courses[1],
    shapes = geometry(c).surfaces,
    ramp = shapes.find((b) => b.rotation)!;
  expect(surfaceHeight(ramp, 0, 2)).toBeCloseTo(0, 6);
  expect(surfaceHeight(ramp, 0, -4)).toBeCloseTo(2.4, 6);
  const lower = shapes.find((b) => !b.rotation)!;
  expect(surfaceHeight(lower, 0, 2)).toBeCloseTo(surfaceHeight(ramp, 0, 2)!, 6);
  expect(surfaceHeight(ramp, 0, 2 - 0.001)!).toBeCloseTo(0, 3);
});
it("no axis-aligned cross-bank leaves a ball-sized accidental side slit in any of the 18 holes", () => {
  for (const c of uniqueCourses) {
    const half = courseSize(c).width / 2;
    for (const b of c.blocks) {
      expect(b.bevel).toBeGreaterThan(0);
      expect(b.size.every((v) => v > 2 * b.bevel!)).toBe(true);
      if (b.moving || b.rotation || b.yaw || b.size[0] < b.size[2] * 2)
        continue;
      for (const gap of [
        b.pos[0] - b.size[0] / 2 + half,
        half - b.pos[0] - b.size[0] / 2,
      ])
        expect(gap <= 1e-8 || gap >= 0.9).toBe(true);
    }
  }
});
it("the calibrated power scale remains horizontal, monotonic and bounded", () => {
  expect(-shotVelocity(0, 1).z).toBeCloseTo(16.2);
  for (let i = 0; i <= 100; i++) {
    const p = i / 100,
      v = shotVelocity(0.3, p);
    expect(v.y).toBe(0);
    expect(Math.hypot(v.x, v.z)).toBeLessThanOrEqual(MAX_SHOT_SPEED + 1e-8);
    if (i)
      expect(Math.hypot(v.x, v.z)).toBeGreaterThan(
        Math.hypot(
          shotVelocity(0.3, p - 0.01).x,
          shotVelocity(0.3, p - 0.01).z,
        ),
      );
  }
});
it("the centred flagstick has a physical slender shaft, separate from the cup liner", () => {
  const g = new Game();
  games.push(g);
  g.add("a", "A");
  g.start();
  g.tick();
  const c = courses[0];
  const hit = g.world.castRay(
    new R.Ray(
      { x: c.cup.x + 0.2, y: c.cup.y + 1, z: c.cup.z },
      { x: -1, y: 0, z: 0 },
    ),
    0.3,
    true,
  );
  expect(hit).not.toBeNull();
  expect(hit!.timeOfImpact).toBeCloseTo(0.175, 3);
});
