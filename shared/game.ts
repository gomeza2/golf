import RAPIER from "@dimforge/rapier3d-compat";
import {
  getCircuit,
  getCourse,
  geometry,
  cupGreen,
  cupWalls,
  courseSize,
  inZone,
  surfaceAt,
  rollingResistance,
  blockPose,
  type Block,
  type CircuitId,
  type V3,
} from "./courses";
import { shotVelocity } from "./shot";
let initialization: Promise<void> | undefined;
export const initPhysics = () => (initialization ??= RAPIER.init());
export const MAX_STROKES = 12;
export type Player = {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  scores: number[];
  strokes: number;
  done: boolean;
  withdrawn: boolean;
  pos: V3;
  aces: number;
  penalties: number;
  capped: number[];
};
export type State = {
  phase: "lobby" | "playing" | "scores" | "finished";
  players: Player[];
  hole: number;
  circuit: CircuitId;
  turn: number;
  moving: boolean;
  time: number;
  deadline: number;
  message: string;
  host: string;
  code: string;
  event?: {
    seq: number;
    kind: "bounce" | "water" | "cup";
    pos: V3;
    time: number;
  };
};
export function ranking(players: Player[]) {
  return [...players].sort(
    (a, b) =>
      Number(a.withdrawn) - Number(b.withdrawn) ||
      total(a) - total(b) ||
      b.aces - a.aces,
  );
}
export const total = (p: Player) =>
  p.scores.reduce((a, b) => a + b, 0) + p.strokes;
