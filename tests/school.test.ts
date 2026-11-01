import { beforeAll, it, expect, vi, afterEach } from "vitest";
import { Game, initPhysics } from "../shared/game";
import {
  captureLocalRound,
  restoreLocalRound,
  validateLocalRound,
} from "../src/localRound";
import {
  newSchoolSession,
  observeSchool,
  restoreSchoolSession,
  readSchoolProgress,
  persistSchoolProgress,
  SCHOOL_KEY,
  type SchoolSession,
} from "../src/school";
import { tourShots } from "./fixtures/tour";
beforeAll(initPhysics);
afterEach(() => vi.unstubAllGlobals());
function game() {
  const g = new Game();
  g.add("0", "Ana");
  g.startPractice(0);
  return g;
}
function shot(g: Game, session: SchoolSession, a: number, p: number) {
  expect(g.shoot("0", a, p)).toBe(true);
  for (let f = 0; f < 1200 && g.state.moving; f++) {
    g.tick();
    session = observeSchool(session, g.state);
    if (g.state.moving) expect(session.phase).toBe("playing");
  }
  return observeSchool(session, g.state);
}
it("passes the real one-shot approach only inside the target after stopping", () => {
  const g = game();
  try {
    let session = newSchoolSession(0, g.state);
    expect(observeSchool(session, g.state).phase).toBe("playing");
    session = shot(g, session, 0, 0.145);
    expect(session.phase).toBe("passed");
    expect(g.state.players[0].strokes).toBe(1);
    expect(g.state.players[0].scores).toEqual([]);
  } finally {
    g.dispose();
  }
});
it("does not pass a missed approach or a second shot moved back into the target", () => {
  const g = game();
  try {
    let session = shot(g, newSchoolSession(0, g.state), 0, 0.04);
    expect(session.phase).toBe("playing");
    session = shot(g, session, 0, 0.14);
    expect(session.phase).toBe("playing");
    expect(g.state.players[0].strokes).toBe(2);
  } finally {
    g.dispose();
  }
});
it("passes the bank lesson through an actual wall collision and never reuses an old event", () => {
  const g = game();
  try {
    const session = shot(g, newSchoolSession(1, g.state), 0, 0.5);
    expect(session.bounced).toBe(true);
    expect(session.phase).toBe("passed");
    const next = newSchoolSession(1, g.state);
    expect(observeSchool(next, g.state).phase).toBe("playing");
  } finally {
    g.dispose();
  }
});
it("the cup lesson requires the full physical finish and rejects capped or penalized attempts", () => {
  const g = game();
  try {
    let session = newSchoolSession(2, g.state);
    for (const [a, p] of tourShots[0]) session = shot(g, session, a, p);
    expect(session.phase).toBe("passed");
    expect(g.state.players[0].scores).toEqual([3]);
    const fresh = { ...session, phase: "playing" as const };
    const capped = structuredClone(g.state);
    capped.players[0].capped = [0];
    expect(observeSchool(fresh, capped).phase).toBe("playing");
    capped.players[0].capped = [];
    capped.players[0].penalties = 1;
    expect(observeSchool(fresh, capped).phase).toBe("playing");
  } finally {
    g.dispose();
  }
});
it("optional teaching metadata survives the same physical save while old or corrupt metadata never blocks recovery", () => {
  const g = game();
  let recovered: Game | undefined;
  try {
    g.shoot("0", 0, 0.5);
    let session = newSchoolSession(1, g.state);
    for (let f = 0; f < 75; f++) {
      g.tick();
      session = observeSchool(session, g.state);
    }
    const saved = captureLocalRound(g, "pull");
    saved.school = session;
    expect(validateLocalRound(saved)).toBe(true);
    expect(saved.format).toBe(1);
    expect(saved.rules).toBe(7);
    recovered = restoreLocalRound(saved);
    let resumed = restoreSchoolSession(saved.school, recovered.state)!;
    expect(resumed).toEqual(session);
    while (g.state.moving) {
      g.tick();
      recovered.tick();
      session = observeSchool(session, g.state);
      resumed = observeSchool(resumed, recovered.state);
      expect(recovered.state.players[0].pos).toEqual(g.state.players[0].pos);
    }
    expect(resumed.phase).toBe("passed");
    expect(restoreSchoolSession({ lesson: 99 }, recovered.state)).toBeNull();
    delete saved.school;
    expect(validateLocalRound(saved)).toBe(true);
  } finally {
    g.dispose();
    recovered?.dispose();
  }
});
it("stores actual local lesson progress separately by control and tolerates malformed or blocked storage", () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  expect(persistSchoolProgress({ classic: [0, 1], pull: [0] })).toBe(true);
  expect(readSchoolProgress()).toEqual({ classic: [0, 1], pull: [0] });
  data.set(
    SCHOOL_KEY,
    JSON.stringify({
      version: 1,
      progress: { classic: [0, 0, 1, -1, 12, "2"], unknown: [0] },
    }),
  );
  expect(readSchoolProgress()).toEqual({ classic: [0, 1] });
  data.set(SCHOOL_KEY, "{");
  expect(readSchoolProgress()).toEqual({});
  vi.stubGlobal("localStorage", {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("quota");
    },
  });
  expect(readSchoolProgress()).toEqual({});
  expect(persistSchoolProgress({ classic: [0] })).toBe(false);
});
