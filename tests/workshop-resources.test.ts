import { beforeAll, expect, it } from "vitest";
import { Game, initPhysics } from "../shared/game";
import { blockPose, surfaceAt } from "../shared/courses";
import {
  newWorkshop,
  withWorkshopResources,
  withWorkshopPhysics,
  parseWorkshop,
  type WorkshopPiece,
} from "../shared/workshop";
import {
  validateRoomWorkshop,
  workshopFingerprint,
} from "../shared/roomWorkshop";
import { publicationInput } from "../shared/community";
import { workshopBlueprint } from "../shared/workshopBlueprints";
import { privateWorkshop, longWorkshop } from "./fixtures/workshop";
beforeAll(initPhysics);
const part = (
  kind: WorkshopPiece["kind"],
  patch: Partial<WorkshopPiece> = {},
): WorkshopPiece => ({
  id: kind,
  kind,
  x: 0,
  z: 0,
  width: 4,
  length: 0.6,
  height: 0,
  endHeight: 0,
  angle: 0,
  ...patch,
});
it("keeps both existing canonical identities and requires explicit format 3 for new resources", async () => {
  for (const [ed, hash] of [
    [1, "5221543e5046f4f036025f84f05a88902df4e2f47b69179899b78e7464c7f5c0"],
    [2, "e21ea1f8739ad90e227c090c632d9ac444532bf8931b9d9a6e4a8d007e5d754a"],
  ] as const) {
    const doc = withWorkshopPhysics(privateWorkshop(), ed);
    expect(await workshopFingerprint(validateRoomWorkshop(doc).canonical)).toBe(
      hash,
    );
    for (const kind of ["rotor", "lift", "dirt"] as const)
      expect(() =>
        parseWorkshop({ ...doc, pieces: [...doc.pieces, part(kind)] }),
      ).toThrow();
  }
  const d = withWorkshopResources(newWorkshop());
  expect(d).toMatchObject({ version: 3, physics: 2 });
  d.pieces.push(part("rotor"));
  expect(() => withWorkshopPhysics(d, 1)).toThrow(/Retira/);
  expect(withWorkshopPhysics(d, 2).version).toBe(3);
  expect(() => parseWorkshop({ ...d, physics: 1 })).toThrow();
});
it("validates the entire rotor sweep and prevents moving obstacles from crossing the tee or cup", () => {
  const d = withWorkshopResources(newWorkshop());
  for (const patch of [
    { x: 11, z: 0, width: 4, angle: 90 },
    { x: 0, z: 7, width: 6, angle: 90 },
    { x: 0, z: -6, width: 4, angle: 90 },
  ])
    expect(() =>
      validateRoomWorkshop({
        ...d,
        pieces: [...d.pieces, part("rotor", patch)],
      }),
    ).toThrow(/límites|salida|copa/);
  expect(() =>
    validateRoomWorkshop({
      ...d,
      pieces: [...d.pieces, part("lift", { z: 9 })],
    }),
  ).toThrow(/salida/);
});
it("counts all new mechanisms against the same online budget", () => {
  const d = withWorkshopResources(newWorkshop());
  d.pieces.push(
    ...Array.from({ length: 9 }, (_, i) =>
      part(i % 2 ? "rotor" : "lift", {
        id: `m${i}`,
        x: -7,
        z: 8 - i,
        width: 1,
        length: 0.5,
      }),
    ),
  );
  expect(() => validateRoomWorkshop(d)).toThrow(/presupuesto/);
});
it("compiles full rotation and vertical motion into real kinematic colliders using the shared pose", () => {
  const d = withWorkshopResources(newWorkshop());
  d.pieces.push(
    part("rotor", { x: 1.2 }),
    part("lift", { x: -3, z: 3, width: 1 }),
  );
  const v = validateRoomWorkshop(d),
    g = new Game(v.course, false, v.physics);
  try {
    g.add("a", "QA");
    g.startPractice(0);
    for (let i = 0; i < 118; i++) g.tick();
    const rotor = g.dynamicBlocks.find((b) => b.block.motion === "spin")!,
      lift = g.dynamicBlocks.find((b) => b.block.motion === "lift")!;
    expect(blockPose(rotor.block, g.state.time).yaw).toBeCloseTo(
      g.state.time * 0.8,
    );
    const q = rotor.body.rotation();
    expect(Math.abs(q.y)).toBeCloseTo(Math.sin((g.state.time * 0.8) / 2), 2);
    expect(lift.body.translation().y).toBeCloseTo(
      blockPose(lift.block, g.state.time).pos[1],
      4,
    );
    expect(lift.body.translation().y).toBeGreaterThan(1.9);
  } finally {
    g.dispose();
  }
});
it("dirt is a real surface with greater rolling resistance, not painted decoration", () => {
  const distances = [];
  for (const dirt of [false, true]) {
    const d = withWorkshopResources(longWorkshop());
    d.cup.x = 9;
    d.cup.z = -20;
    if (dirt) d.pieces.push(part("dirt", { width: 4, length: 44 }));
    const v = validateRoomWorkshop(d),
      g = new Game(v.course, false, v.physics);
    try {
      g.add("a", "QA");
      g.startPractice(0);
      expect(surfaceAt(v.course, { x: 0, y: 0.22, z: 0 })).toBe(
        dirt ? "dirt" : "grass",
      );
      g.shoot("a", 0, 0.75);
      while (g.state.moving) g.tick();
      expect(g.state.players[0].penalties).toBe(0);
      distances.push(20 - g.state.players[0].pos.z);
    } finally {
      g.dispose();
    }
  }
  expect(distances[1]).toBeLessThan(distances[0] * 0.8);
});
it("derives publication features from advanced geometry and actual moving mechanisms", () => {
  const p = publicationInput({
    document: workshopBlueprint("lock"),
    difficulty: "hard",
    description: "Un viaducto elevado con ruta alternativa.",
    authorName: "Autor real",
  });
  expect(p.features).toEqual(
    expect.arrayContaining(["dirt", "moving", "heights", "ramps", "water"]),
  );
  expect(p.stats.moving).toBe(1);
  expect(p.stats.maxHeight).toBe(2.5);
});
import { safeClock, safeLock, riskLock } from "./fixtures/blueprints";
it.each([
  ["clock", safeClock, 4],
  ["lock", safeLock, 4],
  ["lock", riskLock, 3],
] as const)(
  "blueprint %s completes its real route without penalties",
  (id, route, score) => {
    const v = validateRoomWorkshop(workshopBlueprint(id)),
      g = new Game(v.course, false, v.physics);
    try {
      g.add("a", "QA");
      g.startPractice(0);
      for (const [a, p] of route) {
        expect(g.shoot("a", a, p)).toBe(true);
        while (g.state.moving) g.tick();
      }
      expect(g.state.phase).toBe("finished");
      expect(g.state.players[0].scores).toEqual([score]);
      expect(g.state.players[0].penalties).toBe(0);
    } finally {
      g.dispose();
    }
  },
);
it("the clock blueprint permits a difficult genuine ace when the rotor is timed, without changing ball position", () => {
  const v = validateRoomWorkshop(workshopBlueprint("clock")),
    g = new Game(v.course, false, v.physics);
  try {
    g.add("a", "QA");
    g.startPractice(0);
    for (let n = 0; n < 55; n++) g.tick();
    g.shoot("a", 0, 0.914);
    while (g.state.moving) g.tick();
    expect(g.state.players[0].scores).toEqual([1]);
    expect(g.state.players[0].penalties).toBe(0);
  } finally {
    g.dispose();
  }
});