export class Game {
  state: State = {
    phase: "lobby",
    players: [],
    hole: 0,
    circuit: "sunset",
    turn: 0,
    moving: false,
    time: 0,
    deadline: 45,
    message: "",
    host: "",
    code: "",
  };
  world!: RAPIER.World;
  ball!: RAPIER.RigidBody;
  bars: RAPIER.RigidBody[] = [];
  dynamicBlocks: { body: RAPIER.RigidBody; block: Block }[] = [];
  turnOrder: number[] = [];
  elapsed = 0;
  quiet = 0;
  capturedAt: number | null = null;
  eventSeq = 0;
  lastBounce = -1;
  last: V3 = { x: 0, y: 0, z: 0 };
  add(id: string, name: string) {
    if (this.state.phase !== "lobby" || this.state.players.length >= 8)
      throw Error("Sala llena o partida iniciada");
    const p: Player = {
      id,
      name: name.trim().slice(0, 20) || "Golfista",
      ready: false,
      connected: true,
      scores: [],
      strokes: 0,
      done: false,
      withdrawn: false,
      pos: { ...getCourse({ ...this.state, hole: 0 }).start },
      aces: 0,
      penalties: 0,
      capped: [],
    };
    this.state.players.push(p);
    if (!this.state.host) this.state.host = id;
    return p;
  }
  start() {
    this.state.players = this.state.players.filter((p) => !p.withdrawn);
    if (!this.state.players.length) throw Error("Faltan jugadores");
    this.state.hole = 0;
    this.turnOrder = this.state.players.map((_, i) => i);
    for (const p of this.state.players) {
      p.scores = [];
      p.aces = 0;
      p.penalties = 0;
      p.capped = [];
    }
    this.load();
  }
  load() {
    this.world?.free();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
    this.bars = [];
    const c = getCourse(this.state);
    this.dynamicBlocks = [];
    const box = (block: Block, restitution = 0.52) => {
      const pose = blockPose(block, this.state.time),
        rotation = block.rotation || 0;
      const sx = Math.sin(rotation / 2),
        cx = Math.cos(rotation / 2),
        sy = Math.sin(pose.yaw / 2),
        cy = Math.cos(pose.yaw / 2);
      const descriptor = block.moving
        ? RAPIER.RigidBodyDesc.kinematicPositionBased()
        : RAPIER.RigidBodyDesc.fixed();
      const body = this.world.createRigidBody(
        descriptor
          .setTranslation(...pose.pos)
          .setRotation({ x: sx * cy, y: cx * sy, z: sx * sy, w: cx * cy }),
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          block.size[0] / 2,
          block.size[1] / 2,
          block.size[2] / 2,
        )
          .setRestitution(restitution)
          .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
          .setFriction(0.08),
        body,
      );
      if (block.moving) {
        this.bars.push(body);
        this.dynamicBlocks.push({ body, block });
      }
    };
    const shape = geometry(c);
    shape.surfaces.forEach((block) => box(block, 0));
    [...shape.walls, ...c.blocks].forEach((block) => box(block, 0.52));
    cupWalls(c).forEach((block) => box(block, 0.08));
    const green = cupGreen(c);
    this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(
        new Float32Array(green.vertices),
        new Uint32Array(green.indices),
        RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES,
      )
        .setFriction(0.08)
        .setRestitution(0),
    );
    this.capturedAt = null;
    this.state.event = undefined;
    this.ball = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(c.start.x, c.start.y, c.start.z)
        .setLinearDamping(0.38)
        .setAngularDamping(1)
        .setCcdEnabled(true)
        .lockRotations(),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.22)
        .setMass(1)
        .setRestitution(0)
        .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
        .setFriction(0.02),
      this.ball,
    );
    for (const p of this.state.players) {
      p.strokes = p.withdrawn ? MAX_STROKES : 0;
      p.done = p.withdrawn;
      p.pos = { ...c.start };
    }
    Object.assign(this.state, {
      phase: "playing",
      turn: this.turnOrder.find((i) => !this.state.players[i].withdrawn) ?? 0,
      moving: false,
      deadline: this.state.time + 45,
      message: "Nuevo hoyo. ¡Busca tu línea!",
    });
    this.place();
  }
  place() {
    const p = this.state.players[this.state.turn];
    this.ball.setTranslation(p.pos, true);
    this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.state.deadline = this.state.time + 45;
  }
  shoot(id: string, angle: number, power: number) {
    const s = this.state,
      p = s.players[s.turn];
    if (
      s.phase !== "playing" ||
      s.moving ||
      p?.id !== id ||
      !Number.isFinite(angle) ||
      !Number.isFinite(power) ||
      power < 0.03 ||
      power > 1
    )
      return false;
    p.strokes++;
    this.last = { ...p.pos };
    // A ball waiting on a slope stays at its saved lie until its next shot.
    this.ball.setTranslation(p.pos, true);
    this.ball.setLinvel(shotVelocity(angle, power), true);
    s.moving = true;
    this.elapsed = 0;
    this.quiet = 0;
    this.capturedAt = null;
    s.message = "La pelota está en juego";
    return true;
  }
  tick() {
    const s = this.state;
    s.time += 1 / 60;
    if (s.phase !== "playing") return;
    for (const { body, block } of this.dynamicBlocks) {
      const pose = blockPose(block, s.time);
      body.setNextKinematicTranslation({
        x: pose.pos[0],
        y: pose.pos[1],
        z: pose.pos[2],
      });
      body.setNextKinematicRotation({
        x: 0,
        y: Math.sin(pose.yaw / 2),
        z: 0,
        w: Math.cos(pose.yaw / 2),
      });
    }
    if (!s.moving) {
      this.ball.setTranslation(s.players[s.turn].pos, true);
      this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    const before = this.ball.linvel();
    this.world.step();
    if (!s.moving) {
      if (s.time > s.deadline) {
        const p = s.players[s.turn];
        p.strokes = Math.min(MAX_STROKES, p.strokes + 1);
        p.penalties++;
        s.message = "Tiempo agotado: un golpe de penalización";
        this.endTurn();
      }
      return;
    }
    this.elapsed += 1 / 60;
    const p = s.players[s.turn],
      v = this.ball.linvel(),
      pos = this.ball.translation();
    p.pos = { ...pos };
    const c = getCourse(s);
    const speed = Math.hypot(v.x, v.z);
    const beforeSpeed = Math.hypot(before.x, before.z);
    if (
      beforeSpeed > 1.2 &&
      Math.hypot(v.x - before.x, v.z - before.z) > 1.8 &&
      v.x * before.x + v.z * before.z <
        beforeSpeed * Math.max(speed, 0.1) * 0.65 &&
      s.time - this.lastBounce > 0.12
    ) {
      this.emitEvent("bounce", pos);
      this.lastBounce = s.time;
    }
    if (c.water?.some((zone) => inZone(zone, pos) && pos.y < zone.y + 0.24)) {
      this.emitEvent("water", pos);
      p.pos = { ...this.last };
      p.strokes = Math.min(MAX_STROKES, p.strokes + 1);
      p.penalties++;
      s.message = "Al agua: un golpe de penalización y regreso al último punto";
      this.endTurn();
      return;
    }
    // A putt only counts once the ball physically drops below the rim.
    // Keep simulating for half a second so everybody sees it fall before changing turn.
    if (
      Math.hypot(pos.x - c.cup.x, pos.z - c.cup.z) < 0.5 &&
      pos.y < c.cup.y - 0.28
    )
      this.capturedAt ??= this.elapsed;
    if (
      this.capturedAt !== null &&
      (pos.y > c.cup.y - 0.1 ||
        Math.hypot(pos.x - c.cup.x, pos.z - c.cup.z) > 0.5)
    )
      this.capturedAt = null;
    if (this.capturedAt !== null) {
      if (this.elapsed - this.capturedAt > 0.55) {
        p.done = true;
        if (p.strokes === 1) p.aces++;
        s.message = `¡${p.name} embocó en ${p.strokes}!`;
        this.emitEvent("cup", pos);
        this.endTurn();
      }
      return;
    }
    // Rolling resistance is applied only on the surface, preserving airborne arcs.
    const grounded = this.world.castRayAndGetNormal(
      new RAPIER.Ray(pos, { x: 0, y: -1, z: 0 }),
      0.26,
      true,
      undefined,
      undefined,
      undefined,
      this.ball,
    );
    if (grounded) {
      const n = grounded.normal;
      const normalSpeed = v.x * n.x + v.y * n.y + v.z * n.z;
      if (
        n.y > 0.45 &&
        Math.abs(normalSpeed) < 0.3 &&
        grounded.timeOfImpact < 0.25
      ) {
        const resistance = rollingResistance[surfaceAt(c, pos)];
        const tangent = {
          x: v.x - normalSpeed * n.x,
          y: v.y - normalSpeed * n.y,
          z: v.z - normalSpeed * n.z,
        };
        const tangentSpeed = Math.hypot(tangent.x, tangent.y, tangent.z);
        const fraction = Math.min(1, resistance / Math.max(0.05, tangentSpeed));
        this.ball.setLinvel(
          {
            x: v.x - tangent.x * fraction,
            y: v.y - tangent.y * fraction,
            z: v.z - tangent.z * fraction,
          },
          true,
        );
      }
    }
    // Moving obstacles may transfer energy, but cannot launch a ball without bound.
    const actual = this.ball.linvel(),
      magnitude = Math.hypot(actual.x, actual.y, actual.z);
    if (magnitude > 18)
      this.ball.setLinvel(
        {
          x: (actual.x * 18) / magnitude,
          y: (actual.y * 18) / magnitude,
          z: (actual.z * 18) / magnitude,
        },
        true,
      );
    const bounds = courseSize(c);
    if (
      pos.y < -4 ||
      Math.abs(pos.x) > bounds.width / 2 + 1 ||
      Math.abs(pos.z) > bounds.length / 2 + 2
    ) {
      p.pos = { ...this.last };
      p.strokes = Math.min(MAX_STROKES, p.strokes + 1);
      p.penalties++;
      s.message = "Fuera de campo: regreso y un golpe de penalización";
      this.endTurn();
      return;
    }
    this.quiet = speed < 0.12 && Math.abs(v.y) < 0.15 ? this.quiet + 1 : 0;
    if (this.quiet > 20 || this.elapsed > 18) {
      this.endTurn();
    }
  }
  emitEvent(kind: "bounce" | "water" | "cup", pos: V3) {
    this.state.event = {
      seq: ++this.eventSeq,
      kind,
      pos: { ...pos },
      time: this.state.time,
    };
  }
  endTurn() {
    const s = this.state,
      p = s.players[s.turn];
    s.moving = false;
    if (s.message === "La pelota está en juego")
      s.message = "Pelota detenida. Pasa el turno.";
    if (p.strokes >= MAX_STROKES && !p.done) {
      p.capped.push(s.hole);
      p.done = true;
      s.message = `${p.name}: límite de ${MAX_STROKES} golpes`;
    }
    if (s.players.every((p) => p.done)) {
      for (const p of s.players) {
        p.scores.push(p.strokes);
        p.strokes = 0;
      }
      s.phase =
        s.hole === getCircuit(s.circuit).courses.length - 1
          ? "finished"
          : "scores";
      return;
    }
    do {
      s.turn =
        this.turnOrder[
          (this.turnOrder.indexOf(s.turn) + 1) % this.turnOrder.length
        ];
    } while (s.players[s.turn].done);
    this.place();
  }
  next() {
    if (this.state.phase === "scores") {
      // Stable sorting retains the previous tee honours when scores are tied.
      const hole = this.state.hole;
      this.turnOrder.sort(
        (a, b) =>
          Number(this.state.players[a].withdrawn) -
            Number(this.state.players[b].withdrawn) ||
          this.state.players[a].scores[hole] -
            this.state.players[b].scores[hole],
      );
      this.state.hole++;
      this.load();
    }
  }
  selectCircuit(circuit: CircuitId) {
    if (this.state.phase !== "lobby")
      throw Error("El recorrido se elige en la sala");
    this.state.circuit = circuit;
    for (const p of this.state.players) {
      p.ready = false;
      p.pos = { ...getCourse({ ...this.state, hole: 0 }).start };
    }
  }
  removeFromLobby(id: string) {
    if (this.state.phase !== "lobby") throw Error("La partida ya comenzó");
    this.state.players = this.state.players.filter((p) => p.id !== id);
    if (this.state.host === id)
      this.state.host =
        this.state.players.find((p) => p.connected)?.id ||
        this.state.players[0]?.id ||
        "";
  }
  withdraw(id: string) {
    const s = this.state,
      p = s.players.find((p) => p.id === id);
    if (!p) return;
    if (s.phase === "lobby") {
      this.removeFromLobby(id);
      return;
    }
    p.connected = false;
    if (s.phase === "finished") return;
    p.withdrawn = true;
    if (s.phase === "playing" && !p.done) {
      p.strokes = MAX_STROKES;
      p.done = true;
      if (s.players[s.turn].id === id) this.endTurn();
    }
    if (s.players.every((p) => p.withdrawn)) {
      for (const p of s.players) {
        while (p.scores.length < getCircuit(s.circuit).courses.length)
          p.scores.push(MAX_STROKES);
        p.strokes = 0;
      }
      s.moving = false;
      s.phase = "finished";
      s.message = "Partida abandonada";
    }
  }
  returnToLobby() {
    if (this.state.phase !== "finished")
      throw Error("Termina el recorrido primero");
    this.state.players = this.state.players.filter(
      (p) => p.connected && !p.withdrawn,
    );
    this.state.hole = 0;
    this.state.phase = "lobby";
    this.state.moving = false;
    for (const p of this.state.players) {
      p.ready = false;
      p.done = false;
      p.strokes = 0;
      p.scores = [];
      p.aces = 0;
      p.penalties = 0;
      p.capped = [];
      p.pos = { ...getCourse(this.state).start };
    }
  }
  dispose() {
    this.world?.free();
  }
}

export const canStart = (s: State) =>
  s.phase === "lobby" &&
  s.players.filter((p) => p.connected).length >= 2 &&
  s.players.filter((p) => p.connected).every((p) => p.ready);
export function position(player: Player, players: Player[]) {
  const sorted = ranking(players);
  return (
    sorted.findIndex(
      (p) =>
        p.withdrawn === player.withdrawn &&
        total(p) === total(player) &&
        p.aces === player.aces,
    ) + 1
  );
}
