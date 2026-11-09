import { afterEach, beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import {
  frontierCourses,
  deck,
  geometry,
  getCircuit,
  rollingResistance,
  surfaceAt,
  surfaceFriction,
  surfaceHeight,
  type Course,
  type SurfaceKind,
  type V3,
} from "../shared/courses";
import { Game, initPhysics } from "../shared/game";

beforeAll(initPhysics);
const games: Game[] = [];
afterEach(() => games.splice(0).forEach((game) => game.dispose()));

const surfaceNames: SurfaceKind[] = [
  "grass",
  "rough",
  "dirt",
  "sand",
  "stone",
  "wood",
  "wet",
];
const patchNames = ["rough", "dirt", "sand", "stone", "wood", "wet"] as const;

function assertFiniteCourse(course: Course) {
  const values = [
    course.start.x,
    course.start.y,
    course.start.z,
    course.cup.x,
    course.cup.y,
    course.cup.z,
    course.dimensions?.width,
    course.dimensions?.length,
    course.routeLength,
    ...(course.terrain || []).flatMap((block) => [
      ...block.pos,
      ...block.size,
      block.rotation || 0,
      block.yaw || 0,
    ]),
    ...(course.blocks || []).flatMap((block) => [
      ...block.pos,
      ...block.size,
      block.rotation || 0,
      block.yaw || 0,
    ]),
  ];
  expect(values.every(Number.isFinite)).toBe(true);
  expect((course.dimensions?.width || 0) > 0).toBe(true);
  expect((course.dimensions?.length || 0) > 0).toBe(true);
  expect((course.routeLength || 0) > 0).toBe(true);
  for (const block of [...(course.terrain || []), ...course.blocks]) {
    expect(block.size.every((size) => size > 0)).toBe(true);
  }
}

it("adds four long expeditions without changing the championship, nine-hole or previous circuit identities", () => {
  expect(frontierCourses).toHaveLength(4);
  expect(getCircuit("expeditions").courses).toBe(frontierCourses);
  expect(frontierCourses.map((course) => course.routeLength)).toEqual([
    156, 196, 176, 243,
  ]);
  expect(frontierCourses.every((course) => course.dimensions!.length >= 160)).toBe(
    true,
  );
  expect(getCircuit("tour").courses).toHaveLength(18);
  expect(getCircuit("nine").courses).toHaveLength(9);
  expect(getCircuit("wildlands").courses).toHaveLength(3);
  frontierCourses.forEach(assertFiniteCourse);
});

it("resolves overlapping surface patches using the same priority as the ball physics", () => {
  const coast = frontierCourses.find((course) => course.ambience === "coast")!;
  expect(
    surfaceAt(coast, { x: 32, y: 0.22, z: -49 }),
  ).toBe("stone"); // The stone landing sits on the sandy island.
  expect(
    surfaceAt(coast, { x: 32, y: 1.22, z: -49 }),
  ).toBe("grass"); // A ball above the deck must not inherit its ground material.

  const mountain = frontierCourses.find(
    (course) => course.ambience === "mountain",
  )!;
  expect(
    surfaceAt(mountain, { x: 0, y: 2.22, z: -35 }),
  ).toBe("wet"); // A small wet patch overlays the stone terrace.
  expect(
    surfaceAt(mountain, { x: 0, y: 3.22, z: -35 }),
  ).toBe("grass");
});

it("does not place an expedition ramp underneath a deck without ball clearance", () => {
  for (const course of frontierCourses) {
    const surfaces = geometry(course).surfaces;
    const ramps = surfaces.filter(
      (surface) => Math.abs(surface.rotation || 0) > 1e-5,
    );
    for (const ramp of ramps) {
      const pitch = ramp.rotation || 0;
      const yaw = ramp.yaw || 0;
      for (const fraction of [0.2, 0.4, 0.6, 0.8]) {
        const localZ =
          (fraction - 0.5) * Math.cos(pitch) * ramp.size[2] +
          Math.sin(pitch) * ramp.size[1] / 2;
        const x = ramp.pos[0] + Math.sin(yaw) * localZ;
        const z = ramp.pos[2] + Math.cos(yaw) * localZ;
        const rampHeight = surfaceHeight(ramp, x, z);
        if (rampHeight === null) continue;
        for (const deck of surfaces) {
          if (deck === ramp || Math.abs(deck.rotation || 0) > 1e-5)
            continue;
          const deckHeight = surfaceHeight(deck, x, z);
          if (deckHeight === null || deckHeight <= rampHeight + 0.55)
            continue;
          const underside = deckHeight - deck.size[1];
          const clearance = underside - (rampHeight + 0.44);
          expect(
            clearance,
            `${course.name}: ramp at (${x.toFixed(2)}, ${z.toFixed(2)}) is trapped under a deck with only ${clearance.toFixed(2)} m of ball clearance`,
          ).toBeGreaterThan(0.15);
        }
      }
    }
  }
});

it("keeps every playable expedition platform above the out-of-world limit", () => {
  for (const course of frontierCourses) {
    const surfaces = geometry(course).surfaces;
    expect(surfaces.length, course.name).toBeGreaterThan(0);
    for (const surface of surfaces) {
      const lowestPoint = surface.pos[1] - surface.size[1] / 2;
      expect(
        lowestPoint,
        `${course.name}: platform at ${surface.pos.join(", ")} falls below the world boundary`,
      ).toBeGreaterThan(-4);
      expect(
        surface.pos[1] + surface.size[1] / 2,
        `${course.name}: platform rises beyond the intended build envelope`,
      ).toBeLessThan(18);
    }
  }
});

it("connects both ends of every expedition ramp to real deck support or the cup green", () => {
  for (const course of frontierCourses) {
    const surfaces = geometry(course).surfaces;
    const ramps = surfaces.filter((surface) => Math.abs(surface.rotation || 0) > 1e-5);
    expect(ramps.length, course.name).toBeGreaterThan(0);
    for (const ramp of ramps) {
      const yaw = ramp.yaw || 0;
      const pitch = ramp.rotation || 0;
      for (const side of [-1, 1]) {
        // Convert the ramp's 3D edge to its horizontal projection before
        // asking the shared collision-height function for the endpoint.
        const localZ =
          side * Math.cos(pitch) * ramp.size[2] / 2 +
          Math.sin(pitch) * ramp.size[1] / 2;
        const x = ramp.pos[0] + Math.sin(yaw) * localZ;
        const z = ramp.pos[2] + Math.cos(yaw) * localZ;
        const height = surfaceHeight(ramp, x, z);
        expect(
          height,
          `${course.name}: ramp edge side=${side} yaw=${yaw.toFixed(3)} pitch=${pitch.toFixed(3)} pos=${ramp.pos.join(",")} size=${ramp.size.join(",")}`,
        ).not.toBeNull();
        const supportedByDeck = surfaces.some((surface) => {
          if (surface === ramp || Math.abs(surface.rotation || 0) > 1e-5)
            return false;
          const deckHeight = surfaceHeight(surface, x, z);
          return deckHeight !== null && Math.abs(deckHeight - height!) < 0.3;
        });
        const green = course.greenBounds;
        const supportedByGreen =
          !!green &&
          x >= green.minX - 0.15 &&
          x <= green.maxX + 0.15 &&
          z >= green.minZ - 0.15 &&
          z <= green.maxZ + 0.15 &&
          Math.abs(height! - course.cup.y) < 0.3;
        expect(
          supportedByDeck || supportedByGreen,
          `${course.name}: ramp endpoint (${x.toFixed(2)}, ${height!.toFixed(2)}, ${z.toFixed(2)}) has no matching playable support`,
        ).toBe(true);
      }
    }
  }
});

it("gives every new surface a matching physical classification and distinct contact response", () => {
  for (const kind of patchNames) {
    const course = frontierCourses.find((item) => item[kind]?.length);
    expect(course, `missing course zone for ${kind}`).toBeDefined();
    const zone = course![kind]![0];
    expect(
      surfaceAt(course!, {
        x: zone.x,
        y: zone.y + 0.22,
        z: zone.z,
      }),
    ).toBe(kind);
  }
  expect(new Set(surfaceNames.map((name) => rollingResistance[name])).size).toBe(
    surfaceNames.length,
  );
  expect(
    new Set(
      [surfaceFriction.stone, surfaceFriction.wood, surfaceFriction.wet],
    ).size,
  ).toBe(3);
  for (const legacy of ["grass", "rough", "dirt", "sand"] as const)
    expect(surfaceFriction[legacy]).toBe(0.02);
});

it("applies surface contact friction and rolling resistance in the real Rapier simulation", () => {
  const laboratory: Course = {
    name: "Laboratorio de superficies",
    par: 3,
    subtitle: "Pista de prueba para comparar superficies con física real.",
    dimensions: { width: 40, length: 40 },
    start: { x: -12, y: 0.22, z: 12 },
    cup: { x: 12, y: 0, z: -12 },
    blocks: [],
    terrain: [deck(0, 0, 38, 38)],
    wood: [{ x: -10, z: 0, width: 8, length: 10, y: 0 }],
    stone: [{ x: 0, z: 0, width: 8, length: 10, y: 0 }],
    wet: [{ x: 10, z: 0, width: 8, length: 10, y: 0 }],
  };

  function roll(kind: "wood" | "stone" | "wet") {
    const zone = laboratory[kind]![0];
    const game = new Game(laboratory, false, 2);
    games.push(game);
    game.add("surface-player", "Surface test");
    game.start();
    game.state.players[0].pos = {
      x: zone.x,
      y: zone.y + 0.22,
      z: 2,
    };
    game.place();
    expect(surfaceAt(laboratory, game.state.players[0].pos)).toBe(kind);
    expect(game.shoot("surface-player", 0, 0.12)).toBe(true);
    game.tick();
    expect(game.ball.collider(0).friction()).toBeCloseTo(
      surfaceFriction[kind],
      6,
    );

    for (let frame = 0; frame < 40 && game.state.moving; frame++)
      game.tick();
    return Math.abs(game.state.players[0].pos.z - 2);
  }

  const woodDistance = roll("wood");
  const stoneDistance = roll("stone");
  const wetDistance = roll("wet");
  expect(woodDistance).toBeLessThan(stoneDistance);
  expect(stoneDistance).toBeLessThan(wetDistance);
});

type RouteTarget = {
  x: number;
  y: number;
  z: number;
  radius: number;
};

const expeditionSafeRoutes = [
  [
    "La ruta de los arrayanes",
    0,
    [
      { x: -8, y: 2.22, z: 31, radius: 6.5 },
      { x: 18, y: 0.22, z: -18, radius: 6.5 },
      { x: 24, y: 3.22, z: -47, radius: 6.5 },
      { x: 24, y: 3.22, z: -54, radius: 4.8 },
      { x: 26, y: 0.22, z: -68, radius: 1.2 },
    ],
  ],
  [
    "Dunas de cobre",
    1,
    [
      { x: -10, y: 4.22, z: 29, radius: 8 },
      { x: 18, y: 7.22, z: -1, radius: 8 },
      { x: 1, y: 3.22, z: -38, radius: 8 },
      { x: 30, y: 0.22, z: -65, radius: 8 },
      { x: 32, y: 0.22, z: -76, radius: 1.4 },
    ],
  ],
  [
    "Archipiélago azul",
    2,
    [
      { x: -9, y: 0.22, z: 28, radius: 8 },
      { x: 18, y: 1.22, z: -9, radius: 8 },
      { x: 32, y: 0.22, z: -49, radius: 8 },
      { x: 34, y: 0.22, z: -60, radius: 7 },
      { x: 34, y: 0.22, z: -76, radius: 1.4 },
    ],
  ],
  [
    "La cresta del cóndor",
    3,
    [
      { x: -10, y: 8.22, z: 42, radius: 8 },
      { x: 30, y: 5.22, z: 6, radius: 8 },
      { x: 0, y: 2.22, z: -35, radius: 8 },
      { x: 38, y: 0.22, z: -75, radius: 8 },
      { x: 40, y: 0.22, z: -86, radius: 1.4 },
    ],
  ],
] as const satisfies readonly [
  string,
  number,
  readonly RouteTarget[],
][];

it.each(expeditionSafeRoutes)(
  "%s completes its safe route using continuous real shots and no repositioning",
  (_courseName, holeIndex, targets) => {
    const game = new Game();
    games.push(game);
    game.selectCircuit("expeditions");
    game.add("route-player", "Explorador");
    game.startPractice(holeIndex);

    const resetTrial = (
      position: { x: number; y: number; z: number },
      time: number,
    ) => {
      const player = game.state.players[0];
      player.pos = { ...position };
      player.done = false;
      player.withdrawn = false;
      player.penalties = 0;
      player.strokes = 0;
      player.capped = [];
      game.state.phase = "playing";
      game.state.turn = 0;
      game.state.moving = false;
      game.state.time = time;
      game.state.event = undefined;
      game.elapsed = 0;
      game.quiet = 0;
      game.capturedAt = null;
      game.lastBounce = -1;
      game.place();
      game.tick();
    };
    const distance = (
      a: { x: number; y: number; z: number },
      b: { x: number; y: number; z: number },
    ) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4, a.z - b.z);
    let current = { ...game.state.players[0].pos };
    let routeTime = game.state.time;
    const offsets = [-0.55, -0.27, 0, 0.27, 0.55];
    const powers = [0.12, 0.2, 0.28, 0.38, 0.52, 0.66, 0.8, 0.94];

    for (const [targetIndex, target] of targets.entries()) {
      let successfulShots = 0;
      while (
        distance(current, target) > target.radius &&
        successfulShots < 5 &&
        !game.state.players[0].done
      ) {
        const baseAngle = Math.atan2(
          target.x - current.x,
          current.z - target.z,
        );
        let best:
          | {
              angle: number;
              power: number;
              position: { x: number; y: number; z: number };
              score: number;
            }
          | undefined;
        const candidateDiagnostics: {
          angle: number;
          power: number;
          position: { x: number; y: number; z: number };
          penalties: number;
          supported: boolean;
          score: number | null;
        }[] = [];
        const startingScore = distance(current, target);

        for (const offset of offsets) {
          for (const power of powers) {
            resetTrial(current, routeTime);
            const angle = baseAngle + offset;
            expect(game.shoot("route-player", angle, power)).toBe(true);
            let frames = 0;
            while (game.state.moving && frames++ < 720) game.tick();
            const player = game.state.players[0];
            const position = { ...player.pos };
            if (game.state.moving || player.penalties > 0) {
              candidateDiagnostics.push({
                angle: Number(angle.toFixed(3)),
                power,
                position,
                penalties: player.penalties,
                supported: false,
                score: null,
              });
              continue;
            }
            if (player.done) {
              best = { angle, power, position, score: 0 };
              candidateDiagnostics.push({
                angle: Number(angle.toFixed(3)),
                power,
                position,
                penalties: 0,
                supported: true,
                score: 0,
              });
              break;
            }
            const support = game.world.castRay(
              new R.Ray(
                { x: position.x, y: position.y + 1.1, z: position.z },
                { x: 0, y: -1, z: 0 },
              ),
              2.2,
              true,
              undefined,
              undefined,
              undefined,
              game.ball,
            );
            const score = distance(position, target);
            candidateDiagnostics.push({
              angle: Number(angle.toFixed(3)),
              power,
              position,
              penalties: 0,
              supported: !!support,
              score: support ? Number(score.toFixed(2)) : null,
            });
            if (
              support &&
              score + 0.4 < startingScore &&
              (!best || score < best.score)
            )
              best = { angle, power, position, score };
          }
          if (best?.score === 0) break;
        }

        expect(
          best,
          `${_courseName}: safe route stalled before checkpoint ${targetIndex + 1} at ${current.x.toFixed(1)},${current.y.toFixed(1)},${current.z.toFixed(1)}; target ${target.x},${target.y},${target.z}; candidates ${JSON.stringify(candidateDiagnostics.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999)).slice(0, 12))}`,
        ).toBeDefined();

        // Candidate trials compare shots. Only the selected shot is applied
        // to the continuous route; the ball never teleports between targets.
        resetTrial(current, routeTime);
        expect(game.shoot("route-player", best!.angle, best!.power)).toBe(true);
        let frames = 0;
        while (game.state.moving && frames++ < 720) game.tick();
        expect(game.state.moving).toBe(false);
        expect(game.state.players[0].penalties).toBe(0);
        current = { ...game.state.players[0].pos };
        routeTime = game.state.time;
        successfulShots++;
      }
      if (targetIndex < targets.length - 1)
        expect(
          distance(current, target),
          `${_courseName}: route did not reach checkpoint ${targetIndex + 1}`,
        ).toBeLessThanOrEqual(target.radius);
    }

    expect(game.state.players[0].done).toBe(true);
    expect(game.state.players[0].penalties).toBe(0);
    expect(game.state.phase).toBe("finished");
  },
  180000,
);


