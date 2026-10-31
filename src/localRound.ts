import RAPIER from "@dimforge/rapier3d-compat";
import { Game, MAX_STROKES, type State } from "../shared/game";
import { RULES_VERSION, TURN_SECONDS } from "../shared/rules";
import {
  getCircuit,
  getCourse,
  geometry,
  cupWalls,
  isCircuitId,
} from "../shared/courses";
import { isControlMode, type ControlMode } from "./shotControls";
import { isMatchFormat } from "../shared/scoring";

export const LOCAL_ROUND_KEY = "club-local-round";
const MAX_BYTES = 2_000_000;
export type LocalRound = {
  format: 1;
  rules: number;
  engine: string;
  savedAt: number;
  control: ControlMode;
  aim: { angle: number; power: number };
  state: State;
  order: number[];
  simulation: {
    ball: number;
    movingBodies: number[];
    elapsed: number;
    quiet: number;
    capturedAt: number | null;
    eventSeq: number;
    lastBounce: number;
    last: { x: number; y: number; z: number };
    world: string;
    checksum: number;
  };
};
export type LocalSave =
  | { kind: "empty" }
  | { kind: "saved"; round: LocalRound }
  | { kind: "invalid" }
  | { kind: "unavailable" };
const finite = (n: unknown, min = -1e8, max = 1e8): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const integer = (n: unknown, min: number, max: number) =>
  finite(n, min, max) && Number.isInteger(n);
