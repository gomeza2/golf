import { getCircuit } from "./courses";
import { ranking, total, type Player, type State } from "./game";
export const pointsMatch = (state: State) =>
  state.format === "stableford" && !state.practice;
export function holePoints(strokes: number, par: number, capped = false) {
  if (
    capped ||
    !Number.isInteger(strokes) ||
    strokes < 1 ||
    strokes > 12 ||
    !Number.isInteger(par) ||
    par < 1 ||
    par > 12
  )
    return 0;
  return Math.max(0, 2 + par - strokes);
}
/** Only completed holes earn points, including a finished current lie. */
export function confirmedPoints(player: Player, state: State) {
  const courses = getCircuit(state.circuit).courses;
  const score = player.scores.reduce(
    (sum, strokes, i) =>
      sum + holePoints(strokes, courses[i]?.par, player.capped.includes(i)),
    0,
  );
  return (
    score +
    (state.phase === "playing" &&
    player.done &&
    player.scores.length === state.hole
      ? holePoints(
          player.strokes,
          courses[state.hole].par,
          player.capped.includes(state.hole),
        )
      : 0)
  );
}
export function matchRanking(state: State) {
  if (!pointsMatch(state)) return ranking(state.players);
  return [...state.players].sort(
    (a, b) =>
      Number(a.withdrawn) - Number(b.withdrawn) ||
      confirmedPoints(b, state) - confirmedPoints(a, state) ||
      b.aces - a.aces,
  );
}
export function matchPosition(player: Player, state: State) {
  const points = pointsMatch(state),
    value = points ? confirmedPoints(player, state) : total(player);
  return (
    matchRanking(state).findIndex(
      (p) =>
        p.withdrawn === player.withdrawn &&
        (points ? confirmedPoints(p, state) : total(p)) === value &&
        p.aces === player.aces,
    ) + 1
  );
}
