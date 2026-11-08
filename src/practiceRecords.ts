import { RULES_VERSION, type PhysicsEdition } from "../shared/rules";
import {
  getCourse,
  getCircuit,
  isCircuitId,
  practiceLayouts,
  type CircuitId,
} from "../shared/courses";
import type { State } from "../shared/game";
import { isControlMode, type ControlMode } from "./shotControls";
const storageKey = (physics: PhysicsEdition) =>
  `club-practice-v${RULES_VERSION}${physics === 2 ? "-p2" : ""}`;
export const PRACTICE_KEY = storageKey(2);
export type PracticeBest = { best: number; attempts: number; date: string };
export type PracticeHistory = Record<string, PracticeBest>;
export type PracticeReport = {
  score: number;
  best: number;
  improved: boolean;
  medal: string;
  persisted?: boolean;
};
export const practiceKey = (
  circuit: CircuitId,
  hole: number,
  control: ControlMode,
) => `${practiceLayouts.indexOf(getCourse({ circuit, hole }))}:${control}`;
export function practiceMedal(score: number, par: number) {
  return score < par
    ? "Oro"
    : score === par
      ? "Plata"
      : score <= par + 2
        ? "Bronce"
        : "Sin medalla";
}
export function readPracticeRecords(
  physics: PhysicsEdition = 2,
): PracticeHistory {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(physics)) || "null");
    if (
      !raw ||
      raw.version !== RULES_VERSION ||
      !raw.records ||
      typeof raw.records !== "object"
    )
      return {};
    const result: PracticeHistory = {};
    for (const [key, value] of Object.entries(raw.records)) {
      const match = /^(\d+):(classic|pull|pulse)$/.exec(key),
        r = value as PracticeBest;
      if (
        !match ||
        Number(match[1]) >= practiceLayouts.length ||
        String(Number(match[1])) !== match[1] ||
        !r ||
        !Number.isInteger(r.best) ||
        r.best < 1 ||
        r.best > 12 ||
        !Number.isInteger(r.attempts) ||
        r.attempts < 1 ||
        r.attempts > 1e9 ||
        typeof r.date !== "string" ||
        !Number.isFinite(Date.parse(r.date))
      )
        continue;
      result[key] = { best: r.best, attempts: r.attempts, date: r.date };
    }
    return result;
  } catch {
    return {};
  }
}
export function recordPractice(
  history: PracticeHistory,
  state: State,
  control: ControlMode,
  date = new Date().toISOString(),
): { history: PracticeHistory; report: PracticeReport } | null {
  if (
    state.custom ||
    state.phase !== "finished" ||
    !state.practice ||
    state.format === "stableford" ||
    state.players.length !== 1 ||
    !isControlMode(control) ||
    !isCircuitId(state.circuit) ||
    !Number.isInteger(state.hole) ||
    state.hole < 0 ||
    state.hole >= getCircuit(state.circuit).courses.length
  )
    return null;
  const p = state.players[0],
    score = p.scores[0];
  if (
    !p.done ||
    p.withdrawn ||
    p.capped.length ||
    p.strokes !== 0 ||
    p.scores.length !== 1 ||
    !Number.isInteger(score) ||
    score < 1 ||
    score > 12
  )
    return null;
  const key = practiceKey(state.circuit, state.hole, control),
    prior = history[key],
    improved = !prior || score < prior.best;
  const best = improved ? score : prior.best;
  return {
    history: {
      ...history,
      [key]: {
        best,
        attempts: (prior?.attempts || 0) + 1,
        date: improved ? date : prior.date,
      },
    },
    report: {
      score,
      best,
      improved,
      medal: practiceMedal(score, getCourse(state).par),
    },
  };
}
export function persistPracticeRecords(
  records: PracticeHistory,
  physics: PhysicsEdition = 2,
) {
  try {
    localStorage.setItem(
      storageKey(physics),
      JSON.stringify({ version: RULES_VERSION, records }),
    );
    return true;
  } catch {
    return false;
  }
}
