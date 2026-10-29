import { beforeAll, afterEach, it, expect, vi } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { Game, initPhysics, MAX_STROKES } from "../shared/game";
import { courses, getCourse, surfaceAt, getCircuit } from "../shared/courses";
import {
  recordCompletedRound,
  readPersonalRecords,
  persistPersonalRecords,
  RECORDS_KEY,
} from "../src/personalRecords";
beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => {
  games.splice(0).forEach((g) => g.dispose());
  vi.unstubAllGlobals();
});
function completed() {
  const g = new Game();
  g.add("a", "A");
  g.state.phase = "finished";
  g.state.players[0].done = true;
  g.state.players[0].scores = [3, 4, 4];
  return g.state;
}
it("grass, rough, dirt and sand produce ordered rolling distances on the same ground", () => {
  const course = courses[0],
    original = { rough: course.rough, dirt: course.dirt, sand: course.sand };
  try {
    const distances: number[] = [];
    for (const kind of ["grass", "rough", "dirt", "sand"] as const) {
      course.rough = [];
      course.dirt = [];
      course.sand = [];
      if (kind !== "grass")
        course[kind] = [{ x: -3, z: 8, width: 5, length: 5, y: 0 }];
      const g = new Game();
      games.push(g);
      g.add("a", "A");
      g.start();
      g.state.players[0].pos = { x: -3, y: 0.22, z: 8 };
      g.place();
      g.shoot("a", Math.PI / 2, 0.15);
      for (let i = 0; i < 70 && g.state.moving; i++) g.tick();
      distances.push(g.state.players[0].pos.x + 3);
    }
    expect(distances[0]).toBeGreaterThan(distances[1]);
    expect(distances[1]).toBeGreaterThan(distances[2]);
    expect(distances[2]).toBeGreaterThan(distances[3]);
  } finally {
    Object.assign(course, original);
  }
});
it("terrain beneath an elevated bridge does not change its surface type", () => {
  const c = getCourse({ circuit: "riviera", hole: 0 });
  expect(surfaceAt(c, { x: 6, y: 3.22, z: -9 })).toBe("grass");
});
it("the visible curved bank has real physical colliders", () => {
  const g = new Game();
  games.push(g);
  g.selectCircuit("park");
  g.add("a", "A");
  g.start();
  g.state.hole = 2;
  g.load();
  g.tick();
  const hit = g.world.castRay(
    new R.Ray({ x: 0, y: 0.4, z: -10.5 }, { x: -1, y: 0, z: 0 }),
    3,
    true,
    undefined,
    undefined,
    undefined,
    g.bars[0],
  );
  expect(hit).not.toBeNull();
  expect(hit!.timeOfImpact).toBeLessThan(3);
});
it("stroke limits are identified and cannot create a personal record", () => {
  const g = new Game();
  games.push(g);
  g.add("a", "A");
  g.start();
  g.state.players[0].strokes = MAX_STROKES;
  g.endTurn();
  expect(g.state.players[0].capped).toEqual([0]);
  const s = completed();
  s.players[0].capped = [0];
  expect(recordCompletedRound({}, s, "classic")).toBeNull();
});
it("valid solo rounds save independent records, improve scores and earn real goals", () => {
  const s = completed();
  const first = recordCompletedRound({}, s, "classic", "2026-10-28T00:00:00Z")!;
  expect(first.report.improved).toBe(true);
  expect(first.report.best).toBe(11);
  expect(first.report.earned).toContain("par");
  s.players[0].scores = [4, 4, 4];
  const second = recordCompletedRound(first.history, s, "classic")!;
  expect(second.report.best).toBe(11);
  expect(second.report.improved).toBe(false);
  expect(second.history["sunset:classic"].rounds).toBe(2);
  const precision = recordCompletedRound(second.history, s, "pulse")!;
  expect(precision.history["sunset:pulse"].best).toBe(12);
  expect(precision.report.earned).toContain("precision");
});
it("incomplete, invalid, multiplayer and withdrawn rounds do not earn records", () => {
  for (const alter of [
    (s: any) => (s.phase = "scores"),
    (s: any) => (s.players[0].scores = [3]),
    (s: any) => (s.players[0].scores = [-1, 3, 4]),
    (s: any) => (s.players[0].withdrawn = true),
    (s: any) => s.players.push({ ...s.players[0], id: "b" }),
  ]) {
    const s = completed();
    alter(s);
    expect(recordCompletedRound({}, s, "classic")).toBeNull();
  }
});
it("record storage survives reload and ignores corrupt or obsolete data", () => {
  let value: string | null = null;
  vi.stubGlobal("localStorage", {
    getItem: () => value,
    setItem: (_k: string, v: string) => (value = v),
  });
  expect(
    persistPersonalRecords(
      recordCompletedRound({}, completed(), "classic")!.history,
    ),
  ).toBe(true);
  expect(readPersonalRecords()["sunset:classic"].best).toBe(11);
  value = "{bad";
  expect(readPersonalRecords()).toEqual({});
  value = JSON.stringify({ version: 3, records: {} });
  expect(readPersonalRecords()).toEqual({});
  value = JSON.stringify({
    version: 6,
    records: {
      "sunset:classic": { best: NaN, rounds: 1, date: "bad", goals: [] },
    },
  });
  expect(readPersonalRecords()).toEqual({});
});
it("blocked browser storage reports a session-only record without crashing", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  });
  expect(readPersonalRecords()).toEqual({});
  expect(persistPersonalRecords({})).toBe(false);
});
it("the shorter round contains exactly nine existing holes and preserves all 18 distinct holes", () => {
  expect(getCircuit("nine").courses).toHaveLength(9);
  expect(getCircuit("tour").courses).toHaveLength(18);
  expect(
    getCircuit("nine").courses.every((c) =>
      getCircuit("tour").courses.includes(c),
    ),
  ).toBe(true);
});
it("previous-hole scores determine tee honours without changing player identities", () => {
  const g = new Game();
  games.push(g);
  g.add("a", "Ana");
  g.add("b", "Bruno");
  g.add("c", "Celia");
  g.start();
  g.state.players.forEach((p, i) => {
    p.scores = [[5, 3, 4][i]];
    p.done = true;
  });
  g.state.phase = "scores";
  g.next();
  expect(g.state.players.map((p) => p.id)).toEqual(["a", "b", "c"]);
  expect(g.state.players[g.state.turn].name).toBe("Bruno");
  g.endTurn();
  expect(g.state.players[g.state.turn].name).toBe("Celia");
  g.endTurn();
  expect(g.state.players[g.state.turn].name).toBe("Ana");
  g.state.players.forEach((p) => {
    p.scores.push(3);
    p.done = true;
  });
  g.state.phase = "scores";
  g.next();
  expect(g.state.players[g.state.turn].name).toBe("Bruno");
  g.endTurn();
  expect(g.state.players[g.state.turn].name).toBe("Celia");
});
it("withdrawn players cannot retain tee honours and a rematch restores entry order", () => {
  const g = new Game();
  games.push(g);
  g.add("a", "Ana");
  g.add("b", "Bruno");
  g.add("c", "Celia");
  g.start();
  g.state.players.forEach((p, i) => {
    p.scores = [[1, 3, 4][i]];
    p.done = true;
  });
  g.state.players[0].withdrawn = true;
  g.state.phase = "scores";
  g.next();
  expect(g.state.players[g.state.turn].id).toBe("b");
  g.endTurn();
  expect(g.state.players[g.state.turn].id).toBe("c");
  g.start();
  expect(g.state.players[g.state.turn].id).toBe("b");
  expect(g.turnOrder).toEqual([0, 1]);
});
it("maximum normal shots reflect off ground-level walls without a vertical launch", () => {
  for (const angle of [0, 0.25, -0.25, Math.PI / 2]) {
    const g = new Game();
    games.push(g);
    g.add("a", "A");
    g.start();
    g.shoot("a", angle, 1);
    let maxY = 0;
    for (let step = 0; step < 1200 && g.state.moving; step++) {
      g.tick();
      maxY = Math.max(maxY, g.state.players[0].pos.y);
    }
    expect(maxY).toBeLessThan(0.28);
    expect(g.state.moving).toBe(false);
    expect(g.state.players[0].penalties).toBe(0);
  }
});
