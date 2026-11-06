import { beforeAll, expect, it } from "vitest";
import { Game, initPhysics } from "../shared/game";
import { newWorkshop } from "../shared/workshop";
import {
  validateRoomWorkshop,
  workshopFingerprint,
} from "../shared/roomWorkshop";
import { confirmedPoints } from "../shared/competition";
import { roundHighlights } from "../shared/highlights";
import { recordCompletedRound } from "../src/personalRecords";
beforeAll(initPhysics);
export const privateDesign = () => ({
  ...newWorkshop(),
  name: "La cancha de Ana",
  start: { x: 0, z: 0 },
  cup: { x: 0, z: -3, height: 0 },
  par: 5,
});
it("normalizes a room document, budgets the actual geometry and gives each revision a stable content hash", async () => {
  const a = validateRoomWorkshop(privateDesign());
  const b = validateRoomWorkshop({
    ...privateDesign(),
    ignored: "not executable",
    name: " La cancha de Ana ",
  });
  expect(a.canonical).toBe(b.canonical);
  expect(a.cost.colliders).toBeLessThanOrEqual(220);
  expect(a.cost.triangles).toBeGreaterThan(0);
  expect(await workshopFingerprint(a.canonical)).toBe(
    await workshopFingerprint(b.canonical),
  );
  expect(await workshopFingerprint(a.canonical)).not.toBe(
    await workshopFingerprint(
      validateRoomWorkshop({ ...privateDesign(), par: 4 }).canonical,
    ),
  );
});
it("rejects oversized, unsupported and geometrically invalid room content before creating physics", () => {
  expect(() =>
    validateRoomWorkshop({ ...privateDesign(), extra: "x".repeat(60000) }),
  ).toThrow(/60 KB/);
  expect(() =>
    validateRoomWorkshop({ ...privateDesign(), version: 99 }),
  ).toThrow(/inválido/);
  expect(() =>
    validateRoomWorkshop({ ...privateDesign(), pieces: [] }),
  ).toThrow(/plataforma/);
  const d = privateDesign();
  d.pieces = Array.from({ length: 9 }, (_, i) => ({
    id: `gate-${i}`,
    kind: "gate" as const,
    x: -7,
    z: 10 + i,
    width: 1,
    length: 0.5,
    height: 0,
    endHeight: 0,
    angle: 0,
  }));
  d.pieces.unshift(newWorkshop().pieces[0]);
  expect(() => validateRoomWorkshop(d)).toThrow(/presupuesto/);
  const heavy = privateDesign();
  heavy.pieces = Array.from({ length: 80 }, (_, i) => ({
    ...newWorkshop().pieces[0],
    id: `floor-${i}`,
    z: -3,
  }));
  expect(() => validateRoomWorkshop(heavy)).toThrow(/presupuesto/);
});
it("private play enforces turn time while the local workshop sandbox keeps its no-clock behavior", () => {
  const { course } = validateRoomWorkshop(privateDesign());
  const room = new Game(course, true),
    sandbox = new Game(course);
  try {
    for (const g of [room, sandbox]) {
      g.add("a", "Ana");
      g.add("b", "Luis");
      g.start();
      for (let i = 0; i < 1900; i++) g.tick();
    }
    expect(room.state.practice).toBe(false);
    expect(room.state.players[0].penalties).toBe(1);
    expect(room.state.turn).toBe(1);
    expect(sandbox.state.practice).toBe(true);
    expect(sandbox.state.players[0].penalties).toBe(0);
    expect(() => room.selectCircuit("cumbres")).toThrow(/fijada/);
  } finally {
    room.dispose();
    sandbox.dispose();
  }
});
it("a real private cup uses its own par, ends after one hole, supports replay and never creates an official record", () => {
  const { course } = validateRoomWorkshop(privateDesign());
  const g = new Game(course, true);
  try {
    g.add("a", "Ana");
    g.add("b", "Luis");
    g.start("stableford");
    for (const id of ["a", "b"]) {
      expect(g.shoot(id, 0, 0.22)).toBe(true);
      for (let n = 0; g.state.moving && n < 1200; n++) g.tick();
      expect(g.state.players.find((p) => p.id === id)!.done).toBe(true);
    }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players.map((p) => p.scores)).toEqual([[1], [1]]);
    expect(confirmedPoints(g.state.players[0], g.state)).toBe(6);
    expect(roundHighlights(g.state).map((h) => h.id)).toContain("aces");
    expect(recordCompletedRound({}, g.state, "classic")).toBeNull();
    g.start();
    expect(g.state.phase).toBe("playing");
    expect(g.state.players[0].scores).toEqual([]);
    g.withdraw("a");
    g.withdraw("b");
    expect(g.state.players.every((p) => p.scores.length === 1)).toBe(true);
    g.returnToLobby();
    expect(g.state.phase).toBe("lobby");
    expect(g.state.courseOverride).toBe(course);
  } finally {
    g.dispose();
  }
});

it("official recovery rejects embedded private geometry instead of restoring it as an official layout", async () => {
  const { captureLocalRound, validateLocalRound } =
    await import("../src/localRound");
  const g = new Game();
  g.add("0", "Ana");
  g.start();
  try {
    const saved = captureLocalRound(g, "classic");
    expect(validateLocalRound(saved)).toBe(true);
    expect(
      validateLocalRound({
        ...saved,
        state: {
          ...saved.state,
          courseOverride: validateRoomWorkshop(privateDesign()).course,
        },
      }),
    ).toBe(false);
    expect(
      validateLocalRound({
        ...saved,
        state: { ...saved.state, workshopHash: "a".repeat(64) },
      }),
    ).toBe(false);
  } finally {
    g.dispose();
  }
});
