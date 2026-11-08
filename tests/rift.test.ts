import { beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { Game, initPhysics } from "../shared/game";
import {
  getCourse,
  getCircuit,
  geometry,
  surfaceHeight,
  blockRotation,
  riftCourses,
  riftAlternateCourses,
  greenArea,
} from "../shared/courses";
import { captureLocalRound, restoreLocalRound } from "../src/localRound";
import {
  riftSafeShots,
  riftRiskShots,
  riftAlternateSafeShots,
  riftAlternateRiskShots,
} from "./fixtures/rift";
import { topSurfacePath } from "../src/CourseFootprint";
import { Vector3, Quaternion } from "three";
beforeAll(initPhysics);
function create(circuit: "rift" | "rift-alt" = "rift", hole?: number) {
  const g = new Game();
  g.selectCircuit(circuit);
  g.add("0", "QA");
  if (hole === undefined) g.start();
  else g.startPractice(hole);
  return g;
}
function shoot(g: Game, a: number, p: number) {
  expect(g.shoot("0", a, p)).toBe(true);
  for (let f = 0; g.state.moving && f < 1500; f++) g.tick();
  expect(g.state.moving).toBe(false);
}
it.each(["rift", "rift-alt"] as const)(
  "finishes the whole %s round through wide routes without resets, caps or penalties",
  (id) => {
    const g = create(id),
      routes = id === "rift" ? riftSafeShots : riftAlternateSafeShots;
    try {
      for (const [h, route] of routes.entries()) {
        expect(g.state.hole).toBe(h);
        for (const [a, p] of route) shoot(g, a, p);
        expect(g.state.players[0].done, `unfinished ${id}/${h}`).toBe(true);
        expect(g.state.players[0].penalties).toBe(0);
        if (h < 3) g.next();
      }
      expect(g.state.phase).toBe("finished");
      expect(g.state.players[0].scores).toEqual(routes.map((r) => r.length));
      expect(g.state.players[0].capped).toEqual([]);
    } finally {
      g.dispose();
    }
  },
);
it.each(["rift", "rift-alt"] as const)(
  "every %s shortcut is physically finishable and saves strokes against its wide route",
  (id) => {
    const risk = id === "rift" ? riftRiskShots : riftAlternateRiskShots,
      safe = id === "rift" ? riftSafeShots : riftAlternateSafeShots;
    for (let hole = 0; hole < 4; hole++) {
      const g = create(id, hole);
      try {
        if (hole === 2) for (let f = 0; f < 100; f++) g.tick();
        for (const [a, p] of risk[hole]) shoot(g, a, p);
        expect(g.state.phase, `unfinished ${id}/${hole}`).toBe("finished");
        expect(g.state.players[0].scores).toEqual([risk[hole].length]);
        expect(g.state.players[0].penalties).toBe(0);
        expect(risk[hole].length).toBeLessThan(safe[hole].length);
      } finally {
        g.dispose();
      }
    }
  },
);
it("an inaccurate bridge shot costs one real water penalty and returns to its last lie", () => {
  const g = create();
  try {
    const first = riftRiskShots[0][0];
    shoot(g, first[0], first[1]);
    const lie = { ...g.state.players[0].pos };
    const next = riftRiskShots[0][1];
    shoot(g, next[0] + 0.08, next[1]);
    expect(g.state.players[0].pos).toEqual(lie);
    expect(g.state.players[0].penalties).toBe(1);
    expect(g.state.players[0].strokes).toBe(3);
    expect(g.state.players[0].scores).toEqual([]);
  } finally {
    g.dispose();
  }
});
it("the orbit ace needs both a gate window and a precise line instead of automatic capture", () => {
  const closed = create("rift", 2),
    miss = create("rift", 2),
    ace = create("rift", 2);
  try {
    shoot(closed, 0, 0.423);
    expect(closed.state.players[0].done).toBe(false);
    for (let f = 0; f < 100; f++) {
      miss.tick();
      ace.tick();
    }
    shoot(miss, 0.08, 0.423);
    expect(miss.state.players[0].done).toBe(false);
    shoot(ace, 0, 0.423);
    expect(ace.state.players[0].scores).toEqual([1]);
    expect(ace.state.players[0].pos.y).toBeLessThan(-0.28);
  } finally {
    closed.dispose();
    miss.dispose();
    ace.dispose();
  }
});
it("the ring has real support only on its annulus, with no invisible rectangular floor", () => {
  const g = create("rift", 2);
  try {
    g.tick();
    const ray = (x: number, z: number) =>
      g.world.castRay(
        new R.Ray({ x, y: 2, z }, { x: 0, y: -1, z: 0 }),
        5,
        true,
        undefined,
        undefined,
        undefined,
        g.ball,
      );
    expect(geometry(getCourse(g.state)).walls).toEqual([]);
    expect(ray(11.5, 0)).not.toBeNull();
    expect(ray(6, 0)).toBeNull();
    expect(ray(-11, 9)).toBeNull();
    const mesh = getCourse(g.state).floorMeshes![0];
    expect(topSurfacePath(mesh)).not.toBe("");
    expect(mesh.vertices.every(Number.isFinite)).toBe(true);
  } finally {
    g.dispose();
  }
});
it("the diagonal ramp uses the same rotation in the mesh, ray collider and height calculation", () => {
  const c = riftCourses[3],
    ramp = c.terrain!.find((b) => b.yaw && b.rotation)!,
    q = blockRotation(ramp.rotation!, ramp.yaw!);
  for (const [x, z, y] of [
    [-4, 13, 3],
    [5, -9, 0],
  ])
    expect(surfaceHeight(ramp, x, z)).toBeCloseTo(y, 5);
  const g = create("rift", 3);
  try {
    g.tick();
    const point = new Vector3(0, ramp.size[1] / 2, 0)
      .applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w))
      .add(new Vector3(...ramp.pos));
    expect(surfaceHeight(ramp, point.x, point.z)).toBeCloseTo(point.y, 6);
    const hit = g.world.castRay(
      new R.Ray(
        { x: point.x, y: point.y + 2, z: point.z },
        { x: 0, y: -1, z: 0 },
      ),
      5,
      true,
      undefined,
      undefined,
      undefined,
      g.ball,
    );
    expect(hit!.timeOfImpact).toBeCloseTo(2, 3);
  } finally {
    g.dispose();
  }
});
it("both flag profiles keep their cups inside genuine cut greens, without moving any old course", () => {
  expect(getCircuit("tour").courses).toHaveLength(18);
  expect(getCircuit("nine").courses).toHaveLength(9);
  for (let h = 0; h < 4; h++) {
    const a = riftCourses[h],
      b = riftAlternateCourses[h],
      bounds = greenArea(b);
    expect(a.terrain).toBe(b.terrain);
    expect(a.cup).not.toEqual(b.cup);
    expect(b.cup.x).toBeGreaterThan(bounds.minX + 0.6);
    expect(b.cup.x).toBeLessThan(bounds.maxX - 0.6);
    expect(b.cup.z).toBeGreaterThan(bounds.minZ + 0.6);
    expect(b.cup.z).toBeLessThan(bounds.maxZ - 0.6);
  }
});
it("restores a new curved-world shot with exact physical contacts using the edition-aware save format", () => {
  const g = create("rift", 2);
  let restored: Game | undefined;
  try {
    for (let f = 0; f < 100; f++) g.tick();
    g.shoot("0", 0, 0.423);
    for (let f = 0; f < 20; f++) g.tick();
    const saved = captureLocalRound(g, "classic");
    restored = restoreLocalRound(saved);
    expect(saved.rules).toBe(7);
    expect(saved.format).toBe(2);
    expect(saved.state.physics).toBe(2);
    while (g.state.moving) {
      g.tick();
      restored.tick();
      expect(restored.state.players[0].pos).toEqual(g.state.players[0].pos);
    }
    expect(restored.state.players[0].scores).toEqual([1]);
  } finally {
    g.dispose();
    restored?.dispose();
  }
});
