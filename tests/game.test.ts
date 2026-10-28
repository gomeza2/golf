import { beforeAll, describe, it, expect, afterEach } from "vitest";
import {
  Game,
  initPhysics,
  ranking,
  MAX_STROKES,
  total,
  canStart,
  position,
} from "../shared/game";
import { courses, getCourse, geometry } from "../shared/courses";
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
        [5.877818513168, 1],
        [0.7004962396096744, 0.22],
      ],
      [[0.16514867741462683, 0.8]],
      [
        [5.675135116162207, 1],
        [0.0916344530121638, 0.22],
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
    expect(g.state.players[0].scores).toEqual([2, 1, 2]);
  });
  it("moves rotating obstacle colliders", () => {
    const g = make();
    g.state.hole = 2;
    g.load();
    for (let i = 0; i < 60; i++) g.tick();
    expect(Math.abs(g.bars[0].rotation().y)).toBeGreaterThan(0.1);
  });
});

describe("circuits and session lifecycle", () => {
  it("requires two connected prepared players, and circuit changes clear readiness", () => {
    const g = new Game();
    games.push(g);
    const a = g.add("a", "Ana"),
      b = g.add("b", "Beto"),
      c = g.add("c", "Cris");
    a.ready = b.ready = true;
    c.connected = false;
    expect(canStart(g.state)).toBe(true);
    g.selectCircuit("moonlight");
    expect(g.state.players.every((p) => !p.ready)).toBe(true);
    expect(canStart(g.state)).toBe(false);
    g.removeFromLobby("c");
    expect(g.state.players).toHaveLength(2);
    a.ready = b.ready = true;
    expect(canStart(g.state)).toBe(true);
    g.start();
    expect(getCourse(g.state).name).toBe("Las diagonales");
    expect(() => g.selectCircuit("sunset")).toThrow();
  });
  it("removes guests who leave the lobby and transfers host ownership", () => {
    const g = new Game();
    games.push(g);
    g.add("a", "Ana");
    g.add("b", "Beto");
    g.withdraw("a");
    expect(g.state.players.map((p) => p.id)).toEqual(["b"]);
    expect(g.state.host).toBe("b");
  });
  it("forfeits a moving player immediately and skips their future turns", () => {
    const g = make();
    g.shoot("0", 0, 0.5);
    g.withdraw("0");
    expect(g.state.moving).toBe(false);
    expect(g.state.turn).toBe(1);
    expect(g.state.players[0].withdrawn).toBe(true);
    expect(g.state.players[0].strokes).toBe(12);
    let guard = 0;
    while (g.state.phase !== "finished" && guard++ < 50) {
      if (g.state.phase === "scores") g.next();
      else {
        g.state.time = g.state.deadline + 1;
        g.tick();
      }
    }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[0].scores).toEqual([12, 12, 12]);
    expect(ranking(g.state.players)[0].id).toBe("1");
  });
  it("ends an entirely abandoned match and allows a fresh lobby after a completed game", () => {
    const g = make();
    g.withdraw("0");
    g.withdraw("1");
    expect(g.state.phase).toBe("finished");
    expect(g.state.players.every((p) => p.scores.length === 3)).toBe(true);
    const h = make();
    h.state.phase = "finished";
    h.returnToLobby();
    h.selectCircuit("moonlight");
    expect(
      h.state.players.every((p) => !p.ready && p.scores.length === 0),
    ).toBe(true);
    expect(h.state.phase).toBe("lobby");
  });
  it("preserves ties in displayed positions and places withdrawals after finishers", () => {
    const g = make(3);
    for (const p of g.state.players) p.scores = [4];
    g.state.players[2].withdrawn = true;
    expect(position(g.state.players[0], g.state.players)).toBe(1);
    expect(position(g.state.players[1], g.state.players)).toBe(1);
    expect(position(g.state.players[2], g.state.players)).toBe(3);
  });
  it("uses shared geometry and physically translates the lunar gates", () => {
    const g = new Game();
    games.push(g);
    g.selectCircuit("moonlight");
    g.add("a", "Ana");
    g.start();
    g.state.hole = 1;
    g.load();
    const x = g.bars[0].translation().x;
    for (let i = 0; i < 90; i++) g.tick();
    expect(Math.abs(g.bars[0].translation().x - x)).toBeGreaterThan(1);
    expect(g.bars[0].rotation().y).toBe(0);
    const shape = geometry(getCourse(g.state));
    expect(shape.walls.every((w) => w.size[1] === 0.9)).toBe(true);
  });
});

it("plays the complete lunar circuit from the tees, including live sliding gates", () => {
  const g = new Game();
  games.push(g);
  g.selectCircuit("moonlight");
  g.add("a", "Ana");
  g.start();
  const routes = [
    [
      [5.675135116162207, 1],
      [-0.9946713645749212, 0.15],
    ],
    [
      [0.6080501910173793, 1],
      [1.2571460423292329, 0.15],
    ],
    [
      [0.4053667940115862, 1],
      [-2.1035202396793387, 0.22],
    ],
  ];
  for (let hole = 0; hole < 3; hole++) {
    for (const [angle, power] of routes[hole]) {
      expect(g.shoot("a", angle, power)).toBe(true);
      settle(g);
    }
    expect(g.state.players[0].done).toBe(true);
    if (hole < 2) g.next();
  }
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([2, 2, 2]);
});

it("plays all larger park holes from the tees without repositioning", () => {
  const g = new Game();
  games.push(g);
  g.selectCircuit("park");
  g.add("a", "Ana");
  g.start();
  const routes = [
    [
      [5.877818513168, 1],
      [2.6348841610753104, 1],
      [-1.2093491188511798, 0.15],
    ],
    [
      [0.8107335880231724, 1],
      [0.4188573949464391, 0.4],
    ],
    [
      [5.877818513168, 1],
      [1.7573092070873253, 0.4],
    ],
  ];
  for (let hole = 0; hole < 3; hole++) {
    for (const [angle, power] of routes[hole]) {
      expect(g.shoot("a", angle, power)).toBe(true);
      settle(g);
    }
    expect(g.state.players[0].done).toBe(true);
    if (hole < 2) g.next();
  }
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([3, 2, 2]);
});

it("drops through a real opening and keeps the camera's turn during the fall", () => {
  const g = make();
  const cup = getCourse(g.state).cup;
  g.state.players[0].pos = { x: cup.x, y: cup.y + 0.22, z: cup.z + 0.25 };
  g.place();
  g.shoot("0", 0, 0.03);
  g.tick();
  expect(g.state.players[0].done).toBe(false);
  expect(g.state.turn).toBe(0);
  let belowRim = false;
  for (let i = 0; i < 240 && g.state.moving; i++) {
    g.tick();
    if (g.state.players[0].pos.y < cup.y - 0.28) {
      belowRim = true;
      if (!g.state.players[0].done) expect(g.state.turn).toBe(0);
    }
  }
  expect(belowRim).toBe(true);
  expect(g.state.players[0].done).toBe(true);
  expect(g.state.turn).toBe(1);
});

it("lets a fast putt cross the opening instead of automatically capturing it", () => {
  const g = make(1),
    cup = getCourse(g.state).cup;
  g.state.players[0].pos = { x: cup.x, y: cup.y + 0.22, z: cup.z + 1 };
  g.place();
  g.shoot("0", 0, 1);
  for (let i = 0; i < 10; i++) g.tick();
  expect(g.state.players[0].pos.z).toBeLessThan(cup.z - 0.5);
  expect(g.state.players[0].done).toBe(false);
  expect(g.state.moving).toBe(true);
});
