import { beforeAll, afterEach, it, expect } from "vitest";
import { Game, initPhysics } from "../shared/game";
import { uniqueCourses, getCircuit, getCourse } from "../shared/courses";
import { aceShots, aceRoundShots } from "./fixtures/aces";
beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => games.splice(0).forEach((g) => g.dispose()));
function game(hole: number) {
  const g = new Game();
  games.push(g);
  g.selectCircuit("aces");
  g.add("a", "Ana");
  g.startPractice(hole);
  return g;
}
function settle(g: Game) {
  for (let f = 0; f < 1200 && g.state.moving; f++) g.tick();
}
it("adds three distinct challenge holes without changing the 18 and 9 hole championship rounds", () => {
  expect(uniqueCourses).toHaveLength(21);
  expect(new Set(uniqueCourses).size).toBe(21);
  expect(getCircuit("tour").courses).toHaveLength(18);
  expect(getCircuit("nine").courses).toHaveLength(9);
  expect(getCircuit("aces").courses).toHaveLength(3);
  expect(getCircuit("aces").courses.every((c) => c.par === 3)).toBe(true);
});
it.each(aceShots)(
  "challenge $hole can genuinely be holed in one from its tee",
  ({ hole, wait, angle, power }) => {
    const g = game(hole);
    for (let i = 0; i < wait; i++) g.tick();
    expect(g.shoot("a", angle, power)).toBe(true);
    settle(g);
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[0].scores).toEqual([1]);
    expect(g.state.players[0].penalties).toBe(0);
    expect(g.state.players[0].capped).toEqual([]);
    expect(g.state.event?.outcome?.kind).toBe("ace");
    expect(g.state.players[0].pos.y).toBeLessThan(
      getCourse(g.state).cup.y - 0.28,
    );
  },
);
it("the carom ace actually contacts the right bank before dropping into the cup", () => {
  const g = game(1),
    shot = aceShots[1];
  g.shoot("a", shot.angle, shot.power);
  let banked = false;
  for (let i = 0; i < 1200 && g.state.moving; i++) {
    g.tick();
    if (g.state.players[0].pos.x > 6.7 && g.ball.linvel().x < 0) banked = true;
  }
  expect(banked).toBe(true);
  expect(g.state.players[0].scores).toEqual([1]);
});
it("an unsafe bridge miss costs one penalty but its wide alternative remains playable", () => {
  const g = game(0),
    tee = { ...g.state.players[0].pos };
  g.shoot("a", 0, 0.9);
  settle(g);
  expect(g.state.players[0].penalties).toBe(1);
  expect(g.state.players[0].strokes).toBe(2);
  expect(g.state.players[0].pos).toEqual(tee);
  for (const [a, p] of aceRoundShots[0]) {
    g.shoot("a", a, p);
    settle(g);
  }
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([6]);
  expect(g.state.players[0].capped).toEqual([]);
});
it("the complete challenge circuit has a penalty-free route beyond the ace attempts", () => {
  const g = game(0);
  g.start();
  for (let h = 0; h < 3; h++) {
    for (const [a, p] of aceRoundShots[h]) {
      expect(g.shoot("a", a, p)).toBe(true);
      settle(g);
    }
    expect(g.state.players[0].done).toBe(true);
    expect(g.state.players[0].penalties).toBe(0);
    if (h < 2) g.next();
  }
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([4, 4, 1]);
  expect(g.state.players[0].capped).toEqual([]);
});
it("the timed ace requires the opening rather than an automatic capture", () => {
  const g = game(2),
    s = aceShots[2];
  g.shoot("a", s.angle, s.power);
  settle(g);
  expect(g.state.players[0].scores).not.toEqual([1]);
});
it("nearby changes in angle and power do not all receive an automatic ace", () => {
  for (const shot of aceShots) {
    let aces = 0;
    for (const da of [-0.03, 0, 0.03])
      for (const dp of [-0.04, 0, 0.04]) {
        const g = game(shot.hole);
        for (let i = 0; i < shot.wait; i++) g.tick();
        g.shoot(
          "a",
          shot.angle + da,
          Math.min(1, Math.max(0.03, shot.power + dp)),
        );
        settle(g);
        if (
          g.state.players[0].scores[0] === 1 &&
          g.state.players[0].penalties === 0
        )
          aces++;
      }
    expect(aces).toBeGreaterThan(0);
    expect(aces).toBeLessThanOrEqual(5);
  }
});
