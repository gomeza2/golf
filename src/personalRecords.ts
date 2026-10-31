import { RULES_VERSION } from "../shared/rules";
import { getCircuit, isCircuitId, type CircuitId } from "../shared/courses";
import type { State } from "../shared/game";
import { isControlMode, type ControlMode } from "./shotControls";
export const RECORDS_KEY = `club-personal-normal-v${RULES_VERSION}`;
export const goalLabels: Record<string, string> = {
  finish: "Recorrido completado",
  par: "Al par o mejor",
  clean: "Sin penalizaciones",
  precision: "Dominio de Precisión",
  marathon: "Los 18 completos",
  nine: "Vuelta de 9 completa",
};
export type PersonalRecord = {
  best: number;
  rounds: number;
  date: string;
  goals: string[];
};
export type PersonalHistory = Record<string, PersonalRecord>;
export type RoundReport = {
  best: number;
  score: number;
  improved: boolean;
  earned: string[];
  persisted?: boolean;
};
const positive = (v: unknown, max: number): v is number =>
  Number.isInteger(v) && (v as number) > 0 && (v as number) <= max;
export const recordKey = (circuit: CircuitId, control: ControlMode) =>
  `${circuit}:${control}`;
export function readPersonalRecords(): PersonalHistory {
  try {
    const raw = JSON.parse(localStorage.getItem(RECORDS_KEY) || "null");
    if (
      !raw ||
      raw.version !== RULES_VERSION ||
      !raw.records ||
      typeof raw.records !== "object"
    )
      return {};
    const records: PersonalHistory = {};
    for (const [key, value] of Object.entries(raw.records)) {
      const [circuit, control, ...extra] = key.split(":");
      if (extra.length || !isCircuitId(circuit) || !isControlMode(control))
        continue;
      const r = value as PersonalRecord;
      if (
        !r ||
        !positive(r.best, getCircuit(circuit).courses.length * 12) ||
        !positive(r.rounds, 1e9) ||
        typeof r.date !== "string" ||
        !Number.isFinite(Date.parse(r.date)) ||
        !Array.isArray(r.goals)
      )
        continue;
      records[key] = {
        best: r.best,
        rounds: r.rounds,
        date: r.date,
        goals: [
          ...new Set(
            r.goals.filter(
              (g) => typeof g === "string" && Object.hasOwn(goalLabels, g),
            ),
          ),
        ],
      };
    }
    return records;
  } catch {
    return {};
  }
}
export function recordCompletedRound(
  history: PersonalHistory,
  state: State,
  control: ControlMode,
  date = new Date().toISOString(),
): { history: PersonalHistory; report: RoundReport } | null {
  if (
    state.phase !== "finished" ||
    state.practice ||
    state.format === "stableford" ||
    state.players.length !== 1 ||
    !isControlMode(control)
  )
    return null;
  const p = state.players[0],
    courses = getCircuit(state.circuit).courses;
  if (
    p.withdrawn ||
    !p.done ||
    p.strokes !== 0 ||
    p.capped.length ||
    p.scores.length !== courses.length ||
    !p.scores.every((score) => positive(score, 12))
  )
    return null;
  const score = p.scores.reduce((n, v) => n + v, 0),
    par = courses.reduce((n, c) => n + c.par, 0);
  const key = recordKey(state.circuit, control),
    previous = history[key];
  const achieved = [
    "finish",
    ...(score <= par ? ["par"] : []),
    ...(p.penalties === 0 ? ["clean"] : []),
    ...(control === "pulse" ? ["precision"] : []),
    ...(courses.length === 18 ? ["marathon"] : []),
    ...(courses.length === 9 ? ["nine"] : []),
  ];
  const earned = achieved.filter((goal) => !previous?.goals.includes(goal));
  const improved = !previous || score < previous.best;
  const next = {
    best: improved ? score : previous.best,
    rounds: (previous?.rounds || 0) + 1,
    date: improved ? date : previous.date,
    goals: [...new Set([...(previous?.goals || []), ...achieved])],
  };
  return {
    history: { ...history, [key]: next },
    report: { best: next.best, score, improved, earned },
  };
}
export function persistPersonalRecords(records: PersonalHistory) {
  try {
    localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify({ version: RULES_VERSION, records }),
    );
    return true;
  } catch {
    return false;
  }
}
