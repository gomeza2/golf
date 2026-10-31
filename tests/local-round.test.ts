import { beforeAll, afterEach, expect, it, vi } from "vitest";
import { Game, initPhysics } from "../shared/game";
import {
  captureLocalRound,
  validateLocalRound,
  restoreLocalRound,
  readLocalRound,
  persistLocalRound,
  discardLocalRound,
  LOCAL_ROUND_KEY,
} from "../src/localRound";
import { aceShots, aceRoundShots } from "./fixtures/aces";
import type { CircuitId } from "../shared/courses";
beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => {
  games.splice(0).forEach((g) => g.dispose());
  vi.unstubAllGlobals();
});
function make(circuit: CircuitId = "sunset", players = 1) {
  const g = new Game();
  games.push(g);
  g.selectCircuit(circuit);
  for (let i = 0; i < players; i++) g.add(String(i), ["Ana", "Luis"][i]);
  g.start();
  return g;
}
function resume(g: Game) {
  const round = JSON.parse(
    JSON.stringify(captureLocalRound(g, "pull", { angle: 1.2, power: 0.6 })),
  );
  expect(validateLocalRound(round)).toBe(true);
  const restored = restoreLocalRound(round);
  games.push(restored);
  return restored;
}
function settle(g: Game) {
  for (let i = 0; i < 1200 && g.state.moving; i++) g.tick();
}
function same(a: Game, b: Game) {
  expect(b.state).toEqual({ ...a.state, event: b.state.event });
  expect(b.ball.translation()).toEqual(a.ball.translation());
  expect(b.ball.linvel()).toEqual(a.ball.linvel());
}
it("restores a waiting turn, its remaining clock, names and locked control without elapsed real time", () => {
  const g = make("nine", 2);
  for (let i = 0; i < 300; i++) g.tick();
  const record = captureLocalRound(g, "pulse", { angle: 0.5, power: 0.3 });
  expect(record.control).toBe("pulse");
  expect(record.aim).toEqual({ angle: 0.5, power: 0.3 });
  const restored = restoreLocalRound(record);
  games.push(restored);
  same(g, restored);
  expect(restored.state.deadline - restored.state.time).toBeCloseTo(25);
  expect(restored.state.players.map((p) => p.name)).toEqual(["Ana", "Luis"]);
  for (let i = 0; i < 1510; i++) {
    g.tick();
    restored.tick();
  }
  same(g, restored);
  expect(restored.state.turn).toBe(1);
  expect(restored.state.players[0].penalties).toBe(1);
});
it("recovers a moving putt including exact Rapier velocity and collision state", () => {
  const g = make("sunset", 2);
  g.shoot("0", 0, 0.6);
  for (let i = 0; i < 35; i++) g.tick();
  const restored = resume(g);
  same(g, restored);
  while (g.state.moving) {
    g.tick();
    restored.tick();
    same(g, restored);
  }
  expect(restored.state.players[0].strokes).toBe(1);
  expect(restored.state.turn).toBe(1);
});
it("preserves moving obstacle phase and completes the same actual hole in one", () => {
  const g = make("aces");
  g.startPractice(2);
  const shot = aceShots[2];
  for (let i = 0; i < shot.wait; i++) g.tick();
  g.shoot("0", shot.angle, shot.power);
  for (let i = 0; i < 40; i++) g.tick();
  const restored = resume(g);
  while (g.state.moving) {
    g.tick();
    restored.tick();
    same(g, restored);
  }
  expect(restored.state.phase).toBe("finished");
  expect(restored.state.players[0].scores).toEqual([1]);
  expect(restored.state.players[0].aces).toBe(1);
});
it("resumes after physical cup entry without losing or duplicating the stroke", () => {
  const g = make("aces");
  g.startPractice(0);
  const shot = aceShots[0];
  g.shoot("0", shot.angle, shot.power);
  for (let i = 0; i < 1200 && g.capturedAt === null; i++) g.tick();
  expect(g.capturedAt).not.toBeNull();
  const restored = resume(g);
  settle(g);
  settle(restored);
  same(g, restored);
  expect(restored.state.players[0].scores).toEqual([1]);
});
it("keeps the pre-shot lie and counts exactly one water penalty after mid-shot recovery", () => {
  const g = make("aces");
  const tee = { ...g.state.players[0].pos };
  g.shoot("0", 0, 0.9);
  for (let i = 0; i < 25; i++) g.tick();
  const restored = resume(g);
  settle(g);
  settle(restored);
  same(g, restored);
  expect(restored.state.players[0]).toMatchObject({
    pos: tee,
    strokes: 2,
    penalties: 1,
  });
});
it("resumes a between-hole table and continues a real full circuit", () => {
  let g = make("aces");
  for (let hole = 0; hole < 3; hole++) {
    for (const [angle, power] of aceRoundShots[hole]) {
      expect(g.shoot("0", angle, power)).toBe(true);
      settle(g);
    }
    if (hole < 2) {
      expect(g.state.phase).toBe("scores");
      g = resume(g);
      g.next();
    }
  }
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([4, 4, 1]);
  expect(g.state.players[0].penalties).toBe(0);
});
it("does not recycle stale cup notifications when resuming the table", () => {
  const g = make("aces");
  const shot = aceShots[0];
  g.shoot("0", shot.angle, shot.power);
  settle(g);
  expect(g.state.event?.kind).toBe("cup");
  const restored = resume(g);
  expect(restored.state.event).toBeUndefined();
  expect(restored.eventSeq).toBe(g.eventSeq);
});
it("rejects bad versions, oversized data, invalid turns/scores, network games and corrupted physics", () => {
  const g = make();
  const valid = captureLocalRound(g, "classic");
  const mutations = [
    (r: any) => r.rules++,
    (r: any) => r.format++,
    (r: any) => (r.state.turn = 8),
    (r: any) => (r.state.code = "ABCDEF"),
    (r: any) => (r.state.players[0].scores = [-1]),
    (r: any) => (r.state.players[0].pos.y = null),
    (r: any) => (r.order = [0, 0]),
    (r: any) => (r.simulation.world = r.simulation.world.slice(4)),
    (r: any) => (r.simulation.world = "A".repeat(2_000_001)),
    (r: any) => (r.simulation.ball = null),
    (r: any) => (r.control = "lofted"),
    (r: any) => (r.aim.power = 2),
  ];
  for (const mutate of mutations) {
    const r = structuredClone(valid);
    mutate(r);
    expect(validateLocalRound(r)).toBe(false);
  }
  expect(validateLocalRound(null)).toBe(false);
  expect(() => restoreLocalRound({ ...valid, engine: "other" })).toThrow(
    /compatible/,
  );
});
it("persists one round, detects corrupt JSON and clears only recovery without touching preferences or records", () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  expect(readLocalRound().kind).toBe("empty");
  store.set("golf-control-mode", "pull");
  store.set("club-personal-normal-v7", "records");
  const round = captureLocalRound(make(), "pull");
  expect(persistLocalRound(round)).toBe(true);
  expect(readLocalRound()).toEqual({ kind: "saved", round });
  store.set(LOCAL_ROUND_KEY, "{broken");
  expect(readLocalRound().kind).toBe("invalid");
  expect(discardLocalRound()).toBe(true);
  expect(readLocalRound().kind).toBe("empty");
  expect(store.size).toBe(2);
});
it("handles browser storage denial without breaking live play", () => {
  const denied = () => {
    throw Error("denied");
  };
  vi.stubGlobal("localStorage", {
    getItem: denied,
    setItem: denied,
    removeItem: denied,
  });
  expect(readLocalRound().kind).toBe("unavailable");
  const g = make();
  expect(persistLocalRound(captureLocalRound(g, "classic"))).toBe(false);
  expect(discardLocalRound()).toBe(false);
  expect(g.shoot("0", 0, 0.2)).toBe(true);
  settle(g);
  expect(g.state.players[0].strokes).toBe(1);
});
