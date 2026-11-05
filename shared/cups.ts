import { getCircuit, type CircuitId } from "./courses";
import type { State } from "./game";
import { confirmedPoints } from "./competition";
import type { MatchFormat } from "./scoring";
export const cupPlans = [
  {
    id: "club",
    name: "Copa del Club",
    circuits: ["sunset", "moonlight", "park"] as CircuitId[],
    description:
      "Tres mundos, nueve hoyos. Construye la ventaja vuelta a vuelta.",
  },
  {
    id: "risk",
    name: "Copa del Riesgo",
    circuits: ["aces", "skyruins"] as CircuitId[],
    description: "Seis hoyos: líneas de as y puentes sobre las ruinas.",
  },
] as const;
export type CupPlanId = (typeof cupPlans)[number]["id"];
export const getCupPlan = (id: unknown) => cupPlans.find((p) => p.id === id);
export type CupRoundPlayer = {
  id: string;
  scores: number[];
  capped: number[];
  strokes: number;
  points: number;
  aces: number;
  penalties: number;
  withdrawn: boolean;
};
export type CupRound = { circuit: CircuitId; players: CupRoundPlayer[] };
export type CupState = {
  plan: CupPlanId;
  format: MatchFormat;
  phase: "setup" | "playing" | "finished";
  round: number;
  entrants: { id: string; name: string; withdrawn: boolean }[];
  rounds: CupRound[];
};
export const setupCup = (plan: CupPlanId, format: MatchFormat): CupState => ({
  plan,
  format,
  phase: "setup",
  round: 0,
  entrants: [],
  rounds: [],
});
export function beginCup(cup: CupState, state: State): CupState {
  const plan = getCupPlan(cup.plan)!;
  if (
    cup.phase !== "setup" ||
    state.phase !== "lobby" ||
    state.players.length < 2 ||
    state.circuit !== plan.circuits[0]
  )
    throw Error("Prepara la copa en la sala");
  return {
    ...setupCup(cup.plan, state.format ?? "strokes"),
    phase: "playing",
    entrants: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      withdrawn: false,
    })),
  };
}
/** Called only with the authoritative game state. A finished round is appended once. */
export function settleCup(cup: CupState, state: State): CupState {
  if (
    cup.phase !== "playing" ||
    state.phase !== "finished" ||
    cup.rounds.length !== cup.round
  )
    return cup;
  const plan = getCupPlan(cup.plan)!;
  if (
    state.circuit !== plan.circuits[cup.round] ||
    (state.format ?? "strokes") !== cup.format ||
    state.practice
  )
    throw Error("La vuelta no corresponde a esta copa");
  const holes = getCircuit(state.circuit).courses.length;
  if (
    !state.players.length ||
    state.players.some(
      (p) =>
        p.scores.length !== holes ||
        p.scores.some((n) => !Number.isInteger(n) || n < 1 || n > 12),
    )
  )
    throw Error("Resultado de vuelta incompleto");
  const round: CupRound = {
    circuit: state.circuit,
    players: state.players.map((p) => ({
      id: p.id,
      scores: [...p.scores],
      capped: [...p.capped],
      strokes: p.scores.reduce((n, v) => n + v, 0),
      points: confirmedPoints(p, state),
      aces: p.aces,
      penalties: p.penalties,
      withdrawn: p.withdrawn,
    })),
  };
  const entrants = cup.entrants.map((p) => ({
    ...p,
    withdrawn:
      p.withdrawn ||
      Boolean(state.players.find((v) => v.id === p.id)?.withdrawn),
  }));
  return {
    ...cup,
    entrants,
    rounds: [...cup.rounds, round],
    phase:
      cup.round === plan.circuits.length - 1 ||
      entrants.every((p) => p.withdrawn)
        ? "finished"
        : "playing",
  };
}
export function withdrawFromCup(cup: CupState, id: string): CupState {
  if (cup.phase !== "playing") return cup;
  const entrants = cup.entrants.map((p) =>
    p.id === id ? { ...p, withdrawn: true } : p,
  );
  return {
    ...cup,
    entrants,
    phase: entrants.every((p) => p.withdrawn) ? "finished" : cup.phase,
  };
}
export function cupStandings(cup: CupState, state?: State) {
  const rows = cup.entrants
    .map((p) => {
      const records = cup.rounds.flatMap((r) =>
        r.players.filter((v) => v.id === p.id),
      );
      const live =
        state && cup.phase === "playing" && cup.rounds.length === cup.round
          ? state.players.find((v) => v.id === p.id)
          : undefined;
      return {
        ...p,
        strokes:
          records.reduce((n, r) => n + r.strokes, 0) +
          (live ? live.scores.reduce((n, v) => n + v, 0) + live.strokes : 0),
        points:
          records.reduce((n, r) => n + r.points, 0) +
          (live && state ? confirmedPoints(live, state) : 0),
        aces: records.reduce((n, r) => n + r.aces, 0) + (live?.aces ?? 0),
        penalties:
          records.reduce((n, r) => n + r.penalties, 0) + (live?.penalties ?? 0),
        withdrawn: p.withdrawn || Boolean(live?.withdrawn),
      };
    })
    .sort(
      (a, b) =>
        Number(a.withdrawn) - Number(b.withdrawn) ||
        (cup.format === "stableford"
          ? b.points - a.points
          : a.strokes - b.strokes) ||
        b.aces - a.aces,
    );
  return rows.map((p, i) => ({
    ...p,
    place:
      rows.findIndex(
        (v) =>
          v.withdrawn === p.withdrawn &&
          v.aces === p.aces &&
          (cup.format === "stableford"
            ? v.points === p.points
            : v.strokes === p.strokes),
      ) + 1,
  }));
}
export function cupWinnerLabel(cup: CupState) {
  const winners = cupStandings(cup).filter(
    (p) => !p.withdrawn && p.place === 1,
  );
  return !winners.length
    ? "Copa abandonada."
    : winners.length > 1
      ? "Copa compartida."
      : `${winners[0].name} gana la copa.`;
}
