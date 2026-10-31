import { beforeAll, afterEach, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Game, initPhysics } from "../shared/game";
import { roundHighlights } from "../shared/highlights";
import { FinalPodium } from "../src/FinalPodium";
import { reconnectGrace, shouldWithdraw } from "../server/disconnections";
beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => games.splice(0).forEach((game) => game.dispose()));
function make() {
  const game = new Game();
  games.push(game);
  game.selectCircuit("aces");
  game.add("0", "Ana");
  game.add("1", "Luis");
  return game;
}
function finished() {
  const game = make();
  game.start("stableford");
  game.state.phase = "finished";
  game.state.hole = 2;
  game.state.players.forEach((p, i) => {
    p.done = true;
    p.strokes = 0;
    p.scores = i === 0 ? [1, 1, 1] : [4, 4, 1];
    p.aces = i === 0 ? 3 : 1;
  });
  return game;
}
it("lets a lobby choose points, resets readiness on change and starts the selected format", () => {
  const game = make();
  game.state.players.forEach((p) => (p.ready = true));
  game.selectFormat("stableford");
  expect(game.state.players.every((p) => !p.ready)).toBe(true);
  game.start();
  expect(game.state.format).toBe("stableford");
});
it("does not cancel readiness on a repeated selection and blocks changes after starting", () => {
  const game = make();
  game.selectFormat("stableford");
  game.state.players.forEach((p) => (p.ready = true));
  game.selectFormat("stableford");
  expect(game.state.players.every((p) => p.ready)).toBe(true);
  game.start();
  expect(() => game.selectFormat("strokes")).toThrow(/antes de comenzar/);
});
it("forces a practice back to strokes even when points were selected in the lobby", () => {
  const game = new Game();
  games.push(game);
  game.add("0", "Ana");
  game.selectFormat("stableford");
  game.startPractice(0);
  expect(game.state.format).toBe("strokes");
  expect(game.state.practice).toBe(true);
});
it("keeps a bounded, explicit reconnection grace and defaults invalid configuration to ninety seconds", () => {
  for (const raw of [undefined, "", "bad", "0", "-1", "301", "1.5"])
    expect(reconnectGrace(raw)).toBe(90);
  expect(reconnectGrace("1")).toBe(1);
  expect(reconnectGrace("90")).toBe(90);
  expect(reconnectGrace("300")).toBe(300);
});
it("retires a lost active player at the grace deadline and never before it", () => {
  const lost = { connected: false, withdrawn: false };
  expect(shouldWithdraw(lost, "playing", 1000, 90999, 90000)).toBe(false);
  expect(shouldWithdraw(lost, "playing", 1000, 91000, 90000)).toBe(true);
  expect(shouldWithdraw(lost, "scores", 1000, 91000, 90000)).toBe(true);
});
it("does not retire a returned player, a waiting lobby, a finished match or a player already withdrawn", () => {
  const lost = { connected: false, withdrawn: false };
  for (const phase of ["lobby", "finished"] as const)
    expect(shouldWithdraw(lost, phase, 0, 100000, 90000)).toBe(false);
  expect(
    shouldWithdraw({ ...lost, connected: true }, "playing", 0, 100000, 90000),
  ).toBe(false);
  expect(
    shouldWithdraw({ ...lost, withdrawn: true }, "playing", 0, 100000, 90000),
  ).toBe(false);
  expect(shouldWithdraw(lost, "playing", undefined, 100000, 90000)).toBe(false);
});
it("derives shared highlights from completed real scores, rather than trusting an ace counter", () => {
  const game = finished();
  game.state.players[1].aces = 99;
  const awards = roundHighlights(game.state);
  expect(awards.find((a) => a.id === "aces")).toMatchObject({
    players: ["Ana"],
    detail: "3 hoyos en uno",
  });
  expect(awards.find((a) => a.id === "under")).toMatchObject({
    players: ["Ana"],
    detail: "3 hoyos bajo par",
  });
  expect(awards.find((a) => a.id === "clean")?.players).toEqual([
    "Ana",
    "Luis",
  ]);
});
it("does not award clean rounds to capped or penalized players, or award anything to withdrawals", () => {
  const game = finished(),
    [a, b] = game.state.players;
  a.capped = [0];
  a.penalties = 1;
  b.withdrawn = true;
  const awards = roundHighlights(game.state);
  expect(awards.some((award) => award.id === "clean")).toBe(false);
  expect(awards.every((award) => !award.players.includes("Luis"))).toBe(true);
  expect(awards.find((award) => award.id === "aces")?.detail).toBe(
    "2 hoyos en uno",
  );
});
it("renders the winner and actual points in the final podium and preserves shared first places", () => {
  const game = finished();
  let markup = renderToStaticMarkup(
    createElement(FinalPodium, { state: game.state }),
  );
  expect(markup).toContain("Podio del club");
  expect(markup).toContain("12 pt");
  expect(markup).toContain("6 pt");
  expect(markup.indexOf("Ana")).toBeLessThan(markup.indexOf("Luis"));
  game.state.players[1].scores = [1, 1, 1];
  game.state.players[1].aces = 3;
  markup = renderToStaticMarkup(
    createElement(FinalPodium, { state: game.state }),
  );
  expect(markup.match(/podium-place place-1/g)).toHaveLength(2);
});
it("hides the podium and highlights for incomplete, practice and fully withdrawn matches", () => {
  const game = finished();
  game.state.phase = "scores";
  expect(roundHighlights(game.state)).toEqual([]);
  expect(
    renderToStaticMarkup(createElement(FinalPodium, { state: game.state })),
  ).toBe("");
  game.state.phase = "finished";
  game.state.practice = true;
  expect(roundHighlights(game.state)).toEqual([]);
  expect(
    renderToStaticMarkup(createElement(FinalPodium, { state: game.state })),
  ).toBe("");
  game.state.practice = false;
  game.state.players.forEach((p) => (p.withdrawn = true));
  expect(roundHighlights(game.state)).toEqual([]);
  expect(
    renderToStaticMarkup(createElement(FinalPodium, { state: game.state })),
  ).toBe("");
});
