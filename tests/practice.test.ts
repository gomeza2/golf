import { beforeAll, afterEach, it, expect, vi } from "vitest";
import { Game, initPhysics, MAX_STROKES } from "../shared/game";
import { getCourse, uniqueCourses } from "../shared/courses";
import { tourShots } from "./fixtures/tour";
import { recordCompletedRound } from "../src/personalRecords";
import {
  practiceKey,
  practiceMedal,
  recordPractice,
  readPracticeRecords,
  persistPracticeRecords,
  PRACTICE_KEY,
} from "../src/practiceRecords";
beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => {
  games.splice(0).forEach((g) => g.dispose());
  vi.unstubAllGlobals();
});
function game() {
  const g = new Game();
  games.push(g);
  g.selectCircuit("tour");
  g.add("a", "Ana");
  return g;
}
function completed(score = 3) {
  const g = game();
  g.startPractice(0);
  g.state.phase = "finished";
  g.state.players[0].done = true;
  g.state.players[0].scores = [score];
  return g.state;
}
it("any of the 18 holes can start from its own real tee as individual practice", () => {
  for (let hole = 0; hole < 18; hole++) {
    const g = game();
    g.startPractice(hole);
    expect(g.state.practice).toBe(true);
    expect(g.state.hole).toBe(hole);
    expect(g.state.players[0].pos).toEqual(uniqueCourses[hole].start);
    expect(g.state.players[0].scores).toEqual([]);
    expect(g.state.phase).toBe("playing");
  }
});
it("finishes a single physical hole, records practice only and resets cleanly for retry", () => {
  const g = game();
  g.startPractice(0);
  for (const [a, p] of tourShots[0]) {
    expect(g.shoot("a", a, p)).toBe(true);
    for (let f = 0; f < 1200 && g.state.moving; f++) g.tick();
  }
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].capped).toEqual([]);
  expect(g.state.players[0].scores).toEqual([tourShots[0].length]);
  expect(recordCompletedRound({}, g.state, "classic")).toBeNull();
  const disguised = structuredClone(g.state);
  disguised.circuit = "sunset";
  disguised.players[0].scores = [3, 4, 4];
  expect(recordCompletedRound({}, disguised, "classic")).toBeNull();
  const result = recordPractice({}, g.state, "classic")!;
  expect(result.report.score).toBe(tourShots[0].length);
  g.next();
  expect(g.state.hole).toBe(0);
  g.startPractice(0);
  expect(g.state.players[0].scores).toEqual([]);
  expect(g.state.players[0].strokes).toBe(0);
  g.start();
  expect(g.state.practice).toBe(false);
});
it("rejects invalid holes and multi-player practice without changing the active game", () => {
  const g = game();
  g.start();
  for (const hole of [-1, 18, NaN, Infinity, 0.5])
    expect(() => g.startPractice(hole)).toThrow();
  expect(g.state.practice).toBe(false);
  expect(g.state.hole).toBe(0);
  const multi = new Game();
  games.push(multi);
  multi.add("a", "A");
  multi.add("b", "B");
  expect(() => multi.startPractice(0)).toThrow("individual");
});
it("stroke caps finish training but cannot earn a mark or medal", () => {
  const g = game();
  g.startPractice(17);
  g.state.players[0].strokes = MAX_STROKES;
  g.endTurn();
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].capped).toEqual([17]);
  expect(recordPractice({}, g.state, "classic")).toBeNull();
});
it("marks are shared across catalogue selections of the same physical hole, but separate per control", () => {
  expect(practiceKey("tour", 0, "classic")).toBe(
    practiceKey("sunset", 0, "classic"),
  );
  expect(practiceKey("nine", 0, "classic")).toBe(
    practiceKey("sunset", 0, "classic"),
  );
  const first = recordPractice({}, completed(3), "classic")!;
  const worse = recordPractice(first.history, completed(5), "classic")!;
  expect(worse.report.best).toBe(3);
  expect(worse.report.improved).toBe(false);
  expect(worse.history["0:classic"].attempts).toBe(2);
  const better = recordPractice(worse.history, completed(2), "classic")!;
  expect(better.report.best).toBe(2);
  expect(better.report.medal).toBe("Oro");
  expect(
    recordPractice(better.history, completed(4), "pull")!.history["0:pull"]
      .best,
  ).toBe(4);
});
it("medals depend on actual strokes relative to par", () => {
  expect([2, 3, 4, 5, 6].map((n) => practiceMedal(n, 3))).toEqual([
    "Oro",
    "Plata",
    "Bronce",
    "Bronce",
    "Sin medalla",
  ]);
});
it("normal rounds, partial attempts, withdrawals and invalid scores never register as practice", () => {
  for (const change of [
    (s: any) => (s.practice = false),
    (s: any) => (s.phase = "playing"),
    (s: any) => (s.players[0].withdrawn = true),
    (s: any) => (s.players[0].scores = [0]),
    (s: any) => (s.players[0].scores = [2, 3]),
    (s: any) => (s.players[0].done = false),
  ]) {
    const s = completed();
    change(s);
    expect(recordPractice({}, s, "classic")).toBeNull();
  }
});
it("practice storage survives reload and rejects obsolete, corrupt and out-of-range data", () => {
  let value: string | null = null;
  vi.stubGlobal("localStorage", {
    getItem: () => value,
    setItem: (_k: string, v: string) => (value = v),
  });
  const h = recordPractice({}, completed(), "classic")!.history;
  expect(persistPracticeRecords(h)).toBe(true);
  expect(readPracticeRecords()).toEqual(h);
  value = JSON.stringify({
    version: 5,
    records: {
      "18:classic": h["0:classic"],
      "0:classic": { ...h["0:classic"], best: 0 },
      "0:invalid": h["0:classic"],
    },
  });
  expect(readPracticeRecords()).toEqual({});
  value = "{broken";
  expect(readPracticeRecords()).toEqual({});
  value = JSON.stringify({ version: 4, records: h });
  expect(readPracticeRecords()).toEqual({});
  expect(PRACTICE_KEY).not.toContain("personal");
});
it("blocked storage leaves the result usable without claiming it was persisted", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  });
  expect(readPracticeRecords()).toEqual({});
  expect(persistPracticeRecords({})).toBe(false);
});
