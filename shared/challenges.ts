import { getCircuit, type CircuitId } from "./courses";
import { MAX_STROKES, type State } from "./game";
import { RULES_VERSION } from "./rules";

// Versioned pools are deliberately frozen: adding a course must not change an old link.
const dailyPool: readonly CircuitId[] = [
  "sunset",
  "moonlight",
  "park",
  "aces",
  "skyruins",
];
const weeklyPool: readonly CircuitId[] = ["nine", "tour"];
export const CHALLENGE_SPEC = 1;
export type ClubChallenge = {
  id: string;
  kind: "daily" | "weekly";
  date: string;
  circuit: CircuitId;
  control: "classic";
  rules: 7;
  par: number;
  holes: number;
  birdies: number;
};
function hash(value: string) {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
function parseDate(value: string) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}
export function getChallenge(value: unknown): ClubChallenge | null {
  if (RULES_VERSION !== 7 || typeof value !== "string" || value.length > 30)
    return null;
  const match = /^c1-(d|w)-(20\d{2}-\d{2}-\d{2})$/.exec(value);
  if (!match) return null;
  const date = parseDate(match[2]);
  if (!date || (match[1] === "w" && date.getUTCDay() !== 1)) return null;
  const kind = match[1] === "d" ? "daily" : "weekly",
    pool = kind === "daily" ? dailyPool : weeklyPool;
  const circuit = pool[hash(value) % pool.length],
    courses = getCircuit(circuit).courses;
  return {
    id: value,
    kind,
    date: match[2],
    circuit,
    control: "classic",
    rules: 7,
    par: courses.reduce((n, c) => n + c.par, 0),
    holes: courses.length,
    birdies: kind === "daily" ? 1 : 3,
  };
}
export function currentChallenges(now = new Date()): ClubChallenge[] {
  if (!Number.isFinite(now.getTime())) return [];
  const date = now.toISOString().slice(0, 10),
    monday = new Date(`${date}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return [`c1-d-${date}`, `c1-w-${monday.toISOString().slice(0, 10)}`]
    .map(getChallenge)
    .filter((v): v is ClubChallenge => Boolean(v));
}
export const challengeTitle = (c: ClubChallenge) =>
  c.kind === "daily" ? "Desafío diario" : "Copa semanal";
export const challengeDate = (c: ClubChallenge) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${c.date}T00:00:00Z`));
export function challengeGoals(c: ClubChallenge) {
  return [
    `Terminar en ${c.par} golpes o menos`,
    `Terminar sin penalizaciones`,
    `${c.birdies} ${c.birdies === 1 ? "hoyo bajo par" : "hoyos bajo par"} como mínimo`,
  ];
}
export function challengeFromSearch(search: string) {
  const params = new URLSearchParams(search);
  return params.has("room") ? null : getChallenge(params.get("challenge"));
}
export function challengeLink(c: ClubChallenge, origin: string, path: string) {
  return `${origin}${path}?challenge=${encodeURIComponent(c.id)}`;
}
export type ChallengeResult = {
  eligible: boolean;
  score: number;
  par: number;
  birdies: number;
  penalties: number;
  goals: boolean[];
  medal: 0 | 1 | 2 | 3;
};
export function assessChallenge(
  c: ClubChallenge,
  state: State,
  control: unknown,
): ChallengeResult | null {
  if (
    control !== "classic" ||
    state.phase !== "finished" ||
    state.practice ||
    state.hole !== c.holes - 1 ||
    state.circuit !== c.circuit ||
    (state.format !== undefined && state.format !== "strokes") ||
    !Array.isArray(state.players) ||
    state.players.length !== 1
  )
    return null;
  const p = state.players[0],
    courses = getCircuit(c.circuit).courses;
  if (
    !p ||
    !p.done ||
    p.withdrawn ||
    p.strokes !== 0 ||
    !Array.isArray(p.scores) ||
    p.scores.length !== courses.length ||
    !p.scores.every((n) => Number.isInteger(n) && n >= 1 && n <= MAX_STROKES) ||
    !Number.isInteger(p.penalties) ||
    p.penalties < 0 ||
    p.penalties > courses.length * MAX_STROKES ||
    !Array.isArray(p.capped) ||
    !p.capped.every((n) => Number.isInteger(n) && n >= 0 && n < courses.length)
  )
    return null;
  const score = p.scores.reduce((n, v) => n + v, 0),
    birdies = p.scores.filter((v, i) => v < courses[i].par).length,
    eligible = p.capped.length === 0;
  const goals = eligible
    ? [score <= c.par, p.penalties === 0, birdies >= c.birdies]
    : [false, false, false];
  const achieved = goals.filter(Boolean).length;
  return {
    eligible,
    score,
    par: c.par,
    birdies,
    penalties: p.penalties,
    goals,
    medal: eligible ? (achieved === 3 ? 3 : achieved === 2 ? 2 : 1) : 0,
  };
}
export const challengeMedal = (n: number) =>
  ["Sin medalla", "Bronce", "Plata", "Oro"][n] || "Sin medalla";
