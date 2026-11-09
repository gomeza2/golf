import { afterEach, beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import {
  frontierCourses,
  geometry,
  getCircuit,
  rollingResistance,
  surfaceAt,
  surfaceFriction,
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
