import { getCircuit } from "./courses";
import type { State } from "./game";
export type Highlight = {
  id: string;
  title: string;
  players: string[];
  detail: string;
};
export function roundHighlights(state: State): Highlight[] {
  if (state.phase !== "finished" || state.practice) return [];
  const courses = getCircuit(state.circuit).courses;
  const players = state.players.filter(
    (p) =>
      !p.withdrawn &&
      p.done &&
      p.strokes === 0 &&
      p.scores.length === courses.length &&
      p.scores.every((n) => Number.isInteger(n) && n >= 1 && n <= 12),
  );
  if (!players.length) return [];
  const result: Highlight[] = [];
  const aces = (p: (typeof players)[number]) =>
    p.scores.filter((n, i) => n === 1 && !p.capped.includes(i)).length;
  const under = (p: (typeof players)[number]) =>
    p.scores.filter((n, i) => n < courses[i].par && !p.capped.includes(i))
      .length;
  for (const [id, title, value, noun] of [
    ["aces", "Más hoyos en uno", aces, "hoyos en uno"],
    ["under", "Más hoyos bajo par", under, "hoyos bajo par"],
  ] as const) {
    const best = Math.max(...players.map(value));
    if (best > 0)
      result.push({
        id,
        title,
        players: players.filter((p) => value(p) === best).map((p) => p.name),
        detail: `${best} ${best === 1 ? (id === "aces" ? "hoyo en uno" : "hoyo bajo par") : noun}`,
      });
  }
  const clean = players.filter(
    (p) => p.penalties === 0 && p.capped.length === 0,
  );
  if (clean.length)
    result.push({
      id: "clean",
      title: "Vuelta limpia",
      players: clean.map((p) => p.name),
      detail: "Sin penalizaciones ni límites",
    });
  return result;
}
