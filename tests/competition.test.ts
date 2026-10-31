import { beforeAll, afterEach, expect, it } from "vitest";
import { Game, initPhysics, ranking, total } from "../shared/game";
import {
  holePoints,
  confirmedPoints,
  matchRanking,
  matchPosition,
  pointsMatch,
} from "../shared/competition";
import type { MatchFormat } from "../shared/scoring";
import {
  captureLocalRound,
  restoreLocalRound,
  validateLocalRound,
} from "../src/localRound";
import { recordCompletedRound } from "../src/personalRecords";
import { recordPractice } from "../src/practiceRecords";
import { aceShots, aceRoundShots } from "./fixtures/aces";
beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => games.splice(0).forEach((g) => g.dispose()));
function make(format: MatchFormat = "stableford", players = 2) {
  const g = new Game();
  games.push(g);
  g.selectCircuit("aces");
  for (let i = 0; i < players; i++) g.add(String(i), ["Ana", "Luis"][i]);
  g.start(format);
  return g;
}
function settle(g: Game) {
  for (let n = 0; n < 1200 && g.state.moving; n++) g.tick();
}
it("calculates real Stableford points from par and actual strokes, without an arbitrary ace bonus", () => {
  expect([1, 2, 3, 4, 5, 6].map((strokes) => holePoints(strokes, 3))).toEqual([
    4, 3, 2, 1, 0, 0,
  ]);
  expect(holePoints(1, 5)).toBe(6);
  expect(holePoints(1, 7)).toBe(8);
});
it("rejects incomplete or invalid values and assigns zero to capped holes", () => {
  for (const value of [0, -1, 13, NaN, Infinity, 2.5])
    expect(holePoints(value, 3)).toBe(0);
  expect(holePoints(1, NaN)).toBe(0);
  expect(holePoints(1, 3, true)).toBe(0);
});
it("does not award points while the shot is still moving and counts a real cup exactly once", () => {
  const g = make();
  const p = g.state.players[0],
    shot = aceShots[0];
  expect(g.shoot("0", shot.angle, shot.power)).toBe(true);
  expect(confirmedPoints(p, g.state)).toBe(0);
  settle(g);
  expect(p.done).toBe(true);
  expect(confirmedPoints(p, g.state)).toBe(4);
  expect(g.shoot("1", shot.angle, shot.power)).toBe(true);
  settle(g);
  expect(g.state.phase).toBe("scores");
  expect(confirmedPoints(p, g.state)).toBe(4);
});
it("allows a strong hole to win more points despite a worse stroke total", () => {
  const g = make();
  g.state.phase = "finished";
  g.state.hole = 2;
  const [a, b] = g.state.players;
  a.scores = [1, 3, 9];
  b.scores = [3, 3, 4];
  expect(total(a)).toBeGreaterThan(total(b));
  expect(confirmedPoints(a, g.state)).toBe(6);
  expect(confirmedPoints(b, g.state)).toBe(5);
  expect(matchRanking(g.state)[0]).toBe(a);
});
it("breaks points ties with aces and shares the position when that also ties", () => {
  const g = make(),
    [a, b] = g.state.players;
  g.state.phase = "finished";
  g.state.hole = 2;
  a.scores = [1, 5, 5];
  a.aces = 1;
  b.scores = [3, 3, 5];
  expect(confirmedPoints(a, g.state)).toBe(confirmedPoints(b, g.state));
  expect(matchPosition(a, g.state)).toBe(1);
  expect(matchPosition(b, g.state)).toBe(2);
  b.scores = [...a.scores];
  b.aces = 1;
  expect(matchPosition(b, g.state)).toBe(1);
});
it("keeps withdrawn players behind active players regardless of their previous points", () => {
  const g = make(),
    [a, b] = g.state.players;
  a.scores = [1];
  b.scores = [5];
  a.withdrawn = true;
  expect(matchRanking(g.state)[0]).toBe(b);
  expect(matchPosition(a, g.state)).toBe(2);
});
it("preserves classic ranking for both explicit and legacy stroke states", () => {
  const g = make("strokes");
  g.state.players[0].strokes = 4;
  g.state.players[1].strokes = 2;
  expect(matchRanking(g.state)).toEqual(ranking(g.state.players));
  delete g.state.format;
  expect(pointsMatch(g.state)).toBe(false);
  expect(matchRanking(g.state)).toEqual(ranking(g.state.players));
});
it("validates the format and requires at least two players before starting the duel", () => {
  const g = new Game();
  games.push(g);
  g.add("0", "Ana");
  expect(() => g.start("stableford")).toThrow(/dos jugadores/);
  expect(g.state.phase).toBe("lobby");
  expect(() => g.start("other" as MatchFormat)).toThrow(/inválido/);
  g.start();
  expect(g.state.format).toBe("strokes");
});
it("saves and restores the competition format, confirmed points and active rival", () => {
  const g = make(),
    shot = aceShots[0];
  g.shoot("0", shot.angle, shot.power);
  settle(g);
  const saved = captureLocalRound(g, "pull"),
    restored = restoreLocalRound(saved);
  games.push(restored);
  expect(validateLocalRound(saved)).toBe(true);
  expect(restored.state.format).toBe("stableford");
  expect(restored.state.turn).toBe(1);
  expect(confirmedPoints(restored.state.players[0], restored.state)).toBe(4);
});
it("rejects an invalid saved format, a solo duel and a points practice while preserving legacy saves", () => {
  const saved = captureLocalRound(make(), "classic");
  expect(
    validateLocalRound({
      ...saved,
      state: { ...saved.state, format: "other" },
    }),
  ).toBe(false);
  expect(
    validateLocalRound({
      ...saved,
      state: { ...saved.state, players: saved.state.players.slice(0, 1) },
    }),
  ).toBe(false);
  expect(
    validateLocalRound({ ...saved, state: { ...saved.state, practice: true } }),
  ).toBe(false);
  const classic = captureLocalRound(make("strokes", 1), "classic");
  delete classic.state.format;
  expect(validateLocalRound(classic)).toBe(true);
});
it("completes a real two-player points tournament and preserves the format through recovery and replay", () => {
  let g = make();
  for (let hole = 0; hole < 3; hole++) {
    const used = [0, 0];
    while (g.state.phase === "playing") {
      const player = g.state.turn;
      let angle: number, power: number;
      if (hole < 2)
        [angle, power] =
          player === 0
            ? [aceShots[hole].angle, aceShots[hole].power]
            : aceRoundShots[hole][used[player]];
      else {
        const period = (Math.PI * 2) / 0.8;
        const wait = (0.5 - (g.state.time % period) + period) % period;
        for (let f = 0; f < Math.ceil(wait * 60); f++) g.tick();
        angle = aceShots[2].angle;
        power = aceShots[2].power;
      }
      expect(used[player]++).toBeLessThan(6);
      expect(g.shoot(String(player), angle, power)).toBe(true);
      settle(g);
    }
    if (hole < 2) {
      const restored = restoreLocalRound(captureLocalRound(g, "classic"));
      games.push(restored);
      g = restored;
      g.next();
    }
  }
  expect(g.state.phase).toBe("finished");
  expect(g.state.players[0].scores).toEqual([1, 1, 1]);
  expect(g.state.players[1].scores).toEqual([4, 4, 1]);
  expect(
    g.state.players.every((p) => p.penalties === 0 && !p.capped.length),
  ).toBe(true);
  expect(g.state.players.map((p) => confirmedPoints(p, g.state))).toEqual([
    12, 6,
  ]);
  expect(matchRanking(g.state)[0].name).toBe("Ana");
  g.start(g.state.format);
  expect(g.state.format).toBe("stableford");
  expect(confirmedPoints(g.state.players[0], g.state)).toBe(0);
});
it("keeps tee honours based on the fewer strokes even when both players earned zero points", () => {
  const g = make();
  g.state.phase = "scores";
  g.state.players.forEach((p, i) => {
    p.scores = [i === 0 ? 7 : 5];
    p.done = true;
    p.strokes = 0;
  });
  expect(g.state.players.map((p) => confirmedPoints(p, g.state))).toEqual([
    0, 0,
  ]);
  g.next();
  expect(g.state.turn).toBe(1);
  expect(g.state.format).toBe("stableford");
});
it("does not mix points games into personal stroke records or practice medals", () => {
  const g = make(),
    state = structuredClone(g.state);
  state.phase = "finished";
  state.hole = 2;
  state.players = state.players.slice(0, 1);
  state.players[0].scores = [1, 1, 1];
  state.players[0].done = true;
  expect(recordCompletedRound({}, state, "classic")).toBeNull();
  state.practice = true;
  state.hole = 0;
  state.players[0].scores = [1];
  expect(recordPractice({}, state, "classic")).toBeNull();
});
