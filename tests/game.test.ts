import { beforeAll, describe, it, expect, afterEach } from "vitest";
import { Game, initPhysics, ranking, MAX_STROKES, total } from "../shared/game";
import { courses } from "../shared/courses";
beforeAll(async () => {
  await initPhysics();
});
const games: Game[] = [];
const make = (n = 2) => {
  const g = new Game();
  games.push(g);
  for (let i = 0; i < n; i++) g.add(String(i), "P" + i);
  g.start();
  return g;
};
afterEach(() => games.splice(0).forEach((g) => g.dispose()));
function settle(g: Game) {
  for (let i = 0; i < 1200 && g.state.moving; i++) g.tick();
}
describe("authoritative rules and physics", () => {
  it("rejects out of turn, invalid power, NaN and duplicate shots", () => {
    const g = make();
    expect(g.shoot("1", 0, 0.5)).toBe(false);
    expect(g.shoot("0", NaN, 0.5)).toBe(false);
    expect(g.shoot("0", 0, 2)).toBe(false);
    expect(g.shoot("0", 0, 0.4)).toBe(true);
    expect(g.shoot("0", 0, 0.4)).toBe(false);
    expect(g.state.players[0].strokes).toBe(1);
    settle(g);
    expect(g.state.turn).toBe(1);
  });
  it("collides with the garden crosswall, dissipates energy and stops", () => {
    const g = make(1);
    g.shoot("0", 0, 0.45);
    let bounced = false;
    for (let i = 0; i < 1100 && g.state.moving; i++) {
      g.tick();
      if (g.ball.linvel().z > 1) bounced = true;
    }
    expect(bounced).toBe(true);
    expect(g.state.moving).toBe(false);
    expect(g.state.players[0].pos.z).toBeGreaterThan(2);
  });
  it("climbs a real ramp and reaches the elevated platform", () => {
    const g = make(1);
    g.state.hole = 1;
    g.load();
    g.shoot("0", 0, 0.95);
    let high = 0;
    for (let i = 0; i < 1100 && g.state.moving; i++) {
      g.tick();
      high = Math.max(high, g.state.players[0].pos.y);
    }
    expect(high).toBeGreaterThan(2.5);
  });
  it("captures the cup, skips finished players and records every hole", () => {
    const g = make();
    for (let hole = 0; hole < 3; hole++) {
      const cup = courses[hole].cup;
      for (let player = 0; player < 2; player++) {
        const p = g.state.players[g.state.turn];
        p.pos = { x: cup.x, y: cup.y + 0.23, z: cup.z + 0.25 };
        g.place();
        expect(g.shoot(p.id, 0, 0.03)).toBe(true);
        settle(g);
        expect(p.done).toBe(true);
      }
      expect(g.state.players.map((p) => p.scores[hole])).toEqual([1, 1]);
      if (hole < 2) {
        expect(g.state.phase).toBe("scores");
        g.next();
      }
    }
    expect(g.state.phase).toBe("finished");
    expect(total(g.state.players[0])).toBe(3);
    g.start();
    expect(g.state.players[0].scores).toEqual([]);
    expect(g.state.hole).toBe(0);
  });
  it("recovers an out-of-bounds ball with a penalty", () => {
    const g = make();
    g.shoot("0", 0, 0.5);
    g.ball.setTranslation({ x: 8, y: -5, z: 0 }, true);
    g.tick();
    expect(g.state.players[0].strokes).toBe(2);
    expect(g.state.players[0].pos.x).toBe(courses[0].start.x);
    expect(g.state.turn).toBe(1);
  });
  it("timeouts cannot block a complete match, including disconnected players", () => {
    const g = make();
    g.state.players[1].connected = false;
    let guard = 0;
    while (g.state.phase !== "finished" && guard++ < 200) {
      if (g.state.phase === "scores") g.next();
      else {
        g.state.time = g.state.deadline + 1;
        g.tick();
      }
    }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[1].scores).toEqual([
      MAX_STROKES,
      MAX_STROKES,
      MAX_STROKES,
    ]);
  });
  it("ranks by strokes and then aces, retaining shared ties", () => {
    const g = make(3);
    g.state.players[0].scores = [4];
    g.state.players[1].scores = [3];
    g.state.players[2].scores = [3];
    g.state.players[2].aces = 1;
    expect(ranking(g.state.players).map((p) => p.id)).toEqual(["2", "1", "0"]);
  });
  it("plays all three courses from their tees with real shots and no repositioning", () => {
    const g = make(1);
    const routes = [
      [
        [0.7388912086550111, 0.45],
        [0.0017500320640545734, 0.45],
        [-1.530132719264862, 0.5],
        [-0.010343992699326987, 0.65],
        [1.2943886688811341, 0.35],
      ],
      [[0.3217505543966422, 0.95]],
      [
        [1.1050527371260164, 0.4],
        [0.31765242196413535, 0.55],
        [-0.8969301185932816, 0.85],
        [0.4295723739678189, 0.05],
      ],
    ];
    for (let hole = 0; hole < 3; hole++) {
      for (const [angle, power] of routes[hole]) {
        expect(g.shoot("0", angle, power)).toBe(true);
        settle(g);
      }
      expect(g.state.players[0].done).toBe(true);
      expect(g.state.players[0].scores[hole]).toBe(routes[hole].length);
      if (hole < 2) g.next();
    }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[0].scores).toEqual([5, 1, 4]);
  });
  it("moves rotating obstacle colliders", () => {
    const g = make();
    g.state.hole = 2;
    g.load();
    for (let i = 0; i < 60; i++) g.tick();
    expect(Math.abs(g.bars[0].rotation().y)).toBeGreaterThan(0.1);
  });
});
