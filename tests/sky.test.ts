import { beforeAll, it, expect } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { Game, initPhysics } from "../shared/game";
import {
  getCircuit,
  skyCourses,
  geometry,
  surfaceHeight,
} from "../shared/courses";
import { captureLocalRound, restoreLocalRound } from "../src/localRound";
import { RULES_VERSION } from "../shared/rules";
import { sceneryLayout } from "../src/scenery";
import { skySafeShots, skyBridgeShots } from "./fixtures/sky";
beforeAll(initPhysics);
function game() {
  const g = new Game();
  g.selectCircuit("skyruins");
  g.add("0", "Ana");
  g.start();
  return g;
}
function shoot(g: Game, a: number, p: number) {
  expect(g.shoot("0", a, p)).toBe(true);
  for (let i = 0; i < 1200 && g.state.moving; i++) g.tick();
  expect(g.state.moving).toBe(false);
}
it("finishes all three sky holes continuously via the safe routes without a penalty, cap or repositioning", () => {
  const g = game();
  try {
    expect(getCircuit("tour").courses).toHaveLength(18);
    expect(getCircuit("nine").courses).toHaveLength(9);
    for (const [h, route] of skySafeShots.entries()) {
      expect(g.state.hole).toBe(h);
      for (const [a, p] of route) shoot(g, a, p);
      expect(g.state.players[0].done).toBe(true);
      expect(g.state.players[0].penalties).toBe(0);
      if (h < 2) g.next();
    }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[0].scores).toEqual([3, 3, 4]);
    expect(g.state.players[0].capped).toEqual([]);
  } finally {
    g.dispose();
  }
});
it("a difficult diagonal really saves a stroke while a missed bridge returns once with a water penalty", () => {
  for (const miss of [false, true]) {
    const g = game();
    try {
      if (miss) {
        const tee = { ...g.state.players[0].pos };
        shoot(g, 0.14, 1);
        expect(g.state.players[0].penalties).toBe(1);
        expect(g.state.players[0].strokes).toBe(2);
        expect(g.state.players[0].pos).toEqual(tee);
      } else {
        for (const [a, p] of skyBridgeShots) shoot(g, a, p);
        expect(g.state.players[0].scores).toEqual([2]);
        expect(g.state.players[0].penalties).toBe(0);
      }
    } finally {
      g.dispose();
    }
  }
});
it("both temple ramps meet their decks and the real portal leaves ball clearance", () => {
  const c = skyCourses[1],
    ramps = geometry(c).surfaces.filter((b) => b.rotation);
  for (const ramp of ramps) {
    expect(surfaceHeight(ramp, ramp.pos[0], 8)).toBeCloseTo(0, 6);
    expect(
      surfaceHeight(ramp, ramp.pos[0], ramp.pos[0] < 0 ? -8 : 0),
    ).toBeCloseTo(2.4, 6);
  }
  const g = game();
  try {
    g.startPractice(1);
    g.tick();
    const hit = g.world.castRay(
      new R.Ray({ x: 5, y: 2.65, z: -7 }, { x: 0, y: 0, z: -1 }),
      5,
      true,
      undefined,
      undefined,
      undefined,
      g.ball,
    );
    expect(hit).toBeNull();
    const pillar = g.world.castRay(
      new R.Ray({ x: 3.1, y: 2.65, z: -7 }, { x: 0, y: 0, z: -1 }),
      5,
      true,
      undefined,
      undefined,
      undefined,
      g.ball,
    );
    expect(pillar).not.toBeNull();
  } finally {
    g.dispose();
  }
});
it("recovers a sky shot with identical physical contacts and keeps the previous rules/save format", () => {
  const g = game();
  let restored: Game | undefined;
  try {
    g.shoot("0", skyBridgeShots[0][0], 1);
    for (let i = 0; i < 90; i++) g.tick();
    const saved = captureLocalRound(g, "pull");
    expect(saved.rules).toBe(RULES_VERSION);
    expect(saved.rules).toBe(7);
    expect(saved.format).toBe(1);
    restored = restoreLocalRound(saved);
    for (let i = 0; i < 400; i++) {
      g.tick();
      restored.tick();
      expect(restored.state.players[0].pos).toEqual(g.state.players[0].pos);
    }
    expect(restored.state.circuit).toBe("skyruins");
  } finally {
    g.dispose();
    restored?.dispose();
  }
});
it("places all decorative geometry outside the playable limits with bounded quality budgets", () => {
  for (const c of skyCourses)
    for (const detail of [0, 1, 2]) {
      const layout = sceneryLayout(c, detail);
      expect(layout).toEqual(sceneryLayout(c, detail));
      expect(layout).toHaveLength([4, 8, 14][detail]);
      for (const p of layout)
        expect(Math.abs(p.x) - p.scale * 2).toBeGreaterThan(
          c.dimensions!.width / 2 + 0.4,
        );
    }
});
