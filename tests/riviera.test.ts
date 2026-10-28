import { beforeAll, afterEach, it, expect } from "vitest";
import { Game, initPhysics } from "../shared/game";
import { getCourse, rivieraCourses, geometry } from "../shared/courses";
import { shotVelocity, aimGuide } from "../shared/shot";
import { FixedStepper } from "../shared/timing";
import { normalizeServerUrl } from "../src/serverUrl";
beforeAll(initPhysics);
const games: Game[] = [];
function game(players = 2) {
  const g = new Game();
  games.push(g);
  g.selectCircuit("riviera");
  for (let i = 0; i < players; i++) g.add(String(i), "P" + i);
  g.start();
  return g;
}
afterEach(() => games.splice(0).forEach((g) => g.dispose()));
it("water adds exactly one penalty, restores the previous lie and advances the turn", () => {
  const g = game();
  const lie = { ...g.state.players[0].pos };
  g.shoot("0", 0, 0.5);
  g.ball.setTranslation({ x: 0, y: -0.15, z: 2 }, true);
  g.tick();
  expect(g.state.players[0].pos).toEqual(lie);
  expect(g.state.players[0].strokes).toBe(2);
  expect(g.state.players[0].penalties).toBe(1);
  expect(g.state.turn).toBe(1);
  expect(g.state.moving).toBe(false);
  expect(g.state.event?.kind).toBe("water");
  for (let i = 0; i < 60; i++) g.tick();
  expect(g.state.players[0].penalties).toBe(1);
});
it("a real bridge carries a ball across water and airborne balls are not penalized", () => {
  const g = game(1);
  g.state.players[0].pos = { x: -5, y: 0.22, z: 2 };
  g.place();
  g.shoot("0", 0, 0.1);
  for (let i = 0; i < 40; i++) g.tick();
  expect(g.state.players[0].penalties).toBe(0);
  expect(g.state.players[0].pos.y).toBeGreaterThan(0.15);
  g.ball.setTranslation({ x: 0, y: 2, z: 2 }, true);
  g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
  g.tick();
  expect(g.state.players[0].penalties).toBe(0);
  expect(g.state.moving).toBe(true);
});
it("sand dissipates more rolling energy than the fairway", () => {
  function run(x: number, z: number) {
    const g = game(1);
    g.state.players[0].pos = { x, y: 0.22, z };
    g.place();
    g.shoot("0", 0, 0.12);
    for (let i = 0; i < 40 && g.state.moving; i++) g.tick();
    return Math.abs(g.state.players[0].pos.z - z);
  }
  expect(run(6, -8)).toBeLessThan(run(-6, -8));
});
it("waits on a slope without drifting and starts the next shot at the saved lie", () => {
  const g = game(1);
  g.state.hole = 1;
  g.load();
  const lie = { x: 0, y: 2.02, z: 7 };
  g.state.players[0].pos = { ...lie };
  g.place();
  for (let i = 0; i < 180; i++) g.tick();
  expect(g.state.players[0].pos).toEqual(lie);
  g.shoot("0", 0, 0.2);
  expect(g.ball.translation()).toEqual(expect.objectContaining({ x: 0, z: 7 }));
  expect(g.ball.translation().y).toBeCloseTo(lie.y, 5);
});
it("normal shots have no vertical launch and use the same bounded speed", () => {
  const g = game(1);
  g.shoot("0", 0, 1);
  expect(g.ball.linvel().y).toBe(0);
  expect(Math.hypot(g.ball.linvel().x, g.ball.linvel().z)).toBeCloseTo(15.2);
  expect(shotVelocity(1, 0.5).y).toBe(0);
  expect(
    Math.hypot(shotVelocity(1, 0.5).x, shotVelocity(1, 0.5).z),
  ).toBeCloseTo(7);
});
it("direction guidance stays short and never predicts a landing or rebound", () => {
  const from = { x: 0, y: 0.22, z: 0 };
  for (const power of [0.03, 0.25, 0.5, 1]) {
    const guide = aimGuide(from, 0.6, power);
    expect(guide.points).toHaveLength(2);
    expect(
      Math.hypot(guide.points[1].x, guide.points[1].z),
    ).toBeLessThanOrEqual(2.401);
    expect(guide.points.every((p) => p.y === from.y)).toBe(true);
  }
});
it("uses the same fixed simulation duration across uneven render timings and caps long pauses", () => {
  const loop = new FixedStepper();
  let ticks = 0;
  for (const time of [
    0, 17, 43, 89, 150, 215, 300, 400, 520, 630, 740, 850, 1000,
  ])
    loop.advance(time, () => ticks++);
  expect(ticks).toBe(60);
  expect(loop.advance(100000, () => ticks++)).toBe(15);
  loop.reset(200000);
  expect(loop.advance(200000, () => ticks++)).toBe(0);
});
it("has longer courses with physical slopes and validates external server origins", () => {
  expect(rivieraCourses.map((c) => c.dimensions!.length)).toEqual([
    48, 54, 60, 60,
  ]);
  expect(
    geometry(rivieraCourses[1]).surfaces.some((b) => (b.rotation || 0) > 0),
  ).toBe(true);
  expect(normalizeServerUrl(" https://club.example/ ", true)).toBe(
    "https://club.example",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://user:pass@club.example",
    "https://club.example/socket.io",
    "http://club.example",
  ])
    expect(() => normalizeServerUrl(url, true)).toThrow();
});

it("completes all four Riviera holes from their tees, without repositioning or penalties", () => {
  const g = game(1);
  const routes = [
    [
      [-0.6947382761967033, 0.3],
      [5.877818513168, 0.5],
      [0.89695098496682, 0.4],
      [-0.04542562177051052, 0.65],
      [-0.0020321076083116693, 0.65],
      [0.9701825235329092, 0.8],
    ],
    [
      [0, 1],
      [0, 1],
      [0, 0.5],
      [0, 0.3],
      [0.2026833970057931, 1],
    ],
    [
      [0, 0.8],
      [0.2026833970057931, 0.8],
      [4.053667940115862, 0.3],
      [1.4187837790405518, 0.8],
      [0, 0.8],
      [-0.34301026820385344, 0.4],
      [0.029623796467516995, 0.65],
    ],
    [
      [0, 1],
      [0, 1],
      [3.141592653589793, 0.22],
      [-0.5894101733083764, 0.4],
      [-0.026290506530174423, 0.3],
      [5.269768322150621, 1],
      [1.0995647775248354, 0.8],
    ],
  ];
  let highest = 0;
  for (let hole = 0; hole < 4; hole++) {
    for (const [angle, power] of routes[hole]) {
      expect(g.shoot("0", angle, power)).toBe(true);
      for (let frame = 0; frame < 1200 && g.state.moving; frame++) {
        g.tick();
        highest = Math.max(highest, g.state.players[0].pos.y);
      }
    }
    expect(g.state.players[0].done).toBe(true);
    expect(g.state.players[0].penalties).toBe(0);
    if (hole < 3) g.next();
  }
  expect(highest).toBeGreaterThan(3.8);
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([6, 5, 7, 7]);
});