const vector = (v: unknown) => {
  const p = v as { x?: unknown; y?: unknown; z?: unknown } | null;
  return (
    p &&
    finite(p.x, -1e5, 1e5) &&
    finite(p.y, -1e5, 1e5) &&
    finite(p.z, -1e5, 1e5)
  );
};
function checksum(bytes: Uint8Array) {
  let hash = 2166136261;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return hash >>> 0;
}
function encode(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
function decode(text: string) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}
function movingBlocks(state: State) {
  const c = getCourse(state),
    shape = geometry(c);
  return [
    ...shape.surfaces,
    ...shape.walls,
    ...c.blocks,
    ...cupWalls(c),
  ].filter((b) => b.moving);
}
/** This is a local recovery format, never an online command or score submission. */
export function captureLocalRound(
  game: Game,
  control: ControlMode,
  aim = { angle: 0, power: 0.55 },
  savedAt = Date.now(),
): LocalRound {
  const world = game.world.takeSnapshot();
  return {
    format: 1,
    rules: RULES_VERSION,
    engine: RAPIER.version(),
    savedAt,
    control,
    aim: { ...aim },
    state: structuredClone(game.state),
    order: [...game.turnOrder],
    simulation: {
      ball: game.ball.handle,
      movingBodies: game.dynamicBlocks.map(({ body }) => body.handle),
      elapsed: game.elapsed,
      quiet: game.quiet,
      capturedAt: game.capturedAt,
      eventSeq: game.eventSeq,
      lastBounce: game.lastBounce,
      last: { ...game.last },
      world: encode(world),
      checksum: checksum(world),
    },
  };
}
export function validateLocalRound(value: unknown): value is LocalRound {
  try {
    const r = value as LocalRound,
      s = r.state,
      sim = r.simulation;
    if (
      !r ||
      r.format !== 1 ||
      r.rules !== RULES_VERSION ||
      typeof r.engine !== "string" ||
      r.engine.length > 40 ||
      !finite(r.savedAt, 0, 1e15) ||
      !isControlMode(r.control) ||
      !finite(r.aim.angle, -Math.PI * 2, Math.PI * 2) ||
      !finite(r.aim.power, 0.03, 1) ||
      !s ||
      (s.format !== undefined && !isMatchFormat(s.format)) ||
      !isCircuitId(s.circuit) ||
      !["playing", "scores"].includes(s.phase) ||
      typeof s.practice !== "boolean" ||
      s.code !== "" ||
      !integer(s.hole, 0, getCircuit(s.circuit).courses.length - 1) ||
      !Array.isArray(s.players) ||
      s.players.length < 1 ||
      s.players.length > 8 ||
      (s.practice && s.players.length !== 1) ||
      (s.format === "stableford" && (s.practice || s.players.length < 2)) ||
      !integer(s.turn, 0, s.players.length - 1) ||
      typeof s.moving !== "boolean" ||
      !finite(s.time, 0) ||
      !finite(s.deadline, 0, s.time + TURN_SECONDS + 0.01) ||
      typeof s.message !== "string" ||
      s.message.length > 300 ||
      s.host !== "0"
    )
      return false;
    const length = s.phase === "scores" ? s.hole + 1 : s.practice ? 0 : s.hole;
    for (const [i, p] of s.players.entries()) {
      if (
        !p ||
        p.id !== String(i) ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 20 ||
        !p.connected ||
        p.withdrawn ||
        typeof p.ready !== "boolean" ||
        typeof p.done !== "boolean" ||
        !integer(p.strokes, 0, MAX_STROKES) ||
        !vector(p.pos) ||
        !Array.isArray(p.scores) ||
        p.scores.length !== length ||
        !p.scores.every((n) => integer(n, 1, MAX_STROKES)) ||
        !integer(p.aces, 0, getCircuit(s.circuit).courses.length) ||
        !integer(
          p.penalties,
          0,
          MAX_STROKES * getCircuit(s.circuit).courses.length,
        ) ||
        !Array.isArray(p.capped) ||
        new Set(p.capped).size !== p.capped.length ||
        !p.capped.every((n) => integer(n, 0, s.hole))
      )
        return false;
    }
    if (
      s.phase === "scores" &&
      (s.practice ||
        s.moving ||
        s.players.some((p) => !p.done || p.strokes !== 0))
    )
      return false;
    if (
      s.phase === "playing" &&
      (s.players.every((p) => p.done) || s.players[s.turn].done)
    )
      return false;
    if (
      !Array.isArray(r.order) ||
      r.order.length !== s.players.length ||
      new Set(r.order).size !== r.order.length ||
      !r.order.every((n) => integer(n, 0, s.players.length - 1))
    )
      return false;
    if (
      !sim ||
      !finite(sim.ball, 0) ||
      !Array.isArray(sim.movingBodies) ||
      sim.movingBodies.length !== movingBlocks(s).length ||
      !sim.movingBodies.every((n) => finite(n, 0)) ||
      !finite(sim.elapsed, 0, 19) ||
      !integer(sim.quiet, 0, 10000) ||
      (sim.capturedAt !== null && !finite(sim.capturedAt, 0, sim.elapsed)) ||
      !integer(sim.eventSeq, 0, 1e8) ||
      !finite(sim.lastBounce, -1, s.time) ||
      !vector(sim.last) ||
      typeof sim.world !== "string" ||
      sim.world.length < 100 ||
      sim.world.length > MAX_BYTES ||
      !integer(sim.checksum, 0, 0xffffffff)
    )
      return false;
    return checksum(decode(sim.world)) === sim.checksum;
  } catch {
    return false;
  }
}
/** Rapier preserves contacts, velocities and the moving obstacles' phase, even mid-shot. */
export function restoreLocalRound(round: LocalRound): Game {
  if (!validateLocalRound(round) || round.engine !== RAPIER.version())
    throw Error("La partida guardada no es compatible con esta versión.");
  const world = RAPIER.World.restoreSnapshot(decode(round.simulation.world));
  try {
    const sim = round.simulation,
      ball = world.getRigidBody(sim.ball),
      bodies = sim.movingBodies.map((handle) => world.getRigidBody(handle));
    if (
      !ball?.isDynamic() ||
      bodies.some((body) => !body?.isKinematic()) ||
      Math.abs(world.timestep - 1 / 60) > 1e-6 ||
      !vector(ball.translation()) ||
      !vector(ball.linvel())
    )
      throw Error("La simulación guardada está incompleta.");
    const game = new Game();
    game.state = structuredClone(round.state);
    // Old cup/bounce notifications must not be played again after recovery.
    game.state.event = undefined;
    game.turnOrder = [...round.order];
    game.world = world;
    game.ball = ball;
    game.bars = bodies;
    game.dynamicBlocks = movingBlocks(game.state).map((block, i) => ({
      block,
      body: bodies[i],
    }));
    game.elapsed = sim.elapsed;
    game.quiet = sim.quiet;
    game.capturedAt = sim.capturedAt;
    game.eventSeq = sim.eventSeq;
    game.lastBounce = sim.lastBounce;
    game.last = { ...sim.last };
    return game;
  } catch (error) {
    world.free();
    throw error;
  }
}
export function readLocalRound(): LocalSave {
  try {
    const raw = localStorage.getItem(LOCAL_ROUND_KEY);
    if (raw === null) return { kind: "empty" };
    if (raw.length > MAX_BYTES * 1.1) return { kind: "invalid" };
    const round: unknown = JSON.parse(raw);
    return validateLocalRound(round)
      ? { kind: "saved", round }
      : { kind: "invalid" };
  } catch (error) {
    return { kind: error instanceof SyntaxError ? "invalid" : "unavailable" };
  }
}
export function persistLocalRound(round: LocalRound): boolean {
  try {
    const text = JSON.stringify(round);
    if (text.length > MAX_BYTES * 1.1) return false;
    localStorage.setItem(LOCAL_ROUND_KEY, text);
    return true;
  } catch {
    return false;
  }
}
export function discardLocalRound(): boolean {
  try {
    localStorage.removeItem(LOCAL_ROUND_KEY);
    return true;
  } catch {
    return false;
  }
}
