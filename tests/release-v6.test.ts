import { beforeAll, afterEach, it, expect } from "vitest";
import { Game, initPhysics, MAX_STROKES } from "../shared/game";
import { courses } from "../shared/courses";
import { holeOutcome } from "../shared/scoring";
import { TURN_SECONDS } from "../shared/rules";
import { tourShots } from "./fixtures/tour";
beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => games.splice(0).forEach((g) => g.dispose()));
function game() {
  const g = new Game();
  games.push(g);
  g.add("a", "Ana");
  return g;
}
it("real grass travel is approximately proportional from 20 to 100 percent, with small tap shots below it", () => {
  const course = courses[0],
    original = { ...course };
  try {
    Object.assign(course, {
      blocks: [],
      rough: [],
      sand: [],
      dirt: [],
      dimensions: { width: 100, length: 100 },
      start: { x: 0, y: 0.22, z: 0 },
      cup: { x: 40, y: 0, z: -40 },
    });
    const distance = (p: number) => {
      const g = game();
      g.start();
      g.shoot("a", 0, p);
      for (let i = 0; i < 2000 && g.state.moving; i++) g.tick();
      expect(g.state.players[0].penalties).toBe(0);
      return -g.state.players[0].pos.z;
    };
    const max = distance(1),
      observed = new Map<number, number>();
    expect(max).toBeGreaterThan(25.6);
    expect(max).toBeLessThan(26.2);
    for (const p of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
      const d = distance(p);
      observed.set(p, d);
      expect(Math.abs(d / max - p)).toBeLessThan(0.025);
    }
    const a = observed.get(0.5)!,
      b = observed.get(0.6)!,
      c = observed.get(0.7)!;
    expect(Math.abs(b - a - (c - b))).toBeLessThan(0.25);
    expect(b / a).toBeLessThan(1.24);
    expect(b / a).toBeGreaterThan(1.16);
    expect(distance(0.03)).toBeLessThan(0.15);
    expect(distance(0.1)).toBeLessThan(distance(0.2));
  } finally {
    for (const k of Object.keys(course)) delete (course as any)[k];
    Object.assign(course, original);
  }
});
it("30 second turns expire once and give the next player a fresh clock", () => {
  const g = game();
  g.add("b", "Beto");
  g.start();
  expect(TURN_SECONDS).toBe(30);
  expect(g.state.deadline - g.state.time).toBe(30);
  g.state.time = g.state.deadline - 0.02;
  g.tick();
  expect(g.state.players[0].strokes).toBe(0);
  g.tick();
  expect(g.state.players[0].strokes).toBe(1);
  expect(g.state.players[0].penalties).toBe(1);
  expect(g.state.turn).toBe(1);
  expect(g.state.deadline - g.state.time).toBeCloseTo(30);
});
it("golf result labels use the real par and prioritize a hole in one", () => {
  for (const [strokes, par, kind, relative] of [
    [1, 3, "ace", -2],
    [2, 5, "albatross", -3],
    [2, 4, "eagle", -2],
    [3, 4, "birdie", -1],
    [4, 4, "par", 0],
    [5, 4, "bogey", 1],
    [6, 4, "double-bogey", 2],
    [8, 4, "over", 4],
  ] as const)
    expect(holeOutcome(strokes, par)).toMatchObject({ kind, relative });
  expect(holeOutcome(12, 4, true)).toMatchObject({
    kind: "limit",
    label: "Límite de golpes",
  });
});
it("a physically completed eagle produces an authoritative result event without changing the stroke score", () => {
  const g = game();
  g.selectCircuit("tour");
  g.startPractice(1);
  for (const [a, p] of tourShots[1]) {
    g.shoot("a", a, p);
    for (let i = 0; i < 1200 && g.state.moving; i++) g.tick();
  }
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([2]);
  expect(g.state.event).toMatchObject({
    kind: "cup",
    outcome: {
      kind: "eagle",
      label: "Eagle",
      relative: -2,
      strokes: 2,
      par: 4,
      playerId: "a",
      playerName: "Ana",
      hole: 1,
    },
  });
});
it("a stroke cap cannot emit a cup celebration", () => {
  const g = game();
  g.startPractice(0);
  g.state.players[0].strokes = MAX_STROKES;
  g.endTurn();
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].capped).toEqual([0]);
  expect(g.state.event).toBeUndefined();
});
