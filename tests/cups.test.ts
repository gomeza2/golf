import { beforeAll, expect, it } from "vitest";
import { Game, initPhysics, type State } from "../shared/game";
import {
  cupStandings,
  cupWinnerLabel,
  settleCup,
  getCupPlan,
} from "../shared/cups";
import {
  chooseCup,
  startRoomMatch,
  settleRoomCup,
  advanceRoomCup,
  replayRoomCup,
  resetRoomCup,
  retireCupPlayer,
  type CupRoom,
} from "../server/cups";
import { captureLocalRound, restoreLocalRound } from "../src/localRound";
import { aceShots } from "./fixtures/aces";
import { skySafeShots } from "./fixtures/sky";
beforeAll(initPhysics);
function room(format: "strokes" | "stableford" = "strokes"): CupRoom {
  const game = new Game();
  game.add("a", "Ana");
  game.add("b", "Luis");
  game.selectFormat(format);
  return { game };
}
function finishByConcession(r: CupRoom) {
  while (r.game.state.phase !== "finished") {
    if (r.game.state.phase === "scores") r.game.next();
    else
      expect(r.game.concede(r.game.state.players[r.game.state.turn].id)).toBe(
        true,
      );
  }
  settleRoomCup(r);
}
it("fixes plans at start, clears readiness on selection, and rejects changing an active cup", () => {
  const r = room();
  try {
    r.game.state.players.forEach((p) => (p.ready = true));
    chooseCup(r, "risk");
    expect(r.game.state.players.every((p) => !p.ready)).toBe(true);
    expect(r.game.state.circuit).toBe("aces");
    expect(getCupPlan("bad")).toBeUndefined();
    expect(() => chooseCup(r, "bad")).toThrow();
    startRoomMatch(r);
    expect(() => chooseCup(r, "club")).toThrow();
    expect(() => advanceRoomCup(r)).toThrow();
    expect(() => resetRoomCup(r)).toThrow();
    expect(r.cup).toMatchObject({
      phase: "playing",
      round: 0,
      format: "strokes",
    });
  } finally {
    r.game.dispose();
  }
});
it("conceding is turn-validated, impossible in motion, marks the real cap and survives an old-format save", () => {
  const r: CupRoom = { game: new Game() };
  r.game.add("0", "Ana");
  r.game.add("1", "Luis");
  let restored: Game | undefined;
  try {
    r.game.start();
    expect(r.game.concede("1")).toBe(false);
    r.game.shoot("0", 0, 0.3);
    expect(r.game.concede("0")).toBe(false);
    while (r.game.state.moving) r.game.tick();
    expect(r.game.concede("1")).toBe(true);
    expect(r.game.state.players[1]).toMatchObject({
      done: true,
      strokes: 12,
      capped: [0],
    });
    const saved = captureLocalRound(r.game, "classic");
    saved.state.cup = { plan: "bad" } as any;
    restored = restoreLocalRound(saved);
    expect(restored.state.cup).toBeUndefined();
    expect(restored.state.players[1].capped).toEqual([0]);
    expect(saved.format).toBe(1);
    expect(saved.rules).toBe(7);
  } finally {
    r.game.dispose();
    restored?.dispose();
  }
});
it.each(["strokes", "stableford"] as const)(
  "accumulates full %s series exactly once, keeps tee honours and starts a clean rematch",
  (format) => {
    const r = room(format);
    try {
      chooseCup(r, "risk");
      startRoomMatch(r);
      // Ana holes a real ace before the rest of the holes are explicitly conceded.
      expect(r.game.shoot("a", aceShots[0].angle, aceShots[0].power)).toBe(
        true,
      );
      while (r.game.state.moving) r.game.tick();
      expect(r.game.state.players[0].done).toBe(true);
      finishByConcession(r);
      const first = structuredClone(r.cup!.rounds[0]);
      const cup = r.cup!;
      expect(settleCup(cup, r.game.state)).toBe(cup);
      expect(cup.rounds).toHaveLength(1);
      expect(() => resetRoomCup(r)).toThrow();
      const oldWorld = r.game.world,
        seq = r.game.eventSeq;
      advanceRoomCup(r);
      expect(r.game.world).not.toBe(oldWorld);
      expect(r.game.eventSeq).toBe(seq);
      expect(r.game.state.players[r.game.state.turn].id).toBe("a");
      expect(r.game.state.code).toBe("");
      expect(r.game.state.circuit).toBe("skyruins");
      expect(() => advanceRoomCup(r)).toThrow();
      finishByConcession(r);
      expect(r.cup!.phase).toBe("finished");
      expect(r.cup!.rounds[0]).toEqual(first);
      const rows = cupStandings(r.cup!, r.game.state);
      expect(rows[0]).toMatchObject({
        id: "a",
        strokes: 61,
        points: 4,
        aces: 1,
        place: 1,
      });
      expect(rows[1]).toMatchObject({
        id: "b",
        strokes: 72,
        points: 0,
        place: 2,
      });
      expect(cupWinnerLabel(r.cup!)).toBe("Ana gana la copa.");
      replayRoomCup(r);
      expect(r.cup).toMatchObject({ phase: "playing", round: 0, rounds: [] });
      expect(
        r.game.state.players.every(
          (p) => p.scores.length === 0 && p.aces === 0,
        ),
      ).toBe(true);
    } finally {
      r.game.dispose();
    }
  },
);
it("plays both full courses with physical shots and records the exact resulting scores", () => {
  const r = room();
  try {
    chooseCup(r, "risk");
    startRoomMatch(r);
    for (let round = 0; round < 2; round++) {
      while (r.game.state.phase !== "finished") {
        if (r.game.state.phase === "scores") {
          r.game.next();
          continue;
        }
        const s = r.game.state,
          p = s.players[s.turn];
        const shot =
          round === 0
            ? [aceShots[s.hole].angle, aceShots[s.hole].power]
            : skySafeShots[s.hole][
                Math.min(p.strokes, skySafeShots[s.hole].length - 1)
              ];
        expect(r.game.shoot(p.id, shot[0], shot[1])).toBe(true);
        for (let f = 0; r.game.state.moving && f < 1800; f++) r.game.tick();
        expect(r.game.state.moving).toBe(false);
      }
      settleRoomCup(r);
      expect(r.cup!.rounds[round].players.map((p) => p.scores)).toEqual(
        r.game.state.players.map((p) => p.scores),
      );
      if (round === 0) advanceRoomCup(r);
    }
    expect(r.cup!.phase).toBe("finished");
    expect(r.cup!.rounds).toHaveLength(2);
    expect(cupStandings(r.cup!)[0].aces).toBeGreaterThanOrEqual(2);
  } finally {
    r.game.dispose();
  }
});
it("keeps unfinished live totals out of confirmed columns and never double counts a settled round", () => {
  const r = room();
  try {
    chooseCup(r, "risk");
    startRoomMatch(r);
    r.game.shoot("a", 0, 0.05);
    while (r.game.state.moving) r.game.tick();
    expect(
      cupStandings(r.cup!, r.game.state).find((p) => p.id === "a")!.strokes,
    ).toBe(1);
    expect(r.cup!.rounds).toEqual([]);
    finishByConcession(r);
    expect(cupStandings(r.cup!, r.game.state)).toEqual(cupStandings(r.cup!));
  } finally {
    r.game.dispose();
  }
});
it.each(["strokes", "stableford"] as const)(
  "retirement never blocks a surviving %s friend between rounds",
  (format) => {
    const r = room(format);
    try {
      chooseCup(r, "risk");
      startRoomMatch(r);
      finishByConcession(r);
      r.game.state.players[1].connected = false;
      advanceRoomCup(r);
      expect(r.game.state.players.find((p) => p.id === "b")?.connected).toBe(
        false,
      );
      retireCupPlayer(r, "a");
      finishByConcession(r);
      expect(cupStandings(r.cup!)[0].id).toBe("b");
      expect(cupStandings(r.cup!)[1].withdrawn).toBe(true);
      expect(() => replayRoomCup(r)).toThrow();
      r.game.state.players[1].connected = true;
      resetRoomCup(r);
      expect(r.cup!.phase).toBe("setup");
      expect(r.game.state.phase).toBe("lobby");
    } finally {
      r.game.dispose();
    }
  },
);
it("keeps late departures from rewriting a final result and shares a genuine tie", () => {
  const r = room();
  try {
    chooseCup(r, "risk");
    startRoomMatch(r);
    finishByConcession(r);
    advanceRoomCup(r);
    finishByConcession(r);
    expect(cupWinnerLabel(r.cup!)).toBe("Copa compartida.");
    expect(cupStandings(r.cup!).map((p) => p.place)).toEqual([1, 1]);
    const before = structuredClone(r.cup);
    retireCupPlayer(r, "a");
    expect(r.cup).toEqual(before);
  } finally {
    r.game.dispose();
  }
});
it("can abandon a cup completely without invented future-round results", () => {
  const r = room();
  try {
    chooseCup(r, "club");
    startRoomMatch(r);
    retireCupPlayer(r, "a");
    retireCupPlayer(r, "b");
    expect(r.cup!.phase).toBe("finished");
    expect(cupWinnerLabel(r.cup!)).toBe("Copa abandonada.");
    expect(r.cup!.rounds).toEqual([]);
  } finally {
    r.game.dispose();
  }
});

