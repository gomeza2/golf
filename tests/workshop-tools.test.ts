import { expect, it } from "vitest";
import { newWorkshop, type WorkshopPiece } from "../shared/workshop";
import {
  moveWorkshopPieces,
  transformWorkshopSelection as transform,
} from "../shared/workshopTools";
import { diagnoseWorkshop } from "../shared/workshopDiagnostics";
import { workshopEdit, workshopUndo } from "../src/workshopStorage";
const wall = (id: string, x: number, z = 1): WorkshopPiece => ({
  id,
  kind: "wall",
  x,
  z,
  width: 2,
  length: 0.6,
  height: 0,
  endHeight: 0,
  angle: 0,
});
const design = () => ({
  ...newWorkshop(),
  pieces: [...newWorkshop().pieces, wall("a", -2), wall("b", 2)],
});
it("moves a group rigidly, leaves markers/unselected pieces unchanged and rejects partial boundary clamps", () => {
  const d = design(),
    next = moveWorkshopPieces(d, ["a", "b"], 0.1, -0.5);
  expect(next.pieces.slice(1).map((p) => [p.x, p.z])).toEqual([
    [-1.9, 0.5],
    [2.1, 0.5],
  ]);
  expect(next.start).toEqual(d.start);
  expect(next.cup).toEqual(d.cup);
  expect(next.pieces[0]).toEqual(d.pieces[0]);
  expect(d.pieces[1].x).toBe(-2);
  expect(() => moveWorkshopPieces(d, ["a", "b"], 10, 0)).toThrow();
  expect(d.pieces[2].x).toBe(2);
  expect(() => moveWorkshopPieces(d, ["a"], Infinity, 0)).toThrow();
});
it("rotates around the group centre with the same yaw convention as the course", () => {
  const d = design(),
    next = transform(d, ["a", "b"], "rotate").doc;
  expect(next.pieces.slice(1).map((p) => [p.x, p.z, p.angle])).toEqual([
    [0, 3, 90],
    [0, -1, 90],
  ]);
  let full = d;
  for (let i = 0; i < 4; i++) full = transform(full, ["a", "b"], "rotate").doc;
  expect(full).toEqual(d);
});
it("rotates surface rectangles by exchanging dimensions without invalid zone angles", () => {
  const d = design();
  d.pieces.push({ ...wall("sand", 4, 3), kind: "sand", width: 4, length: 2 });
  const p = transform(d, ["sand"], "rotate").doc.pieces.at(-1)!;
  expect(p).toMatchObject({ x: 4, z: 3, width: 2, length: 4, angle: 0 });
});
it("aligns centres, duplicates with new IDs and enforces the capacity atomically", () => {
  const d = design();
  expect(
    transform(d, ["a", "b"], "alignX")
      .doc.pieces.slice(1)
      .map((p) => p.x),
  ).toEqual([0, 0]);
  let n = 0;
  const copy = transform(d, ["a", "b"], "duplicate", 0.5, () => `copy-${n++}`);
  expect(copy.ids).toEqual(["copy-0", "copy-1"]);
  expect(copy.doc.pieces.slice(-2).map((p) => [p.x, p.z])).toEqual([
    [-1.5, 1.5],
    [2.5, 1.5],
  ]);
  expect(transform(copy.doc, copy.ids, "delete").doc).toEqual(d);
  const full = {
    ...d,
    pieces: Array.from({ length: 80 }, (_, i) => wall(`p-${i}`, 0)),
  };
  expect(() => transform(full, ["p-0", "p-1"], "duplicate")).toThrow(/80/);
  expect(full.pieces).toHaveLength(80);
});
it("records one group operation as one undo entry", () => {
  const d = design(),
    h = workshopEdit(
      { past: [], present: d, future: [] },
      transform(d, ["a", "b"], "right").doc,
    );
  expect(h.past).toHaveLength(1);
  expect(workshopUndo(h).present).toEqual(d);
});
it("keeps a joined floor clear and warns about disconnected islands without certifying shot feasibility", () => {
  expect(
    diagnoseWorkshop(newWorkshop()).filter((d) => d.kind === "connection"),
  ).toEqual([]);
  const d = newWorkshop();
  d.pieces[0].length = 5;
  d.pieces[0].z = 9;
  const warnings = diagnoseWorkshop(d);
  expect(warnings.some((d) => d.kind === "connection")).toBe(true);
  expect(warnings.some((d) => d.kind === "unused")).toBe(true);
});
it("detects sand over voids or at the wrong level while allowing supported patches", () => {
  const d = design();
  d.pieces.push({ ...wall("sand", 0, 4), kind: "sand", width: 2, length: 2 });
  expect(diagnoseWorkshop(d).filter((d) => d.kind === "surface")).toEqual([]);
  d.pieces.at(-1)!.height = 2;
  expect(diagnoseWorkshop(d).some((d) => d.kind === "surface")).toBe(true);
  d.pieces.at(-1)!.height = 0;
  d.pieces.at(-1)!.x = 10;
  expect(diagnoseWorkshop(d).find((d) => d.kind === "surface")!.pieces).toEqual(
    ["sand"],
  );
});
it("connects a continuous legal ramp to an elevated cup platform", () => {
  const d = newWorkshop();
  d.start = { x: 0, z: 9 };
  d.cup = { x: 0, z: -9, height: 2 };
  d.pieces = [
    { ...d.pieces[0], length: 8, z: 8 },
    {
      ...d.pieces[0],
      id: "slope",
      kind: "ramp",
      length: 8,
      width: 4,
      z: 0,
      endHeight: 2,
    },
    { ...d.pieces[0], id: "top", length: 8, z: -8, height: 2 },
  ];
  expect(diagnoseWorkshop(d).filter((d) => d.kind === "connection")).toEqual(
    [],
  );
});
