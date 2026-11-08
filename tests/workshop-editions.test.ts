import { captureLocalRound } from "../src/localRound";
import { recordCompletedRound } from "../src/personalRecords";
import { beforeAll, expect, it } from "vitest";
import { Game, initPhysics } from "../shared/game";
import { privateWorkshop, longWorkshop } from "./fixtures/workshop";
import {
  newWorkshop,
  parseWorkshop,
  exportWorkshop,
  importWorkshop,
  withWorkshopPhysics,
  workshopPhysics,
} from "../shared/workshop";
import {
  validateRoomWorkshop,
  workshopFingerprint,
} from "../shared/roomWorkshop";
import {
  workshopEdit,
  workshopUndo,
  workshopRedo,
} from "../src/workshopStorage";
import { transformWorkshopSelection } from "../shared/workshopTools";
beforeAll(initPhysics);
it("preserves a genuine pre-editions document's canonical SHA-256", async () => {
  const valid = validateRoomWorkshop(privateWorkshop());
  expect(valid.physics).toBe(1);
  expect(await workshopFingerprint(valid.canonical)).toBe(
    "5221543e5046f4f036025f84f05a88902df4e2f47b69179899b78e7464c7f5c0",
  );
  expect(importWorkshop(exportWorkshop(valid.document))).toEqual(
    privateWorkshop(),
  );
});
it("explicit conversion changes identity and physics while retaining identical geometry and the original document", async () => {
  const original = privateWorkshop(),
    before = JSON.stringify(original);
  const a = validateRoomWorkshop(original),
    b = validateRoomWorkshop(withWorkshopPhysics(original, 2));
  expect(b.document).toMatchObject({ version: 2, physics: 2 });
  expect(b.physics).toBe(2);
  expect(b.course).toEqual(a.course);
  expect(b.cost).toEqual(a.cost);
  expect(await workshopFingerprint(a.canonical)).not.toBe(
    await workshopFingerprint(b.canonical),
  );
  expect(
    validateRoomWorkshop(withWorkshopPhysics(b.document, 1)).canonical,
  ).toBe(a.canonical);
  expect(JSON.stringify(original)).toBe(before);
});
it("rejects ambiguous editions instead of silently changing the published physics", () => {
  for (const change of [
    { version: 1, physics: 2 },
    { version: 1, physics: 1 },
    { version: 2 },
    { version: 2, physics: 1 },
    { version: 2, physics: 3 },
    { version: 3, physics: 2 },
  ]) {
    expect(() => parseWorkshop({ ...privateWorkshop(), ...change })).toThrow();
  }
  const upgraded = withWorkshopPhysics(privateWorkshop(), 2);
  expect(importWorkshop(exportWorkshop(upgraded))).toEqual(upgraded);
  expect(() =>
    validateRoomWorkshop({
      ...upgraded,
      pieces: Array(81).fill(upgraded.pieces[0]),
    }),
  ).toThrow();
  expect(() =>
    validateRoomWorkshop({ ...upgraded, extra: "x".repeat(60000) }),
  ).toThrow(/60 KB/);
});
it("undo, redo and ordinary piece edits retain the chosen edition without converting older copies", () => {
  const old = privateWorkshop();
  const history = workshopEdit(
    { past: [], present: old, future: [] },
    withWorkshopPhysics(old, 2),
  );
  expect(workshopPhysics(history.present)).toBe(2);
  expect(workshopPhysics(workshopUndo(history).present)).toBe(1);
  expect(workshopRedo(workshopUndo(history)).present).toEqual(history.present);
  const moved = transformWorkshopSelection(
    history.present,
    [old.pieces[0].id],
    "duplicate",
  );
  expect(workshopPhysics(moved.doc)).toBe(2);
  expect(workshopPhysics(old)).toBe(1);
});

it("the same validated geometry executes original or current real drives from its document edition", () => {
  const positions = [];
  for (const edition of [1, 2] as const) {
    const v = validateRoomWorkshop(
      withWorkshopPhysics(longWorkshop(), edition),
    );
    const g = new Game(v.course, true, v.physics);
    try {
      g.add("a", "Ana");
      g.add("b", "Luis");
      g.start();
      expect(g.state.physics).toBe(edition);
      expect(g.shoot("a", 0, 1)).toBe(true);
      expect(g.ball.linvel().y).toBe(0);
      expect(-g.ball.linvel().z).toBeCloseTo(edition === 2 ? 20 : 16.2);
      while (g.state.moving) g.tick();
      expect(g.state.players[0].penalties).toBe(0);
      positions.push(g.state.players[0].pos.z);
    } finally {
      g.dispose();
    }
  }
  expect(positions[0] - positions[1]).toBeGreaterThan(7);
});
it("a two-player current-edition creation completes two genuine drives and retains its physics on replay", () => {
  const v = validateRoomWorkshop(withWorkshopPhysics(longWorkshop(), 2));
  const g = new Game(v.course, true, v.physics);
  try {
    g.add("a", "Ana");
    g.add("b", "Luis");
    g.start();
    for (const power of [1, 0.13])
      for (const id of ["a", "b"]) {
        expect(g.shoot(id, 0, power)).toBe(true);
        while (g.state.moving) g.tick();
      }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players.map((p) => p.scores)).toEqual([[2], [2]]);
    expect(g.state.players.every((p) => p.penalties === 0)).toBe(true);
    expect(recordCompletedRound({}, g.state, "classic")).toBeNull();
    expect(() => captureLocalRound(g, "classic")).toThrow(/taller/);
    g.start();
    expect(g.state.physics).toBe(2);
    expect(g.state.players.every((p) => !p.scores.length)).toBe(true);
  } finally {
    g.dispose();
  }
});
