import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { Game, initPhysics, type State } from "../shared/game";
import {
  currentChallenges,
  getChallenge,
  assessChallenge,
  challengeFromSearch,
  challengeLink,
} from "../shared/challenges";
import {
  CHALLENGES_KEY,
  newChallengeSession,
  restoreChallengeSession,
  readChallengeHistory,
  persistChallengeHistory,
  recordChallengeRound,
  challengeResultText,
} from "../src/challengeRecords";
import {
  captureLocalRound,
  restoreLocalRound,
  validateLocalRound,
} from "../src/localRound";
import { legacyTourShots as tourShots } from "./fixtures/tour";
beforeAll(initPhysics);
afterEach(() => vi.unstubAllGlobals());
const daily = getChallenge("c1-d-2026-11-04")!;
function complete(id = daily.id) {
  const c = getChallenge(id)!,
    g = new Game();
  g.state.physics = 1;
  g.selectCircuit(c.circuit);
  g.add("0", "Ana");
  g.start();
  try {
    for (let h = 0; h < c.holes; h++) {
      for (const [a, p] of tourShots[h]) {
        expect(g.shoot("0", a, p)).toBe(true);
        for (let t = 0; g.state.moving && t < 1800; t++) g.tick();
        expect(g.state.moving).toBe(false);
      }
      expect(g.state.players[0].scores[h]).toBe(tourShots[h].length);
      if (h < c.holes - 1) g.next();
    }
    expect(g.state.phase).toBe("finished");
    return structuredClone(g.state);
  } finally {
    g.dispose();
  }
}
it("pins canonical challenge links, frozen course pools, UTC boundaries and Monday weeks", () => {
  expect(daily).toMatchObject({
    circuit: "sunset",
    holes: 3,
    par: 11,
    control: "classic",
    rules: 7,
  });
  expect(getChallenge("c1-w-2026-11-02")).toMatchObject({
    circuit: "nine",
    holes: 9,
    birdies: 3,
  });
  expect(getChallenge("c1-w-2026-11-09")).toMatchObject({
    circuit: "tour",
    holes: 18,
  });
  expect(
    currentChallenges(new Date("2026-11-08T23:59:59.999Z")).map((c) => c.id),
  ).toEqual(["c1-d-2026-11-08", "c1-w-2026-11-02"]);
  expect(
    currentChallenges(new Date("2026-11-09T00:00:00Z")).map((c) => c.id),
  ).toEqual(["c1-d-2026-11-09", "c1-w-2026-11-09"]);
  expect(currentChallenges(new Date(NaN))).toEqual([]);
  for (const id of [
    null,
    {},
    "c2-d-2026-11-04",
    "c1-d-2026-02-30",
    "c1-d-2026-13-01",
    "c1-w-2026-11-04",
    "c1-d-2026-1-01",
    "c1-d-2026-11-04&x=1",
  ])
    expect(getChallenge(id)).toBeNull();
  const link = challengeLink(daily, "https://gomeza2.github.io", "/golf/");
  expect(link).toBe(
    "https://gomeza2.github.io/golf/?challenge=c1-d-2026-11-04",
  );
  expect(challengeFromSearch(new URL(link).search)).toEqual(daily);
  expect(challengeFromSearch("?room=ABCDE&challenge=" + daily.id)).toBeNull();
});
it("awards Gold only after physically completing the full daily course", () => {
  const result = assessChallenge(daily, complete(), "classic")!;
  expect(result).toMatchObject({
    eligible: true,
    score: 9,
    par: 11,
    birdies: 1,
    penalties: 0,
    goals: [true, true, true],
    medal: 3,
  });
});
it.each(["c1-w-2026-11-02", "c1-w-2026-11-09"])(
  "physically completes the entire weekly round %s",
  (id) => {
    const c = getChallenge(id)!,
      state = complete(id),
      result = assessChallenge(c, state, "classic")!;
    expect(state.players[0].scores).toHaveLength(c.holes);
    expect(result.eligible).toBe(true);
    expect(result.score).toBe(
      tourShots.slice(0, c.holes).reduce((n, shots) => n + shots.length, 0),
    );
  },
);
it("rejects wrong controls, unfinished, practice, other circuits, other formats and multiplayer; caps never give medals", () => {
  const state = complete();
  for (const control of ["pull", "pulse", null])
    expect(assessChallenge(daily, state, control)).toBeNull();
  const cases = [
    { phase: "playing" },
    { hole: 0 },
    { practice: true },
    { circuit: "nine" },
    { format: "stableford" },
    { format: "unknown" },
    { players: [] },
    { players: [state.players[0], state.players[0]] },
  ];
  for (const change of cases)
    expect(
      assessChallenge(daily, { ...state, ...change } as State, "classic"),
    ).toBeNull();
  for (const change of [
    { withdrawn: true },
    { strokes: 1 },
    { scores: [0, 2, 4] },
    { scores: [3, 2] },
    { penalties: -1 },
    { capped: [99] },
  ])
    expect(
      assessChallenge(
        daily,
        { ...state, players: [{ ...state.players[0], ...change }] } as State,
        "classic",
      ),
    ).toBeNull();
  state.players[0].penalties = 1;
  expect(assessChallenge(daily, state, "classic")).toMatchObject({
    medal: 2,
    goals: [true, false, true],
  });
  state.players[0].capped = [0];
  expect(assessChallenge(daily, state, "classic")).toMatchObject({
    eligible: false,
    medal: 0,
    goals: [false, false, false],
  });
});
it("deduplicates recovered results, keeps best score and medal independently, and creates fresh replay tokens", () => {
  const state = complete(),
    session = newChallengeSession(daily.id),
    first = recordChallengeRound({}, session, state, "classic")!;
  expect(first.report).toMatchObject({
    recorded: true,
    improved: true,
    best: 9,
    medal: 3,
  });
  expect(
    recordChallengeRound(first.history, session, state, "classic")!.report,
  ).toMatchObject({ recorded: false, improved: false, best: 9 });
  const replay = newChallengeSession(daily.id);
  expect(replay.attempt).not.toBe(session.attempt);
  state.players[0].scores = [3, 2, 3];
  state.players[0].penalties = 1;
  const next = recordChallengeRound(first.history, replay, state, "classic")!;
  expect(next.history[daily.id]).toMatchObject({
    best: 8,
    medal: 3,
    rounds: 2,
  });
  state.players[0].capped = [0];
  expect(
    recordChallengeRound(
      next.history,
      newChallengeSession(daily.id),
      state,
      "classic",
    )!.history,
  ).toBe(next.history);
  const text = challengeResultText(
    daily,
    first.report,
    "https://example.test/?challenge=" + daily.id,
  );
  expect(text).toContain("9 golpes (-2 al par)");
  expect(text).not.toContain(session.attempt);
});
it("recovers the exact physical challenge attempt without changing the save version; bad optional metadata does not lose the round", () => {
  const g = new Game();
  g.state.physics = 1;
  let restored: Game | undefined;
  try {
    g.add("0", "Ana");
    g.start();
    g.shoot("0", 0, 0.4);
    for (let f = 0; f < 40; f++) g.tick();
    const saved = captureLocalRound(g, "classic"),
      session = newChallengeSession(daily.id);
    saved.challenge = session;
    expect(validateLocalRound(saved)).toBe(true);
    expect(saved.format).toBe(1);
    expect(saved.rules).toBe(7);
    restored = restoreLocalRound(saved);
    expect(
      restoreChallengeSession(saved.challenge, restored.state, "classic"),
    ).toEqual(session);
    for (let f = 0; f < 200; f++) {
      g.tick();
      restored.tick();
      expect(restored.state.players[0].pos).toEqual(g.state.players[0].pos);
    }
    expect(
      restoreChallengeSession(saved.challenge, restored.state, "pull"),
    ).toBeNull();
    saved.challenge = { id: "invalid", attempt: "bad" };
    expect(validateLocalRound(saved)).toBe(true);
    expect(
      restoreChallengeSession(saved.challenge, restored.state, "classic"),
    ).toBeNull();
    delete saved.challenge;
    expect(validateLocalRound(saved)).toBe(true);
  } finally {
    g.dispose();
    restored?.dispose();
  }
});
it("validates and bounds personal history, survives corruption and reports blocked storage", () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  const result = recordChallengeRound(
    {},
    newChallengeSession(daily.id),
    complete(),
    "classic",
  )!;
  expect(persistChallengeHistory(result.history)).toBe(true);
  expect(readChallengeHistory()).toEqual(result.history);
  const raw = JSON.parse(data.get(CHALLENGES_KEY)!);
  raw.history["bad"] = raw.history[daily.id];
  raw.history["c1-d-2026-11-05"] = { ...raw.history[daily.id], best: -1 };
  data.set(CHALLENGES_KEY, JSON.stringify(raw));
  expect(Object.keys(readChallengeHistory())).toEqual([daily.id]);
  const history: typeof result.history = {};
  for (let i = 0; i < 130; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i)),
      id = "c1-d-" + d.toISOString().slice(0, 10);
    history[id] = {
      ...result.history[daily.id],
      best: 30,
      date: d.toISOString(),
    };
  }
  persistChallengeHistory(history);
  expect(Object.keys(readChallengeHistory())).toHaveLength(120);
  data.set(CHALLENGES_KEY, "{");
  expect(readChallengeHistory()).toEqual({});
  vi.stubGlobal("localStorage", {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("quota");
    },
  });
  expect(readChallengeHistory()).toEqual({});
  expect(persistChallengeHistory(result.history)).toBe(false);
});
