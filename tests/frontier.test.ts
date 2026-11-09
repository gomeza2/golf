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

it("completes the forest safe route with continuous real shots and no repositioning", () => {
  const game = new Game();
  games.push(game);
  game.selectCircuit("expeditions");
  game.add("route-player", "Explorador");
  game.startPractice(0);

  const targets = [
    { x: -8, y: 2.22, z: 31, radius: 6.5 },
    { x: 18, y: 0.22, z: -18, radius: 6.5 },
    { x: 24, y: 3.22, z: -47, radius: 6.5 },
    { x: 26, y: 0.22, z: -68, radius: 1.2 },
  ];
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
    game.tick(); // Put kinematic obstacles at this exact route time.
  };
  const distance = (
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
  ) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4, a.z - b.z);
  let current = { ...game.state.players[0].pos };
  let routeTime = game.state.time;
  const offsets = [-0.55, -0.27, 0, 0.27, 0.55];
  const powers = [0.38, 0.52, 0.66, 0.8, 0.94];

  for (const [targetIndex, target] of targets.entries()) {
    let successfulShots = 0;
    while (
      distance(current, target) > target.radius &&
      successfulShots < 5 &&
      !game.state.players[0].done
    ) {
      const baseAngle = Math.atan2(target.x - current.x, current.z - target.z);
      let best:
        | { angle: number; power: number; position: { x: number; y: number; z: number }; score: number }
        | undefined;
      const startingScore = distance(current, target);

      for (const offset of offsets) {
        for (const power of powers) {
          resetTrial(current, routeTime);
          const angle = baseAngle + offset;
          expect(game.shoot("route-player", angle, power)).toBe(true);
          let frames = 0;
          while (game.state.moving && frames++ < 720) game.tick();
          if (game.state.moving) continue;

          const player = game.state.players[0];
          if (player.penalties > 0) continue;
          const position = { ...player.pos };
          if (player.done) {
            best = { angle, power, position, score: 0 };
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
          if (!support) continue;
          const score = distance(position, target);
          if (
            score + 0.4 < startingScore &&
            (!best || score < best.score)
          )
            best = { angle, power, position, score };
        }
        if (best?.score === 0) break;
      }

      expect(
        best,
        `Forest route stalled before checkpoint ${targetIndex + 1} at ${current.x.toFixed(1)},${current.y.toFixed(1)},${current.z.toFixed(1)}; target ${target.x},${target.y},${target.z}`,
      ).toBeDefined();

      // Apply the selected shot to the continuous game state. The ball is
      // never teleported between checkpoints; trial resets only compare options.
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
        `Forest route did not reach checkpoint ${targetIndex + 1}`,
      ).toBeLessThanOrEqual(target.radius);
  }

  expect(game.state.players[0].done).toBe(true);
  expect(game.state.players[0].penalties).toBe(0);
  expect(game.state.phase).toBe("finished");
}, 180000);

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
