import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { Game, initPhysics } from "../shared/game";
import { powerSpeed } from "../shared/power";
import { shotVelocity } from "../shared/shot";
import { physicsEdition, type PhysicsEdition } from "../shared/rules";
import {
  restoreLocalRound,
  validateLocalRound,
  type LocalRound,
} from "../src/localRound";
import legacy from "./fixtures/v018-inflight.json";
import {
  readPersonalRecords,
  persistPersonalRecords,
} from "../src/personalRecords";
import {
  readPracticeRecords,
  persistPracticeRecords,
} from "../src/practiceRecords";

beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => {
  games.splice(0).forEach((g) => g.dispose());
  vi.unstubAllGlobals();
});
function flat(
  physics: PhysicsEdition = 2,
  surface?: "sand" | "dirt" | "rough",
  bank = false,
) {
  const g = new Game({
    name: "Measured field",
    subtitle: "",
    par: 9,
    start: { x: 0, y: 0.24, z: 30 },
    cup: { x: 40, y: 0, z: -40 },
    dimensions: { width: 100, length: 100 },
    blocks: bank ? [{ pos: [5, 0.5, 0], size: [0.5, 1, 70], bevel: 0.06 }] : [],
    ...(surface
      ? { [surface]: [{ x: 0, z: 0, y: 0, width: 80, length: 90 }] }
      : {}),
  });
  g.state.physics = physics;
  g.add("0", "QA");
  g.start();
  games.push(g);
  return g;
}
it("preserves soft and medium power while progressively opening a stronger top quarter", () => {
  expect(powerSpeed(1)).toBe(20);
  expect(powerSpeed(1, 1)).toBeCloseTo(16.2);
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    if (p <= 0.75) expect(powerSpeed(p)).toBe(powerSpeed(p, 1));
    if (i) {
      expect(powerSpeed(p)).toBeGreaterThan(powerSpeed(p - 0.001));
      expect(powerSpeed(p) - powerSpeed(p - 0.001)).toBeLessThan(0.05);
    }
    expect(shotVelocity(0.7, p).y).toBe(0);
  }
});
it("a real full drive travels farther while half-strength shots retain the original range", () => {
  const distance = (edition: PhysicsEdition, power: number) => {
    const g = flat(edition);
    g.shoot("0", 0, power);
    while (g.state.moving) g.tick();
    expect(g.state.players[0].penalties).toBe(0);
    return 30 - g.state.players[0].pos.z;
  };
  const original = distance(1, 1),
    current = distance(2, 1);
  expect(current).toBeGreaterThan(original * 1.25);
  expect(current).toBeLessThan(original * 1.45);
  expect(distance(2, 0.5)).toBeCloseTo(distance(1, 0.5), 5);
});
function drop(edition: PhysicsEdition, surface?: "sand" | "dirt" | "rough") {
  const g = flat(edition, surface);
  g.shoot("0", 0, 0.03);
  g.ball.setTranslation({ x: 0, y: 2, z: 10 }, true);
  g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
  let touched = false,
    peak = 0.22,
    rebounds = 0,
    frames = 0,
    landing = false;
  while (g.state.moving && frames++ < 240) {
    const before = g.ball.linvel().y;
    g.tick();
    const pos = g.ball.translation(),
      after = g.ball.linvel().y;
    if (before < -1 && after > -0.3) touched = true;
    if (touched) peak = Math.max(peak, pos.y);
    if (before < -1 && after > 0.3) rebounds++;
    landing ||= g.state.event?.kind === "landing";
  }
  expect(g.state.moving).toBe(false);
  expect(frames).toBeLessThan(240);
  return { peak, rebounds, landing };
}
it("a hard landing rebounds on grass, loses energy and settles without endless hops", () => {
  const result = drop(2);
  expect(result.peak).toBeGreaterThan(0.32);
  expect(result.peak).toBeLessThan(0.65);
  expect(result.rebounds).toBeGreaterThan(0);
  expect(result.rebounds).toBeLessThanOrEqual(3);
  expect(result.landing).toBe(true);
  const original = drop(1);
  expect(original.peak).toBeLessThan(0.26);
  expect(original.landing).toBe(false);
});
it("sand and rough soften actual landings while hard soil rebounds more than grass", () => {
  const sand = drop(2, "sand"),
    rough = drop(2, "rough"),
    grass = drop(2),
    dirt = drop(2, "dirt");
  expect(sand.peak).toBeLessThan(rough.peak);
  expect(rough.peak).toBeLessThan(grass.peak);
  expect(grass.peak).toBeLessThan(dirt.peak);
});
it("a maximum drive reflects off a vertical bank without an artificial upward kick", () => {
  const g = flat(2, undefined, true);
  g.shoot("0", Math.PI / 2, 1);
  let reflected = false,
    peak = 0;
  for (let n = 0; n < 240 && g.state.moving; n++) {
    const before = g.ball.linvel();
    g.tick();
    const after = g.ball.linvel();
    peak = Math.max(peak, g.ball.translation().y);
    if (before.x > 1 && after.x < -1) {
      reflected = true;
      expect(Math.hypot(after.x, after.y, after.z)).toBeLessThan(
        Math.hypot(before.x, before.y, before.z),
      );
    }
  }
  expect(reflected).toBe(true);
  expect(peak).toBeLessThan(0.26);
});
it("restores a real 0.18 mid-shot snapshot and retains its original physical trace and full power", () => {
  expect(legacy.round.state).not.toHaveProperty("physics");
  expect(validateLocalRound(legacy.round)).toBe(true);
  const g = restoreLocalRound(legacy.round as LocalRound);
  games.push(g);
  expect(physicsEdition(g.state)).toBe(1);
  for (let n = 1; n <= 360; n++) {
    g.tick();
    const expected = legacy.trace.find((p) => p.frame === n);
    if (expected) {
      expect(g.state.players[0].pos.x).toBeCloseTo(expected.pos.x, 5);
      expect(g.state.players[0].pos.y).toBeCloseTo(expected.pos.y, 5);
      expect(g.state.players[0].pos.z).toBeCloseTo(expected.pos.z, 5);
      expect(g.state.moving).toBe(expected.moving);
      expect(g.state.players[0].strokes).toBe(expected.strokes);
    }
  }
  expect(g.shoot("0", 0, 1)).toBe(true);
  expect(-g.ball.linvel().z).toBeCloseTo(16.2);
});
it("keeps old and new records in independent stores without deleting either history", () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
  const old = {
    "sunset:classic": {
      best: 9,
      rounds: 2,
      date: "2026-11-01T00:00:00Z",
      goals: ["finish"],
    },
  };
  expect(persistPersonalRecords(old, 1)).toBe(true);
  const before = new Map(store);
  persistPersonalRecords({
    ...old,
    "sunset:classic": { ...old["sunset:classic"], best: 8 },
  });
  expect(readPersonalRecords(1)).toEqual(old);
  expect(readPersonalRecords()["sunset:classic"].best).toBe(8);
  expect(store.get("club-personal-normal-v7")).toBe(
    before.get("club-personal-normal-v7"),
  );
  const practice = {
    "0:classic": { best: 2, attempts: 3, date: "2026-11-01T00:00:00Z" },
  };
  persistPracticeRecords(practice, 1);
  persistPracticeRecords({});
  expect(readPracticeRecords(1)).toEqual(practice);
  expect(readPracticeRecords()).toEqual({});
});
