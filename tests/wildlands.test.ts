import { afterEach, beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { Game, initPhysics, ranking, total } from "../shared/game";
import { getCircuit, wildCourses } from "../shared/courses";
import {
  captureLocalRound,
  restoreLocalRound,
  validateLocalRound,
} from "../src/localRound";
import { practiceKey } from "../src/practiceRecords";
import {
  wildSafeShots,
  wildRiskShots,
  wildRidgeShots,
  type WildShot,
} from "./fixtures/wild";

beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => games.splice(0).forEach((g) => g.dispose()));
function create(hole?: number, players = 1) {
  const g = new Game();
  games.push(g);
  g.selectCircuit("wildlands");
  for (let i = 0; i < players; i++) g.add(String(i), i ? "Riesgo" : "Seguro");
  if (hole === undefined) g.start();
  else g.startPractice(hole);
  return g;
}
function settle(g: Game) {
  let n = 0;
  while (g.state.moving && n++ < 1200) g.tick();
  expect(g.state.moving).toBe(false);
  expect(n).toBeLessThan(1200);
}
function fire(g: Game, shot: WildShot, wait = true) {
  if (wait) for (let n = 0; n < shot[2]; n++) g.tick();
  expect(g.shoot(g.state.players[g.state.turn].id, shot[0], shot[1])).toBe(
    true,
  );
  expect(g.ball.linvel().y).toBe(0);
  settle(g);
}
it("appends large distinct open fields without changing existing practice identities or the 9/18 rounds", () => {
  expect(getCircuit("wildlands").courses).toBe(wildCourses);
  expect(wildCourses.map((c) => c.routeLength)).toEqual([94, 160, 90]);
  expect(
    wildCourses.every((c) => c.outerWalls === false && c.water?.length),
  ).toBe(true);
  expect(wildCourses.map((c) => c.start.y)).toEqual([0.24, 8.24, 0.24]);
  expect(wildCourses[2].blocks.filter((b) => b.moving)).toHaveLength(2);
  expect(practiceKey("cumbres", 2, "classic")).toBe("34:classic");
  expect(practiceKey("wildlands", 0, "classic")).toBe("35:classic");
  expect(getCircuit("tour").courses).toHaveLength(18);
  expect(getCircuit("nine").courses).toHaveLength(9);
});
it("has real open water gaps and physically open cups in all three fields", () => {
  const gaps = [
    [0, 20],
    [0, 24],
    [10, 8],
  ];
  for (let h = 0; h < 3; h++) {
    const g = create(h),
      c = wildCourses[h],
      [x, z] = gaps[h];
    g.tick(); // Populate Rapier's spatial query pipeline before inspecting it.
    expect(
      g.world.castRay(
        new R.Ray({ x, y: 20, z }, { x: 0, y: -1, z: 0 }),
        40,
        true,
      ),
    ).toBeNull();
    const cup = g.world.castRay(
      new R.Ray(
        { x: c.cup.x + 0.18, y: c.cup.y + 1, z: c.cup.z },
        { x: 0, y: -1, z: 0 },
      ),
      3,
      true,
    );
    expect(cup).not.toBeNull();
    expect(cup!.timeOfImpact).toBeGreaterThan(1.4);
  }
});
it.each([
  ["wide", wildSafeShots, [5, 7, 6]],
  ["risk", wildRiskShots, [3, 4, 4]],
] as const)(
  "completes the full %s route with physical strokes and no penalties",
  (_, routes, scores) => {
    const g = create();
    for (let h = 0; h < 3; h++) {
      for (const shot of routes[h]) fire(g, shot);
      expect(g.state.players[0].done).toBe(true);
      expect(g.state.players[0].penalties).toBe(0);
      expect(g.state.players[0].capped).toEqual([]);
      if (h < 2) g.next();
    }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[0].scores).toEqual(scores);
  },
);
it("also completes the elevated delta route, avoiding both moving mechanisms", () => {
  const g = create(2);
  for (const shot of wildRidgeShots[0]) fire(g, shot);
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([6]);
  expect(g.state.players[0].penalties).toBe(0);
});
it("a weak jump falls into real water, counts one penalty and allows a successful recovery", () => {
  const g = create(0);
  fire(g, wildRiskShots[0][0]);
  const lie = { ...g.state.players[0].pos };
  fire(g, [wildRiskShots[0][1][0], 0.85, 0]);
  expect(g.state.players[0].penalties).toBe(1);
  expect(g.state.players[0].strokes).toBe(3);
  expect(g.state.players[0].pos).toEqual(lie);
  expect(g.state.event?.kind).toBe("water");
  expect(
    Math.abs(g.state.event!.pos.y - wildCourses[0].water![0].y),
  ).toBeLessThan(0.05);
  fire(g, wildRiskShots[0][1]);
  fire(g, wildRiskShots[0][2]);
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([5]);
});
it("saves and restores a real airborne drive without changing the landing or its edition", () => {
  const g = create(0);
  fire(g, wildRiskShots[0][0]);
  expect(g.shoot("0", wildRiskShots[0][1][0], 1)).toBe(true);
  for (let n = 0; n < 85; n++) g.tick();
  expect(g.ball.translation().y).toBeGreaterThan(2);
  const saved = captureLocalRound(g, "classic");
  expect(saved.format).toBe(2);
  expect(validateLocalRound({ ...saved, format: 1 })).toBe(false);
  expect(saved.state.physics).toBe(2);
  expect(
    validateLocalRound({ ...saved, state: { ...saved.state, physics: 3 } }),
  ).toBe(false);
  const restored = restoreLocalRound(saved);
  games.push(restored);
  while (g.state.moving) {
    g.tick();
    restored.tick();
    expect(restored.state.players[0].pos).toEqual(g.state.players[0].pos);
  }
  expect(restored.state.physics).toBe(2);
  expect(restored.state.players[0].penalties).toBe(0);
  fire(g, wildRiskShots[0][2]);
  fire(restored, wildRiskShots[0][2]);
  expect(restored.state.players[0].scores).toEqual([3]);
});
it("plays a complete two-player contest with different strategies and honours for the lower score", () => {
  const g = create(undefined, 2);
  for (let h = 0; h < 3; h++) {
    const used = [0, 0];
    if (h) expect(g.state.turn).toBe(1);
    while (g.state.phase === "playing") {
      const player = g.state.turn,
        index = used[player]++;
      const routes = player ? wildRiskShots : wildSafeShots;
      expect(index).toBeLessThan(routes[h].length);
      if (
        h === 2 &&
        ((player === 0 && index === 2) || (player === 1 && index === 1))
      ) {
        // Observe a repeatable opening and advance real simulation time. No
        // obstacle positions, ball coordinates or scores are injected.
        const offset = player ? 1.5 : 0.8,
          target = player ? 1.0174 : 0.911;
        let frames = 0;
        while (
          Math.abs(((g.state.time * 0.8 + offset) % (2 * Math.PI)) - target) >
            0.02 &&
          frames++ < 480
        )
          g.tick();
        expect(frames).toBeLessThan(480);
      }
      const shot = routes[h][index];
      expect(g.shoot(String(1 - player), shot[0], shot[1])).toBe(false);
      fire(g, shot, false);
    }
    expect(
      g.state.players.every((p) => p.penalties === 0 && p.capped.length === 0),
    ).toBe(true);
    if (h < 2) g.next();
  }
  expect(g.state.players.map(total)).toEqual([18, 11]);
  expect(ranking(g.state.players)[0].name).toBe("Riesgo");
});
