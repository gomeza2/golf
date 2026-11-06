import { beforeAll, afterEach, expect, it, vi } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { Game, initPhysics } from "../shared/game";
import {
  compileWorkshop,
  newWorkshop,
  importWorkshop,
  exportWorkshop,
  parseWorkshop,
  workshopIssues,
  type WorkshopPiece,
} from "../shared/workshop";
import { geometry, surfaceHeight } from "../shared/courses";
import { captureLocalRound, validateLocalRound } from "../src/localRound";
import { recordPractice } from "../src/practiceRecords";
import { recordCompletedRound } from "../src/personalRecords";
import {
  readWorkshopDraft,
  readWorkshopLibrary,
  saveWorkshopDraft,
  saveWorkshopLibrary,
  workshopEdit,
  workshopRedo,
  workshopUndo,
  WORKSHOP_LIBRARY_KEY,
} from "../src/workshopStorage";
beforeAll(initPhysics);
afterEach(() => vi.unstubAllGlobals());
const piece = (
  kind: WorkshopPiece["kind"],
  patch: Partial<WorkshopPiece> = {},
): WorkshopPiece => ({
  id: kind,
  kind,
  x: 0,
  z: 0,
  width: 4,
  length: 1,
  height: 0,
  endHeight: 0,
  angle: 0,
  ...patch,
});
function shoot(g: Game, a: number, p: number) {
  expect(g.shoot("a", a, p)).toBe(true);
  for (let f = 0; g.state.moving && f < 1500; f++) g.tick();
  expect(g.state.moving).toBe(false);
}
it("round trips only bounded data and discards executable or unknown fields", () => {
  const d = newWorkshop();
  const parsed = importWorkshop(
    exportWorkshop({ ...d, evil: "script" } as any),
  );
  expect(parsed).toEqual(d);
  expect((parsed as any).evil).toBeUndefined();
  for (const change of [
    (x: any) => (x.version = 99),
    (x: any) => (x.pieces = Array(81).fill(x.pieces[0])),
    (x: any) => (x.pieces[0].width = NaN),
    (x: any) => (x.pieces[0].kind = "mesh"),
    (x: any) => x.pieces.push(x.pieces[0]),
    (x: any) => (x.cup.height = -1),
    (x: any) => (x.par = 3.5),
    (x: any) => (x.pieces[0].id = "start"),
    (x: any) => (x.pieces[0].angle = 20),
  ]) {
    const v = structuredClone(d);
    change(v);
    expect(() => parseWorkshop(v)).toThrow();
  }
  expect(() => importWorkshop("{broken")).toThrow(/JSON/);
  expect(() => importWorkshop(" ".repeat(60001))).toThrow(/60 KB/);
});
it("cuts the actual cup opening from overlapping floor slabs and completes a physical custom putt", () => {
  const d = newWorkshop();
  d.start = { x: 0, z: 0 };
  d.cup = { x: 0, z: -3, height: 0 };
  const c = compileWorkshop(d),
    g = new Game(c);
  g.add("a", "Ana");
  g.startPractice(0);
  try {
    expect(workshopIssues(d)).toEqual([]);
    expect(geometry(c).walls).toEqual([]);
    g.tick();
    const hit = g.world.castRay(
      new R.Ray({ x: 0.2, y: 0.1, z: -3 }, { x: 0, y: -1, z: 0 }),
      0.3,
      true,
      undefined,
      undefined,
      undefined,
      g.ball,
    );
    expect(hit).toBeNull();
    shoot(g, 0, 0.145);
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[0].scores).toEqual([1]);
    expect(g.state.players[0].penalties).toBe(0);
    expect(recordPractice({}, g.state, "classic")).toBeNull();
    expect(recordCompletedRound({}, g.state, "classic")).toBeNull();
    expect(() => captureLocalRound(g, "classic")).toThrow(/taller/);
  } finally {
    g.dispose();
  }
});
it("rejects a sandbox marker in an official recovery without changing valid legacy snapshots", () => {
  const g = new Game();
  g.add("0", "Ana");
  g.start();
  try {
    const save = captureLocalRound(g, "classic");
    expect(validateLocalRound(save)).toBe(true);
    save.state.custom = true;
    expect(validateLocalRound(save)).toBe(false);
  } finally {
    g.dispose();
  }
});
it("validates unsupported tees, blocked greens, slopes and map limits before play", () => {
  const d = newWorkshop();
  d.start = { x: 10, z: 20 };
  expect(workshopIssues(d).join()).toContain("salida necesita");
  d.start = { x: 0, z: 9 };
  d.pieces.push(piece("wall", { z: -9 }));
  expect(workshopIssues(d).join()).toContain("plataforma de 4");
  d.pieces = [
    ...newWorkshop().pieces,
    piece("ramp", { x: 8, z: 0, width: 2, length: 2, endHeight: 4 }),
    piece("wall", { x: 0, z: 9 }),
    piece("sand", { x: 11, width: 6 }),
  ];
  const errors = workshopIssues(d).join();
  expect(errors).toContain("pendiente");
  expect(errors).toContain("dentro de una barrera");
  expect(errors).toContain("límites");
});
it("uses diagonal ramp geometry, raised platforms, rotating barriers and surface zones in the same engine", () => {
  const d = newWorkshop();
  d.pieces.push(
    piece("ramp", { x: 6, z: 0, width: 3, length: 8, endHeight: 2, angle: 20 }),
    piece("gate", { x: -3, z: 0 }),
    piece("sand", { z: 4, length: 3 }),
    piece("rough", { z: 0, length: 2 }),
    piece("water", { x: 9, z: 0, width: 4, length: 8 }),
  );
  const c = compileWorkshop(d);
  expect(c.blocks[0]).toMatchObject({ moving: true, motion: "slide" });
  expect(c.sand).toHaveLength(1);
  expect(c.rough).toHaveLength(1);
  expect(c.water![0].y).toBe(-1.4);
  expect(c.terrain!.some((b) => b.yaw && b.rotation)).toBe(true);
  const g = new Game(c);
  g.add("a", "Ana");
  g.startPractice(0);
  try {
    const before = g.bars[0].translation();
    for (let f = 0; f < 60; f++) g.tick();
    expect(g.bars[0].translation()).not.toEqual(before);
  } finally {
    g.dispose();
  }
  const raised = newWorkshop();
  raised.pieces[0].height = 2;
  raised.cup.height = 2;
  expect(compileWorkshop(raised).start.y).toBeCloseTo(2.24);
  expect(
    compileWorkshop(raised).terrain!.some((b) => surfaceHeight(b, 0, 9) === 2),
  ).toBe(true);
});
it("undoes drag-sized edits, redoes them and forks without resurrecting future actions", () => {
  const d = newWorkshop();
  let h = { past: [], present: d, future: [] } as any;
  h = workshopEdit(h, { ...d, name: "Puente" });
  h = workshopEdit(h, { ...h.present, start: { x: 2, z: 9 } });
  const final = h.present;
  h = workshopUndo(h);
  expect(h.present.start.x).toBe(0);
  h = workshopRedo(h);
  expect(h.present).toEqual(final);
  h = workshopUndo(h);
  h = workshopEdit(h, { ...h.present, name: "Otra ruta" });
  expect(h.future).toEqual([]);
  for (let i = 0; i < 100; i++)
    h = workshopEdit(h, { ...h.present, name: `Ruta ${i}` });
  expect(h.past).toHaveLength(60);
});
it("keeps workshop saves separate, tolerates corrupt entries and reports blocked storage", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  const d = newWorkshop();
  expect(saveWorkshopDraft(d)).toBe(true);
  expect(readWorkshopDraft()).toEqual(d);
  const save = { id: "one", doc: d, updated: new Date().toISOString() };
  saveWorkshopLibrary([save]);
  expect(readWorkshopLibrary()).toEqual([save]);
  values.set(
    WORKSHOP_LIBRARY_KEY,
    JSON.stringify([{}, save, save, { ...save, id: "broken", doc: {} }]),
  );
  expect(readWorkshopLibrary()).toEqual([save]);
  expect(() => saveWorkshopLibrary(Array(13).fill(save))).toThrow(/12/);
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  });
  expect(saveWorkshopDraft(d)).toBe(false);
  expect(readWorkshopLibrary()).toEqual([]);
  expect(() => saveWorkshopLibrary([save])).toThrow();
});

it("sandbox practice keeps mechanisms ticking without turn timeout penalties", () => {
  const g = new Game(compileWorkshop(newWorkshop()));
  g.add("a", "Ana");
  g.startPractice(0);
  try {
    for (let f = 0; f < 60 * 35; f++) g.tick();
    expect(g.state.time).toBeGreaterThan(30);
    expect(g.state.players[0].strokes).toBe(0);
    expect(g.state.players[0].penalties).toBe(0);
    expect(g.state.phase).toBe("playing");
  } finally {
    g.dispose();
  }
});
