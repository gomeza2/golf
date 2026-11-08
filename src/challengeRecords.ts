import {
  getChallenge,
  assessChallenge,
  challengeTitle,
  challengeDate,
  type ClubChallenge,
  type ChallengeResult,
} from "../shared/challenges";
import type { State } from "../shared/game";
import { RULES_VERSION, physicsEdition } from "../shared/rules";
export const CHALLENGES_KEY = `club-challenges-v${RULES_VERSION}-c1`;
export type ChallengeSession = { id: string; attempt: string };
export type ChallengeRecord = {
  best: number;
  medal: number;
  rounds: number;
  date: string;
  seen: string[];
};
export type ChallengeHistory = Record<string, ChallengeRecord>;
export type ChallengeReport = ChallengeResult & {
  best?: number;
  improved: boolean;
  recorded: boolean;
};
const attemptValid = (v: unknown): v is string =>
  typeof v === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(v);
export function newChallengeSession(id: string): ChallengeSession {
  return {
    id,
    attempt:
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  };
}
export function restoreChallengeSession(
  value: unknown,
  state: State,
  control: unknown,
): ChallengeSession | null {
  const v = value as ChallengeSession,
    c = getChallenge(v?.id);
  if (
    !c ||
    physicsEdition(state) !== 1 ||
    !attemptValid(v.attempt) ||
    control !== "classic" ||
    state.practice ||
    state.circuit !== c.circuit ||
    (state.format !== undefined && state.format !== "strokes") ||
    !Array.isArray(state.players) ||
    state.players.length !== 1
  )
    return null;
  return { id: c.id, attempt: v.attempt };
}
function bounded(history: ChallengeHistory): ChallengeHistory {
  return Object.fromEntries(
    Object.entries(history)
      .sort((a, b) => Date.parse(b[1].date) - Date.parse(a[1].date))
      .slice(0, 120),
  );
}
export function readChallengeHistory(): ChallengeHistory {
  try {
    const text = localStorage.getItem(CHALLENGES_KEY);
    if (!text || text.length > 500000) return {};
    const raw = JSON.parse(text);
    if (raw?.version !== 1 || !raw.history || typeof raw.history !== "object")
      return {};
    const history: ChallengeHistory = {};
    for (const [id, value] of Object.entries(raw.history)) {
      const c = getChallenge(id),
        r = value as ChallengeRecord;
      if (
        !c ||
        !r ||
        !Number.isInteger(r.best) ||
        r.best < c.holes ||
        r.best > c.holes * 12 ||
        !Number.isInteger(r.medal) ||
        r.medal < 1 ||
        r.medal > 3 ||
        !Number.isInteger(r.rounds) ||
        r.rounds < 1 ||
        r.rounds > 1e6 ||
        typeof r.date !== "string" ||
        !Number.isFinite(Date.parse(r.date)) ||
        !Array.isArray(r.seen) ||
        !r.seen.length ||
        r.seen.length > 32 ||
        !r.seen.every(attemptValid)
      )
        continue;
      history[id] = {
        best: r.best,
        medal: r.medal,
        rounds: r.rounds,
        date: new Date(r.date).toISOString(),
        seen: [...new Set(r.seen)],
      };
    }
    return bounded(history);
  } catch {
    return {};
  }
}
export function recordChallengeRound(
  history: ChallengeHistory,
  session: ChallengeSession,
  state: State,
  control: unknown,
  date = new Date().toISOString(),
): { history: ChallengeHistory; report: ChallengeReport } | null {
  const valid = restoreChallengeSession(session, state, control),
    c = getChallenge(session.id);
  if (!valid || !c || !Number.isFinite(Date.parse(date))) return null;
  const result = assessChallenge(c, state, control);
  if (!result) return null;
  const previous = history[c.id],
    duplicate = previous?.seen.includes(session.attempt) || false;
  const improved =
      result.eligible && (!previous || result.score < previous.best),
    best = duplicate
      ? previous.best
      : result.eligible
        ? Math.min(result.score, previous?.best ?? Infinity)
        : previous?.best;
  if (!result.eligible || duplicate)
    return {
      history,
      report: { ...result, best, improved: false, recorded: false },
    };
  const next: ChallengeRecord = {
    best: best!,
    medal: Math.max(previous?.medal || 0, result.medal),
    rounds: Math.min(1e6, (previous?.rounds || 0) + 1),
    date: new Date(date).toISOString(),
    seen: [...(previous?.seen || []), session.attempt].slice(-32),
  };
  return {
    history: bounded({ ...history, [c.id]: next }),
    report: { ...result, best, improved, recorded: true },
  };
}
export function persistChallengeHistory(history: ChallengeHistory) {
  try {
    localStorage.setItem(
      CHALLENGES_KEY,
      JSON.stringify({ version: 1, history: bounded(history) }),
    );
    return true;
  } catch {
    return false;
  }
}
export function challengeResultText(
  c: ClubChallenge,
  result: ChallengeResult,
  link: string,
) {
  if (!result.eligible)
    return `${challengeTitle(c)} · ${challengeDate(c)} UTC\n${link}`;
  const delta = result.score - result.par;
  return `Hoyo en Uno · ${challengeTitle(c)} · ${challengeDate(c)} UTC\n${result.score} golpes (${delta > 0 ? "+" : ""}${delta} al par) · ${result.goals.filter(Boolean).length}/3 objetivos\n${link}`;
}