it("the previous winner tees first without changing the players' ball colour order", () => {
  const r = room();
  try {
    chooseCup(r, "risk");
    startRoomMatch(r);
    r.game.concede("a");
    r.game.shoot("b", aceShots[0].angle, aceShots[0].power);
    while (r.game.state.moving) r.game.tick();
    finishByConcession(r);
    advanceRoomCup(r);
    expect(r.game.state.players.map((p) => p.id)).toEqual(["a", "b"]);
    expect(r.game.state.players[r.game.state.turn].id).toBe("b");
  } finally {
    r.game.dispose();
  }
});
it("a sole survivor can continue a points cup, while an ordinary single-player points start stays forbidden", () => {
  const single = new Game();
  const r = room("stableford");
  try {
    single.add("0", "Solo");
    expect(() => single.start("stableford")).toThrow();
    chooseCup(r, "risk");
    startRoomMatch(r);
    finishByConcession(r);
    retireCupPlayer(r, "a");
    advanceRoomCup(r);
    expect(r.game.state.players.map((p) => p.id)).toEqual(["b"]);
    expect(r.game.state.format).toBe("stableford");
    finishByConcession(r);
    expect(cupWinnerLabel(r.cup!)).toBe("Luis gana la copa.");
  } finally {
    single.dispose();
    r.game.dispose();
  }
});
