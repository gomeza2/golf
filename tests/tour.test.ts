import { beforeAll, it, expect } from "vitest";
import { Game, initPhysics, total } from "../shared/game";
import { uniqueCourses, getCircuit } from "../shared/courses";
import { tourShots } from "./fixtures/tour";
beforeAll(initPhysics);
it("completes one continuous 18-hole match with real shots, no repositioning and no penalties", () => {
  const g = new Game();
  try {
    g.selectCircuit("tour");
    g.add("a", "A");
    g.start();
    expect(uniqueCourses).toHaveLength(18);
    expect(new Set(uniqueCourses)).toHaveProperty("size", 18);
    expect(getCircuit("tour").courses).toHaveLength(18);
    for (let hole = 0; hole < tourShots.length; hole++) {
      expect(g.state.hole).toBe(hole);
      for (const [angle, power] of tourShots[hole]) {
        expect(g.shoot("a", angle, power)).toBe(true);
        for (let frame = 0; frame < 1200 && g.state.moving; frame++) g.tick();
      }
      expect(g.state.players[0].done).toBe(true);
      expect(g.state.players[0].penalties).toBe(0);
      expect(g.state.players[0].scores[hole]).toBe(tourShots[hole].length);
      if (hole < 17) {
        expect(g.state.phase).toBe("scores");
        g.next();
      }
    }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[0].scores).toHaveLength(18);
    expect(total(g.state.players[0])).toBe(tourShots.flat().length);
  } finally {
    g.dispose();
  }
});

it("completes the shorter nine-hole round with real normal shots", () => {
  const g = new Game();
  try {
    g.selectCircuit("nine");
    g.add("a", "A");
    g.start();
    for (let hole = 0; hole < 9; hole++) {
      for (const [angle, power] of tourShots[hole]) {
        expect(g.shoot("a", angle, power)).toBe(true);
        for (let frame = 0; frame < 1200 && g.state.moving; frame++) g.tick();
      }
      expect(g.state.players[0].done).toBe(true);
      if (hole < 8) g.next();
    }
    expect(g.state.phase).toBe("finished");
    expect(g.state.players[0].scores).toHaveLength(9);
    expect(g.state.players[0].penalties).toBe(0);
    expect(g.state.players[0].capped).toEqual([]);
  } finally {
    g.dispose();
  }
});
