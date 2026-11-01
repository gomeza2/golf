import type { State } from "../shared/game";
import { RULES_VERSION } from "../shared/rules";
import { isControlMode, type ControlMode } from "./shotControls";
export const SCHOOL_KEY = `club-school-v${RULES_VERSION}`;
export const schoolTarget = { x: -3, y: 0.02, z: 6, radius: 1.1 };
export const lessons = [
  {
    title: "La fuerza justa",
    description:
      "Deja la pelota dentro del aro con un solo golpe. El aro es tu objetivo de práctica; ajusta dirección y fuerza.",
  },
  {
    title: "Tu aliada, la banda",
    description:
      "Haz un rebote contra una pared y deja que la pelota se detenga dentro del campo. Puedes usar más de un golpe.",
  },
  {
    title: "Hasta el fondo de la copa",
    description:
      "Completa el hoyo sin penalizaciones ni límite de golpes. La pelota tiene que caer dentro: pasar sobre el borde no cuenta.",
  },
] as const;
export type SchoolSession = {
  lesson: number;
  phase: "playing" | "passed";
  bounced: boolean;
  baselineSeq: number;
};
export type SchoolProgress = Partial<Record<ControlMode, number[]>>;
export function newSchoolSession(lesson: number, state: State): SchoolSession {
  return {
    lesson,
    phase: "playing",
    bounced: false,
    baselineSeq: state.event?.seq || 0,
  };
}
export function restoreSchoolSession(
  value: unknown,
  state: State,
): SchoolSession | null {
  const v = value as SchoolSession;
  if (
    !v ||
    !Number.isInteger(v.lesson) ||
    v.lesson < 0 ||
    v.lesson >= lessons.length ||
    !["playing", "passed"].includes(v.phase) ||
    typeof v.bounced !== "boolean" ||
    !Number.isInteger(v.baselineSeq) ||
    v.baselineSeq < 0 ||
    v.baselineSeq > 1e8 ||
    state.circuit !== "sunset" ||
    state.hole !== 0 ||
    !state.practice ||
    state.players.length !== 1
  )
    return null;
  if (
    v.phase === "passed" &&
    advanceSchool({ ...v, phase: "playing" }, state).phase !== "passed"
  )
    return null;
  return { ...v };
}
export function advanceSchool(
  session: SchoolSession,
  state: State,
): SchoolSession {
  if (session.phase === "passed" || state.moving) return session;
  const p = state.players[0];
  if (!p || p.withdrawn || p.capped.length || p.penalties) return session;
  const passed =
    session.lesson === 0
      ? p.strokes === 1 &&
        Math.hypot(p.pos.x - schoolTarget.x, p.pos.z - schoolTarget.z) <=
          schoolTarget.radius - 0.22 &&
        Math.abs(p.pos.y - 0.22) < 0.15
      : session.lesson === 1
        ? session.bounced && (p.strokes > 0 || p.scores.length === 1)
        : state.phase === "finished" &&
          p.done &&
          p.scores.length === 1 &&
          p.scores[0] > 0;
  return passed ? { ...session, phase: "passed" } : session;
}
export function observeSchool(
  session: SchoolSession,
  state: State,
): SchoolSession {
  const event = state.event;
  const next =
    !session.bounced &&
    event?.kind === "bounce" &&
    event.seq > session.baselineSeq
      ? { ...session, bounced: true }
      : session;
  return advanceSchool(next, state);
}
export function schoolFeedback(session: SchoolSession, state: State) {
  if (session.phase === "passed")
    return "Ejercicio superado con un tiro real. La pelota y el reloj están detenidos.";
  const p = state.players[0];
  if (p?.capped.length)
    return "Llegaste al límite. Reintenta desde la salida para completar el ejercicio.";
  if (p?.penalties)
    return "Este intento tuvo una penalización. Reintenta desde la salida.";
  if (state.moving)
    return session.bounced && session.lesson === 1
      ? "Banda conseguida. Espera a que la pelota se detenga."
      : "Pelota en juego: observa la fuerza y el rodamiento.";
  if (session.lesson === 0 && p?.strokes)
    return "El tiro quedó fuera del aro. Reintenta desde la salida y ajusta la fuerza o la dirección.";
  return lessons[session.lesson].description;
}
export function readSchoolProgress(): SchoolProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(SCHOOL_KEY) || "null");
    if (raw?.version !== 1 || !raw.progress || typeof raw.progress !== "object")
      return {};
    const result: SchoolProgress = {};
    for (const [mode, values] of Object.entries(raw.progress))
      if (isControlMode(mode) && Array.isArray(values))
        result[mode] = [
          ...new Set(
            values.filter(
              (n): n is number =>
                Number.isInteger(n) && n >= 0 && n < lessons.length,
            ),
          ),
        ];
    return result;
  } catch {
    return {};
  }
}
export function persistSchoolProgress(progress: SchoolProgress) {
  try {
    localStorage.setItem(SCHOOL_KEY, JSON.stringify({ version: 1, progress }));
    return true;
  } catch {
    return false;
  }
}
