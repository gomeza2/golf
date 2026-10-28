import RAPIER from "@dimforge/rapier3d-compat";
import { courses, type V3 } from "./courses";
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
  pos: V3;
  aces: number;
};
export type State = {
  phase: "lobby" | "playing" | "scores" | "finished";
  players: Player[];
  hole: number;
  turn: number;
  moving: boolean;
  time: number;
  deadline: number;
  message: string;
  host: string;
  code: string;
};
export function ranking(players: Player[]) {
  return [...players].sort((a, b) => total(a) - total(b) || b.aces - a.aces);
}
export const total = (p: Player) =>
  p.scores.reduce((a, b) => a + b, 0) + p.strokes;
export class Game {
  state: State = {
    phase: "lobby",
    players: [],
    hole: 0,
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
  elapsed = 0;
  quiet = 0;
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
      pos: { ...courses[0].start },
      aces: 0,
    };
    this.state.players.push(p);
    if (!this.state.host) this.state.host = id;
    return p;
  }
  start() {
    if (!this.state.players.length) throw Error("Faltan jugadores");
    this.state.hole = 0;
    for (const p of this.state.players) {
      p.scores = [];
      p.aces = 0;
    }
    this.load();
  }
  load() {
    this.world?.free();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
    this.bars = [];
    const c = courses[this.state.hole];
    const box = (
      pos: number[],
      size: number[],
      rotation = 0,
      moving = false,
    ) => {
      let d = moving
        ? RAPIER.RigidBodyDesc.kinematicPositionBased()
        : RAPIER.RigidBodyDesc.fixed();
      d = d.setTranslation(pos[0], pos[1], pos[2]);
      const b = this.world.createRigidBody(d);
      b.setRotation(
        { x: Math.sin(rotation / 2), y: 0, z: 0, w: Math.cos(rotation / 2) },
        true,
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2)
          .setRestitution(0.65)
          .setFriction(0.08),
        b,
      );
      if (moving) this.bars.push(b);
    };
    if (c.ramp) {
      box([0, -0.2, 7], [12, 0.4, 10]);
      box([0, 1, -1], [12, 0.4, 6.46], Math.atan(0.4));
      box([0, 2.2, -8], [12, 0.4, 8]);
    } else box([0, -0.2, 0], [12, 0.4, 24]);
    box([-6.2, 2, 0], [0.4, 6, 24]);
    box([6.2, 2, 0], [0.4, 6, 24]);
    box([0, 2, -12.2], [12, 6, 0.4]);
    box([0, 2, 12.2], [12, 6, 0.4]);
    for (const b of c.blocks) box(b.pos, b.size, 0, b.moving);
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
        .setRestitution(0.65)
        .setFriction(0.02),
      this.ball,
    );
    for (const p of this.state.players) {
      p.strokes = 0;
      p.done = false;
      p.pos = { ...c.start };
    }
    Object.assign(this.state, {
      phase: "playing",
      turn: 0,
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
    this.ball.setLinvel(
      {
        x: Math.sin(angle) * power * 20,
        y: 0,
        z: -Math.cos(angle) * power * 20,
      },
      true,
    );
    s.moving = true;
    this.elapsed = 0;
    this.quiet = 0;
    s.message = "La pelota está en juego";
    return true;
  }
  tick() {
    const s = this.state;
    s.time += 1 / 60;
    if (s.phase !== "playing") return;
    for (const b of this.bars) {
      const a = Math.sin(s.time * 0.8) * 1.25;
      b.setNextKinematicRotation({
        x: 0,
        y: Math.sin(a / 2),
        z: 0,
        w: Math.cos(a / 2),
      });
    }
    this.world.step();
    if (!s.moving) {
      if (s.time > s.deadline) {
        const p = s.players[s.turn];
        p.strokes = Math.min(MAX_STROKES, p.strokes + 1);
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
    const c = courses[s.hole];
    const speed = Math.hypot(v.x, v.z);
    if (
      Math.hypot(pos.x - c.cup.x, pos.z - c.cup.z) < 0.48 &&
      Math.abs(pos.y - (c.cup.y + 0.22)) < 0.45 &&
      speed < 5
    ) {
      p.done = true;
      if (p.strokes === 1) p.aces++;
      p.pos = { ...c.cup, y: c.cup.y - 0.2 };
      s.message = `¡${p.name} embocó en ${p.strokes}!`;
      this.endTurn();
      return;
    }
    // Rolling resistance is applied only on the surface, preserving airborne arcs.
    if (Math.abs(v.y) < 0.15) {
      const f = Math.max(0, 1 - 0.016 / Math.max(0.05, speed));
      this.ball.setLinvel({ x: v.x * f, y: v.y, z: v.z * f }, true);
    }
    if (pos.y < -4 || Math.abs(pos.x) > 7 || Math.abs(pos.z) > 14) {
      p.pos = { ...this.last };
      p.strokes = Math.min(MAX_STROKES, p.strokes + 1);
      s.message = "Fuera de campo: regreso y un golpe de penalización";
      this.endTurn();
      return;
    }
    this.quiet = speed < 0.12 && Math.abs(v.y) < 0.15 ? this.quiet + 1 : 0;
    if (this.quiet > 20 || this.elapsed > 18) {
      this.endTurn();
    }
  }
  endTurn() {
    const s = this.state,
      p = s.players[s.turn];
    s.moving = false;
    if (s.message === "La pelota está en juego")
      s.message = "Pelota detenida. Pasa el turno.";
    if (p.strokes >= MAX_STROKES) {
      p.done = true;
      s.message = `${p.name}: límite de ${MAX_STROKES} golpes`;
    }
    if (s.players.every((p) => p.done)) {
      for (const p of s.players) {
        p.scores.push(p.strokes);
        p.strokes = 0;
      }
      s.phase = s.hole === courses.length - 1 ? "finished" : "scores";
      return;
    }
    do {
      s.turn = (s.turn + 1) % s.players.length;
    } while (s.players[s.turn].done);
    this.place();
  }
  next() {
    if (this.state.phase === "scores") {
      this.state.hole++;
      this.load();
    }
  }
  dispose() {
    this.world?.free();
  }
}