type ShortcutRoute = {
  name: string;
  index: number;
  points: V3[];
  width: number;
  checkpoints?: number[];
  checkpointRadii?: number[];
  shotOffsets?: number[];
};

const shortcutRoutes: ShortcutRoute[] = [
  {
    name: "La ruta de los arrayanes",
    index: 0,
    points: [
      { x: -18, y: 0, z: 51 },
      { x: 15, y: 0, z: -7 },
    ],
    width: 1.8,
  },
  {
    name: "Dunas de cobre",
    index: 1,
    points: [
      { x: -40, y: 0, z: 56 },
      { x: -40, y: 0, z: 42 },
      { x: -18, y: 0, z: 42 },
      { x: 5, y: 0, z: 42 },
      { x: 8, y: 1.5, z: 30 },
      { x: 10, y: 3, z: 18 },
      { x: 16, y: 4, z: 18 },
      { x: 22, y: 6, z: 12 },
      { x: 25, y: 7, z: 5 },
    ],
    width: 1.7,
    checkpoints: [0.13, 0.34, 0.56, 0.676, 0.795, 0.852, 0.933, 0.985],
    checkpointRadii: [1.7, 1.7, 1.7, 1.5, 1.5, 1.5, 1.5, 1.5],
    shotOffsets: [-0.14, -0.1, -0.06, -0.03, 0, 0.03, 0.06, 0.1, 0.14],
  },
  {
    name: "Archipiélago azul",
    index: 2,
    points: [
      { x: -27, y: 0, z: 56 },
      { x: -12, y: 0, z: 32 },
      { x: -8, y: 0, z: 18 },
      { x: -4, y: 0, z: 4 },
      { x: 1, y: 0, z: -10 },
      { x: 9, y: 0, z: -22 },
      { x: 15, y: 0, z: -30 },
      { x: 24, y: 0, z: -42 },
    ],
    width: 1.6,
    checkpoints: [0.25, 0.38, 0.52, 0.65, 0.78, 0.87, 0.985],
    checkpointRadii: [2, 2, 2, 2, 2, 2, 2],
  },
  {
    name: "La cresta del cóndor",
    index: 3,
    points: [
      { x: -34, y: 12, z: 70 },
      { x: 27, y: 5, z: 8 },
    ],
    width: 1.6,
  },
];

