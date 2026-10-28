import { beforeAll, afterEach, it, expect } from "vitest";
import { Game, initPhysics } from "../shared/game";
import { pullShot, pulseShot } from "../src/shotControls";
beforeAll(initPhysics);
const games: Game[] = [];
function game() {
  const g = new Game();
  games.push(g);
  g.add("a", "A");
  g.start();
  return g;
}
afterEach(() => games.splice(0).forEach((g) => g.dispose()));
it("grass absorbs a landing instead of bouncing the ball repeatedly", () => {
  const g = game();
  g.shoot("a", 0, 0.05);
  g.ball.setTranslation({ x: -3, y: 2, z: 9 }, true);
  g.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
  let landed = false,
    peak = 0;
  for (let i = 0; i < 150; i++) {
    g.tick();
    const p = g.ball.translation();
    if (p.y < 0.24 && Math.abs(g.ball.linvel().y) < 0.2) landed = true;
    if (landed) peak = Math.max(peak, p.y);
  }
  expect(landed).toBe(true);
  expect(peak).toBeLessThan(0.26);
});
it("a static bank reflects a shot while losing energy", () => {
  const g = game();
  g.shoot("a", 0, 0.7);
  let before = 0,
    after = 0;
  for (let i = 0; i < 150 && g.state.moving; i++) {
    const v = g.ball.linvel();
    g.tick();
    if (v.z < -0.5 && g.ball.linvel().z > 0.5) {
      before = -v.z;
      after = g.ball.linvel().z;
      break;
    }
  }
  expect(after).toBeGreaterThan(0.5);
  expect(after).toBeLessThan(before * 0.8);
});
it("a small putt settles promptly without small endless rebounds", () => {
  const g = game();
  g.shoot("a", Math.PI / 2, 0.06);
  let steps = 0;
  while (g.state.moving && steps++ < 300) g.tick();
  expect(g.state.moving).toBe(false);
  expect(steps).toBeLessThan(180);
});
it("a backwards drag produces opposite direction and bounded power", () => {
  expect(pullShot(0, 90, 0)).toMatchObject({
    angle: 0,
    power: 0.5,
    valid: true,
  });
  expect(pullShot(90, 0, 0).angle).toBeCloseTo(-Math.PI / 2);
  expect(pullShot(0, 900, 0).power).toBe(1);
  expect(pullShot(1, 2, 0).valid).toBe(false);
  expect(pullShot(0, 90, Math.PI / 2).angle).toBeCloseTo(Math.PI / 2);
});
it("pulse is deterministic, time based and never exceeds accepted angle/power limits", () => {
  const samples = Array.from({ length: 100 }, (_, i) => pulseShot(i * 45, 1));
  expect(pulseShot(750, 1).power).toBeCloseTo(1);
  expect(pulseShot(1500, 1).power).toBeCloseTo(0.04);
  for (const shot of samples) {
    expect(shot.power).toBeGreaterThanOrEqual(0.03);
    expect(shot.power).toBeLessThanOrEqual(1);
    expect(Math.abs(shot.angle - 1)).toBeLessThanOrEqual(0.120001);
  }
  expect(pulseShot(620, 1)).toEqual(pulseShot(620, 1));
});
