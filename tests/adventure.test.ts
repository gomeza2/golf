import { beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { Game, initPhysics } from "../shared/game";
import {
  adventureCourses,
  getCourse,
  blockPose,
  uniqueCourses,
  practiceLayouts,
} from "../shared/courses";
import { adventureSafeShots, adventureRiskShots } from "./fixtures/adventure";
import { captureLocalRound, restoreLocalRound } from "../src/localRound";
import { practiceKey } from "../src/practiceRecords";
beforeAll(initPhysics);
export function waitForAdventureGate(g: Game, stroke: number) {
  const index = ({ 0: 0, 1: 1, 3: 2 } as Record<number, number>)[stroke];
  if (g.state.hole !== 2 || index === undefined) return;
  const phase = [0, 2.1, 4.2][index];
  let frames = 0;
  while (
    !(
      Math.sin(g.state.time * 0.8 + phase) > 0.3 &&
      Math.cos(g.state.time * 0.8 + phase) > 0
    ) &&
    frames++ < 480
  )
    g.tick();
  expect(frames).toBeLessThan(480);
}
function create(hole?: number) {
  const g = new Game();
  g.selectCircuit("cumbres");
  g.add("0", "QA");
  if (hole === undefined) g.start();
  else g.startPractice(hole);
  return g;
}
function shot(g: Game, a: number, p: number) {
  expect(g.shoot("0", a, p)).toBe(true);
  expect(g.ball.linvel().y).toBe(0);
  for (let f = 0; g.state.moving && f < 1500; f++) g.tick();
  expect(g.state.moving).toBe(false);
}
it.each(["safe", "risk"] as const)(
  "completes all three %s routes using actual gravity, gates and cups without resets or penalties",
  (mode) => {
    const g = create(),
      routes = mode === "safe" ? adventureSafeShots : adventureRiskShots;
    try {
      for (const [h, route] of routes.entries()) {
        expect(g.state.hole).toBe(h);
        for (const [i, [a, p]] of route.entries()) {
          if (mode === "safe") waitForAdventureGate(g, i);
          shot(g, a, p);
        }
        expect(g.state.players[0].done, `hole ${h}`).toBe(true);
        expect(g.state.players[0].penalties).toBe(0);
        if (h < 2) g.next();
      }
      expect(g.state.phase).toBe("finished");
      expect(g.state.players[0].scores).toEqual(routes.map((r) => r.length));
      expect(g.state.players[0].capped).toEqual([]);
    } finally {
      g.dispose();
    }
  },
);
it("keeps the existing practice keys while appending three new physical holes", () => {
  expect(uniqueCourses).toHaveLength(34);
  expect(practiceKey("rift", 0, "classic")).toBe("24:classic");
  expect(practiceKey("rift-alt", 0, "classic")).toBe("28:classic");
  expect(practiceKey("rift-alt", 3, "classic")).toBe("31:classic");
  expect(practiceKey("cumbres", 0, "classic")).toBe("32:classic");
  expect(practiceLayouts).toHaveLength(38);
});
it("the spiral has real ascending support and open water gaps", () => {
  const g = create(1);
  try {
    g.tick();
    const ray = (x: number, z: number) =>
      g.world.castRay(
        new R.Ray({ x, y: 6, z }, { x: 0, y: -1, z: 0 }),
        8,
        true,
        undefined,
        undefined,
        undefined,
        g.ball,
      );
    expect(ray(-10.5, 0)!.timeOfImpact).toBeCloseTo(4.8, 2);
    expect(ray(4, 6)).toBeNull();
    expect(
      getCourse(g.state).floorMeshes![0].vertices.some(
        (v, i) => i % 3 === 1 && v > 3.5,
      ),
    ).toBe(true);
  } finally {
    g.dispose();
  }
});
it("lift gates move vertically and expose the same pose to simulation and rendering", () => {
  const g = create(2);
  try {
    for (let i = 0; i < 60; i++) g.tick();
    const gates = g.dynamicBlocks.filter((p) => p.block.motion === "lift");
    expect(gates).toHaveLength(3);
    for (const { body, block } of gates) {
      const p = blockPose(block, g.state.time);
      expect(body.translation().x).toBeCloseTo(block.pos[0], 5);
      expect(body.translation().y).toBeCloseTo(p.pos[1], 4);
      expect(p.pos[1] - block.pos[1]).toBeGreaterThanOrEqual(0);
      expect(p.pos[1] - block.pos[1]).toBeLessThanOrEqual(1.6);
      expect(p.yaw).toBe(0);
    }
  } finally {
    g.dispose();
  }
});
it("a closed visible gate is a real collision and an oblique summit ace is not the default shot", () => {
  const c = adventureCourses[2],
    closed = {
      ...c,
      blocks: c.blocks.map((b) =>
        b.motion === "lift" ? { ...b, moving: false } : b,
      ),
    };
  const g = new Game(closed);
  g.add("0", "QA");
  g.startPractice(0);
  try {
    shot(g, 0, 0.727);
    expect(g.state.players[0].pos.z).toBeGreaterThan(7);
    expect(g.state.players[0].done).toBe(false);
  } finally {
    g.dispose();
  }
  const f = create(1);
  try {
    shot(f, 0, 1);
    expect(f.state.players[0].done).toBe(false);
  } finally {
    f.dispose();
  }
});
it("restores a moving ball on a new sloped mesh with exact existing snapshot compatibility", () => {
  const g = create(1);
  let restored: Game | undefined;
  try {
    const [a, p] = adventureRiskShots[1][0];
    g.shoot("0", a, p);
    for (let i = 0; i < 40; i++) g.tick();
    const saved = captureLocalRound(g, "classic");
    expect(saved.rules).toBe(7);
    expect(saved.format).toBe(2);
    expect(saved.state.physics).toBe(2);
    restored = restoreLocalRound(saved);
    for (let i = 0; g.state.moving && i < 1500; i++) {
      g.tick();
      restored.tick();
      expect(restored.state.players[0].pos).toEqual(g.state.players[0].pos);
    }
    expect(g.state.players[0].scores).toEqual([1]);
    expect(restored.state.players[0].scores).toEqual([1]);
  } finally {
    g.dispose();
    restored?.dispose();
  }
});

it("a committed cornice shortcut settles in under nine seconds instead of creeping through the full motion limit", () => {
  const g = create(0);
  try {
    const [a, p] = adventureRiskShots[0][0];
    g.shoot("0", a, p);
    let f = 0;
    while (g.state.moving && f < 1500) {
      g.tick();
      f++;
    }
    expect(f).toBeLessThan(60 * 9);
    expect(g.state.players[0].penalties).toBe(0);
    expect(g.state.players[0].pos.y).toBeCloseTo(4.22, 1);
  } finally {
    g.dispose();
  }
});

it("the raised lighthouse green has physical sides matching its visible pedestal", () => {
  const g = create(1);
  try {
    g.tick();
    const hit = g.world.castRay(
      new R.Ray({ x: 0, y: 1, z: 4.5 }, { x: 0, y: 0, z: -1 }),
      3,
      true,
      undefined,
      undefined,
      undefined,
      g.ball,
    );
    expect(hit).not.toBeNull();
    expect(hit!.timeOfImpact).toBeCloseTo(1.5, 2);
  } finally {
    g.dispose();
  }
});