it.each(shortcutRoutes)(
  "$name narrow shortcut can be traversed by continuous real shots",
  ({ name, index, points, width, checkpoints, checkpointRadii, shotOffsets }) => {
    const game = new Game();
    games.push(game);
    game.selectCircuit("expeditions");
    game.add("shortcut-player", "Explorador");
    game.startPractice(index);

    const shortcutSurfaces = geometry(frontierCourses[index]).surfaces.filter(
      (surface) => surface.size[0] < 2.05 && surface.size[2] > 6,
    );
    expect(shortcutSurfaces.length, name + ": shortcut geometry missing").toBeGreaterThan(0);

    const segments = points.slice(1).map((to, segmentIndex) => {
      const from = points[segmentIndex];
      return {
        from,
        to,
        dx: to.x - from.x,
        dz: to.z - from.z,
        length: Math.hypot(to.x - from.x, to.z - from.z),
      };
    });
    let accumulated = 0;
    const routeSegments = segments.map((segment) => {
      const routeStart = accumulated;
      accumulated += segment.length;
      return { ...segment, routeStart };
    });
    const routeLength = accumulated;

    const lane = (position: V3) => {
      let closest = { progress: 0, lateral: Number.POSITIVE_INFINITY };
      for (const segment of routeSegments) {
        const lengthSquared =
          segment.dx * segment.dx + segment.dz * segment.dz;
        const ratio = Math.max(
          0,
          Math.min(
            1,
            ((position.x - segment.from.x) * segment.dx +
              (position.z - segment.from.z) * segment.dz) /
              lengthSquared,
          ),
        );
        const x = segment.from.x + segment.dx * ratio;
        const z = segment.from.z + segment.dz * ratio;
        const lateral = Math.hypot(position.x - x, position.z - z);
        if (lateral < closest.lateral)
          closest = {
            progress:
              (segment.routeStart + segment.length * ratio) / routeLength,
            lateral,
          };
      }
      return closest;
    };

    const point = (fraction: number): V3 => {
      const requested = Math.min(routeLength, Math.max(0, fraction * routeLength));
      const segment =
        routeSegments.find(
          (candidate) =>
            requested <= candidate.routeStart + candidate.length + 1e-6,
        ) ?? routeSegments[routeSegments.length - 1];
      const ratio = Math.max(
        0,
        Math.min(1, (requested - segment.routeStart) / segment.length),
      );
      const x = segment.from.x + segment.dx * ratio;
      const z = segment.from.z + segment.dz * ratio;
      const expectedY =
        segment.from.y + (segment.to.y - segment.from.y) * ratio;
      const support = shortcutSurfaces
        .map((surface) => ({ y: surfaceHeight(surface, x, z) }))
        .filter((candidate): candidate is { y: number } => candidate.y !== null)
        .sort((a, b) => Math.abs(a.y - expectedY) - Math.abs(b.y - expectedY))[0];
      expect(
        support,
        name + ": no surface at shortcut fraction " + fraction,
      ).toBeDefined();
      expect(Math.abs(support!.y - expectedY)).toBeLessThan(0.08);
      return { x, y: support!.y, z };
    };

    const from = point(0.1);
    const targets = (checkpoints ?? [0.32, 0.54, 0.76, 0.94]).map(
      (fraction, index) => ({
        ...point(fraction),
        fraction,
        radius: checkpointRadii?.[index] ?? 3.0,
      }),
    );
    const initial = game.state.players[0];
    initial.pos = { x: from.x, y: from.y + 0.22, z: from.z };
    game.place();
    game.tick();

    const resetTrial = (position: V3, time: number) => {
      const player = game.state.players[0];
      player.pos = { ...position };
      player.done = false;
      player.withdrawn = false;
      player.penalties = 0;
      player.strokes = 0;
      player.capped = [];
      game.state.phase = "playing";
      game.state.turn = 0;
      game.state.moving = false;
      game.state.time = time;
      game.state.event = undefined;
      game.elapsed = 0;
      game.quiet = 0;
      game.capturedAt = null;
      game.lastBounce = -1;
      game.place();
      game.tick();
    };
    const distance = (a: V3, b: V3) =>
      Math.hypot(a.x - b.x, (a.y - b.y) * 1.35, a.z - b.z);

    let current: V3 = { ...game.state.players[0].pos };
    let routeTime = game.state.time;
    const offsets = shotOffsets ?? [-0.03, -0.015, 0, 0.015, 0.03];
    const powers = [0.16, 0.25, 0.36, 0.48, 0.62, 0.78, 0.94];

    for (const [targetIndex, target] of targets.entries()) {
      let successfulShots = 0;
      while (
        (lane(current).progress < target.fraction - 0.025 ||
          distance(current, target) > target.radius) &&
        successfulShots < 5
      ) {
        const baseAngle = Math.atan2(
          target.x - current.x,
          current.z - target.z,
        );
        const startingScore = distance(current, target);
        let best:
          | { angle: number; power: number; score: number }
          | undefined;
        const diagnostics: string[] = [];

        for (const offset of offsets) {
          for (const power of powers) {
            resetTrial(current, routeTime);
            const angle = baseAngle + offset;
            expect(game.shoot("shortcut-player", angle, power)).toBe(true);
            let frames = 0;
            while (game.state.moving && frames++ < 900) game.tick();
            const player = game.state.players[0];
            const position = { ...player.pos };
            const projected = lane(position);
            const support = game.world.castRay(
              new R.Ray(
                { x: position.x, y: position.y + 0.8, z: position.z },
                { x: 0, y: -1, z: 0 },
              ),
              1.8,
              true,
              undefined,
              undefined,
              undefined,
              game.ball,
            );
            const score = distance(position, target);
            diagnostics.push(
              "p=" + power +
                ",offset=" + offset +
                ",progress=" + projected.progress.toFixed(2) +
                ",lateral=" + projected.lateral.toFixed(2) +
                ",penalty=" + player.penalties +
                ",support=" + Boolean(support),
            );
            if (
              game.state.moving ||
              player.penalties > 0 ||
              !support ||
              projected.lateral > width / 2 - 0.2 ||
              projected.progress + 0.03 < lane(current).progress ||
              score + 0.25 >= startingScore
            )
              continue;
            if (!best || score < best.score)
              best = { angle, power, score };
          }
        }

        expect(
          best,
          name + ": shortcut stuck at checkpoint " + (targetIndex + 1) +
            ", position=" + JSON.stringify(current) +
            ", candidates=" + diagnostics.sort().slice(0, 10).join("; "),
        ).toBeDefined();

        resetTrial(current, routeTime);
        expect(game.shoot("shortcut-player", best!.angle, best!.power)).toBe(true);
        let frames = 0;
        while (game.state.moving && frames++ < 900) game.tick();
        expect(game.state.moving).toBe(false);
        expect(game.state.players[0].penalties).toBe(0);
        current = { ...game.state.players[0].pos };
        const projected = lane(current);
        expect(projected.lateral).toBeLessThan(width / 2 - 0.2);
        const previousCheckpoint =
          targetIndex === 0
            ? 0.1
            : (checkpoints ?? [0.32, 0.54, 0.76, 0.94])[targetIndex - 1];
        expect(projected.progress).toBeGreaterThan(
          lane(point(previousCheckpoint)).progress - 0.015,
        );
        routeTime = game.state.time;
        successfulShots++;
      }
      expect(
        lane(current).progress,
        name + ": did not advance to shortcut section " + (targetIndex + 1),
      ).toBeGreaterThanOrEqual(target.fraction - 0.025);
      expect(lane(current).lateral).toBeLessThan(width / 2 - 0.2);
    }

    expect(game.state.players[0].penalties).toBe(0);
    expect(lane(current).progress).toBeGreaterThan(0.9);
  },
  180000,
);

