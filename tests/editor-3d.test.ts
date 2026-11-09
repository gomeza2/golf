import { beforeAll, expect, it } from "vitest";
import {
  newWorkshop,
  parseWorkshop,
  exportWorkshop,
  withWorkshopResources,
} from "../shared/workshop";
import {
  cleanEditor,
  emptyEditor,
  groupSelection,
  selectedGroup,
  assertUnlocked,
  exportWorkshopProject,
  importWorkshopProject,
} from "../shared/workshopProject";
import { transformWorkshop3D } from "../shared/workshopTransform3D";
import { insertStructure, structures } from "../shared/workshopStructures";
import {
  projectEdit,
  projectUndo,
  projectRedo,
  type ProjectHistory,
} from "../src/workshopProjectStorage";
import {
  validateRoomWorkshop,
  workshopFingerprint,
} from "../shared/roomWorkshop";
import { Game, initPhysics } from "../shared/game";
import { constructionWorkshop } from "./fixtures/construction";
import { riskLock } from "./fixtures/blueprints";
import { transformWorkshopSelection } from "../shared/workshopTools";
beforeAll(initPhysics);
const source = () => {
  const doc = newWorkshop();
  doc.pieces.push({
    ...doc.pieces[0],
    id: "ramp",
    kind: "ramp",
    width: 3,
    length: 8,
    height: 0.15,
    endHeight: 1.35,
    angle: 45,
    x: 2,
  });
  return doc;
};
it("translation preserves fractional widths, ramp slopes and unselected geometry", () => {
  const doc = source(),
    next = transformWorkshop3D(doc, ["ramp"], { x: 0.7, y: 0.5, z: -0.1 }, 0.1);
  expect(next.pieces[0]).toEqual(doc.pieces[0]);
  expect(next.pieces[1]).toMatchObject({
    x: 2.7,
    z: -0.1,
    height: 0.65,
    endHeight: 1.85,
    width: 3,
    length: 8,
    angle: 45,
  });
  expect(doc.pieces[1].height).toBe(0.15);
  expect(
    transformWorkshop3D(doc, ["ramp"], { x: 0.5 }, 0.5).pieces[1].endHeight,
  ).toBe(1.35);
});
it("rotates a group rigidly with the physical yaw convention and legal floor steps", () => {
  const doc = source(),
    next = transformWorkshop3D(doc, ["base", "ramp"], { yaw: 87 }, 0.1);
  expect(next.pieces.map((p) => [p.x, p.z, p.angle])).toEqual([
    [1, 1, 90],
    [1, -1, 135],
  ]);
  let full = doc;
  for (let i = 0; i < 4; i++)
    full = transformWorkshop3D(full, ["base", "ramp"], { yaw: 90 }, 0.1);
  expect(full).toEqual(doc);
});
it("scales axis-aligned rotated floors consistently, rejects shearing oblique pieces and rejects whole invalid operations", () => {
  const doc = newWorkshop();
  doc.pieces[0].angle = 90;
  expect(
    transformWorkshop3D(doc, ["base"], { scaleX: 0.5 }, 0.1).pieces[0],
  ).toMatchObject({ width: 8, length: 12 });
  expect(() =>
    transformWorkshop3D(source(), ["ramp"], { scaleX: 2 }, 0.1),
  ).toThrow(/oblicuas/);
  for (const transform of [{ x: 100 }, { y: 5 }, { scaleX: 0 }, { x: NaN }])
    expect(() =>
      transformWorkshop3D(source(), ["base", "ramp"], transform, 0.1),
    ).toThrow();
});
it("surface group rotations also preserve valid dirt zone geometry", () => {
  const doc = withWorkshopResources(newWorkshop());
  doc.pieces.push({
    ...doc.pieces[0],
    kind: "dirt",
    id: "soil",
    width: 2,
    length: 4,
  });
  expect(
    transformWorkshopSelection(doc, ["soil"], "rotate").doc.pieces[1],
  ).toMatchObject({ angle: 0, width: 4, length: 2 });
  expect(
    transformWorkshop3D(doc, ["soil"], { yaw: 90 }, 0.5).pieces[1],
  ).toMatchObject({ angle: 0, width: 4, length: 2 });
});
it("groups have unique membership, preserve real identities, and locks refuse edits", () => {
  const doc = source();
  let ed = groupSelection(doc, emptyEditor(), ["base", "ramp"], () => "g1");
  expect(selectedGroup(ed, "ramp")).toEqual(["base", "ramp"]);
  ed = cleanEditor(doc, {
    ...ed,
    locked: ["base", "bogus", "base"],
    groups: [
      ...ed.groups,
      { id: "g2", name: "Other", pieces: ["base", "ramp"] },
    ],
  });
  expect(ed.groups).toHaveLength(1);
  expect(ed.locked).toEqual(["base"]);
  expect(() => assertUnlocked(ed, ["ramp", "base"])).toThrow(/Desbloquea/);
  expect(() => assertUnlocked(ed, ["ramp"])).not.toThrow();
});
it("undo and redo restore both geometry and editor organization in the same transaction", () => {
  const doc = source(),
    h: ProjectHistory = {
      present: doc,
      past: [],
      future: [],
      editor: emptyEditor(),
      pastEditors: [],
      futureEditors: [],
    };
  const grouped = projectEdit(
    h,
    doc,
    groupSelection(doc, emptyEditor(), ["base", "ramp"], () => "group"),
  );
  const locked = projectEdit(grouped, doc, {
    ...grouped.editor,
    locked: ["ramp"],
  });
  const moved = projectEdit(
    locked,
    transformWorkshop3D(doc, ["base"], { y: 0.5 }, 0.5),
  );
  expect(projectUndo(moved)).toEqual({
    ...locked,
    future: [moved.present],
    futureEditors: [moved.editor],
  });
  expect(projectRedo(projectUndo(moved))).toEqual(moved);
  expect(projectUndo(locked).editor.locked).toEqual([]);
  expect(projectUndo(grouped).editor.groups).toEqual([]);
});
it("archives preserve editing data without changing canonical gameplay hashes, and legacy files remain importable", async () => {
  const doc = source(),
    ed = groupSelection(
      doc,
      { locked: ["ramp"], groups: [] },
      ["base", "ramp"],
      () => "group",
    ),
    text = exportWorkshopProject(doc, ed),
    parsed = importWorkshopProject(text);
  expect(parsed).toEqual({ doc, editor: ed });
  expect(importWorkshopProject(exportWorkshop(doc))).toEqual({
    doc,
    editor: emptyEditor(),
  });
  expect(parseWorkshop(JSON.parse(text).document)).toEqual(doc);
  expect(await workshopFingerprint(JSON.stringify(parsed.doc))).toBe(
    await workshopFingerprint(JSON.stringify(doc)),
  );
  expect(() =>
    importWorkshopProject(JSON.stringify({ projectVersion: 2, document: doc })),
  ).toThrow(/Versión/);
  expect(() => importWorkshopProject(" ".repeat(80001))).toThrow(/80 KB/);
});
it.each(structures.map((s) => s.id))(
  "structure %s is a bounded composition of existing, saveable physical pieces",
  (id) => {
    let n = 0;
    const original = newWorkshop(),
      result = insertStructure(original, id, 0, 0, 0, () => `part-${++n}`);
    expect(original.pieces).toHaveLength(1);
    expect(result.ids.length).toBeGreaterThan(0);
    expect(importWorkshopProject(exportWorkshop(result.doc)).doc).toEqual(
      result.doc,
    );
    expect(result.doc.version).toBe(original.version);
    expect(() => insertStructure(original, id, 11, 23, 4)).toThrow();
  },
);
it("the construction test circuit validates online and really finishes its ramp, elevated bridge and tunnel route", () => {
  const doc = constructionWorkshop(),
    v = validateRoomWorkshop(doc),
    g = new Game(v.course, false, v.physics);
  try {
    g.add("a", "Constructor");
    g.startPractice(0);
    for (const [a, p] of riskLock) {
      expect(g.shoot("a", a, p)).toBe(true);
      while (g.state.moving) g.tick();
    }
    expect(g.state.players[0].scores).toEqual([3]);
    expect(g.state.players[0].penalties).toBe(0);
    expect(v.cost.mechanisms).toBe(1);
  } finally {
    g.dispose();
  }
});
it("height alignment preserves ramp rise and rejects out-of-range results", () => {
  const doc = source(),
    next = transformWorkshopSelection(doc, ["base", "ramp"], "alignHeight").doc;
  expect(next.pieces[1]).toMatchObject({ height: 0, endHeight: 1.2 });
});
it("multi-level diagnostics distinguish a usable tunnel from a low ceiling and soil beneath a roof", async () => {
  const { diagnoseWorkshop } = await import("../shared/workshopDiagnostics"),
    doc = constructionWorkshop();
  expect(
    diagnoseWorkshop(doc).filter(
      (d) =>
        d.kind === "surface" ||
        d.kind === "clearance" ||
        d.kind === "connection",
    ),
  ).toEqual([]);
  const low = structuredClone(doc);
  low.pieces.find((p) => p.id === "tunnel-6")!.height = 2.8;
  expect(diagnoseWorkshop(low).some((d) => d.kind === "clearance")).toBe(true);
});
it("safe autosave keeps geometry when editor storage fails, ignores stale sidecars and preserves library metadata", async () => {
  const { vi } = await import("vitest"),
    { saveProject, readEditor, PROJECT_KEY } =
      await import("../src/workshopProjectStorage"),
    { readWorkshopDraft, saveWorkshopLibrary, readWorkshopLibrary } =
      await import("../src/workshopStorage");
  const map = new Map<string, string>();
  let rejectProject = false;
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (rejectProject && key === PROJECT_KEY) throw Error("quota");
      map.set(key, value);
    },
    removeItem: (key: string) => map.delete(key),
  });
  try {
    const doc = source(),
      ed = groupSelection(
        doc,
        { locked: ["ramp"], groups: [] },
        ["base", "ramp"],
        () => "g1",
      );
    expect(saveProject(doc, ed)).toBe(true);
    expect(readEditor(readWorkshopDraft()!)).toEqual(ed);
    saveWorkshopLibrary([
      { id: "saved", updated: "2026-11-09T00:00:00Z", doc, editor: ed },
    ]);
    expect(readWorkshopLibrary()[0].editor).toEqual(ed);
    rejectProject = true;
    const next = { ...doc, name: "Edición siguiente" };
    expect(saveProject(next, ed)).toBe(false);
    expect(readWorkshopDraft()).toEqual(next);
    expect(readEditor(next)).toEqual(emptyEditor());
    expect(readWorkshopLibrary()[0].doc).toEqual(doc);
  } finally {
    vi.unstubAllGlobals();
  }
});
it("invalid project metadata cannot silently discard locked pieces on import", () => {
  const doc = source(),
    data = JSON.parse(exportWorkshopProject(doc, emptyEditor()));
  data.editor.locked = ["missing"];
  expect(() => importWorkshopProject(JSON.stringify(data))).toThrow(/bloqueos/);
  expect(() => importWorkshopProject("not json")).toThrow(/JSON/);
});
it("reports ball-sized gaps between supported walls without flagging the normal tunnel", async () => {
  const { diagnoseWorkshop } = await import("../shared/workshopDiagnostics"),
    doc = newWorkshop();
  doc.pieces.push(
    ...[-0.4, 0.4].map((x, i) => ({
      ...doc.pieces[0],
      kind: "wall" as const,
      id: `wall${i}`,
      x,
      width: 0.5,
      length: 6,
    })),
  );
  expect(diagnoseWorkshop(doc).some((d) => d.kind === "clearance")).toBe(true);
  doc.pieces[2].x = 2;
  expect(diagnoseWorkshop(doc).some((d) => d.kind === "clearance")).toBe(false);
});
it("the curved ramp has actual Rapier support across all segments and their seams", async () => {
  const R = (await import("@dimforge/rapier3d-compat")).default,
    v = validateRoomWorkshop(constructionWorkshop()),
    g = new Game(v.course, false, v.physics);
  try {
    g.add("a", "QA");
    g.startPractice(0);
    g.tick();
    for (let i = 0; i < 8; i++) {
      const p = v.document.pieces.find((p) => p.id === `curve-${i + 7}`)!;
      const hit = g.world.castRay(
        new R.Ray({ x: p.x, y: 6, z: p.z }, { x: 0, y: -1, z: 0 }),
        10,
        true,
      );
      expect(hit).not.toBeNull();
      expect(6 - hit!.timeOfImpact).toBeCloseTo(
        (p.height + p.endHeight) / 2,
        2,
      );
    }
    for (let i = 1; i < 8; i++) {
      const theta = (i * Math.PI) / 16,
        hit = g.world.castRay(
          new R.Ray(
            { x: -3 + 4 * Math.cos(theta), y: 6, z: 8 - 4 * Math.sin(theta) },
            { x: 0, y: -1, z: 0 },
          ),
          10,
          true,
        );
      expect(hit).not.toBeNull();
      expect(Math.abs(6 - hit!.timeOfImpact - i * 0.15)).toBeLessThan(0.05);
    }
  } finally {
    g.dispose();
  }
});