it.each(frontierCourses.map((course, index) => [course.name, index] as const))(
  "%s builds real Rapier ground and a physical open cup, then completes a real tee shot without invalid coordinates",
  async (_name, index) => {
    const game = new Game();
    games.push(game);
    game.selectCircuit("expeditions");
    game.add("expedition-player", "Explorador");
    game.startPractice(index);
    game.tick();

    const course = frontierCourses[index];
    const start = game.state.players[0].pos;
    expect(Number.isFinite(start.x + start.y + start.z)).toBe(true);
    const startSupport = game.world.castRay(
      new R.Ray(
        { x: start.x, y: start.y + 2, z: start.z },
        { x: 0, y: -1, z: 0 },
      ),
      4,
      true,
    );
    expect(startSupport).not.toBeNull();

    const cupRay = game.world.castRay(
      new R.Ray(
        { x: course.cup.x + 0.18, y: course.cup.y + 1, z: course.cup.z },
        { x: 0, y: -1, z: 0 },
      ),
      3,
      true,
    );
    expect(cupRay).not.toBeNull();
    expect(cupRay!.timeOfImpact).toBeGreaterThan(1.4);

    // Sample the middle of every sloped deck in the real Rapier world.
    // A ramp that merely has finite coordinates is not enough: its collision
    // must exist continuously between both supported endpoints.
    for (const ramp of geometry(course).surfaces.filter(
      (surface) => Math.abs(surface.rotation || 0) > 1e-5,
    )) {
      const pitch = ramp.rotation || 0;
      const yaw = ramp.yaw || 0;
      for (const fraction of [0.15, 0.35, 0.5, 0.65, 0.85]) {
        const localZ =
          (fraction - 0.5) * Math.cos(pitch) * ramp.size[2] +
          Math.sin(pitch) * ramp.size[1] / 2;
        const x = ramp.pos[0] + Math.sin(yaw) * localZ;
        const z = ramp.pos[2] + Math.cos(yaw) * localZ;
        const height = surfaceHeight(ramp, x, z);
        expect(height, course.name).not.toBeNull();
        const hit = game.world.castRay(
          new R.Ray(
            { x, y: height! + 0.6, z },
            { x: 0, y: -1, z: 0 },
          ),
          1.2,
          true,
          undefined,
          undefined,
          undefined,
          game.ball,
        );
        expect(
          hit,
          `${course.name}: missing Rapier ramp collision at ${x.toFixed(2)}, ${height!.toFixed(2)}, ${z.toFixed(2)}`,
        ).not.toBeNull();
        expect(hit!.timeOfImpact).toBeLessThan(1.05);
      }
    }

    expect(game.shoot("expedition-player", 0, 0.18)).toBe(true);
    let frames = 0;
    while (game.state.moving && frames++ < 1200) game.tick();
    expect(game.state.moving).toBe(false);
    const afterShot = game.state.players[0].pos;
    expect(
      [afterShot.x, afterShot.y, afterShot.z].every(Number.isFinite),
    ).toBe(true);
  },
);
