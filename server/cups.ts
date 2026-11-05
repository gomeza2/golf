import { Game, type Player } from "../shared/game";
import { matchRanking } from "../shared/competition";
import {
  beginCup,
  getCupPlan,
  setupCup,
  cupStandings,
  settleCup,
  withdrawFromCup,
  type CupState,
} from "../shared/cups";
export type CupRoom = { game: Game; cup?: CupState };
export function chooseCup(room: CupRoom, id: unknown) {
  const s = room.game.state;
  if (s.phase !== "lobby") throw Error("La copa se elige en la sala");
  if (id === "single") {
    if (room.cup) {
      room.cup = undefined;
      s.players.forEach((p) => (p.ready = false));
    }
    return;
  }
  const plan = getCupPlan(id);
  if (!plan) throw Error("Copa inválida");
  if (room.cup?.plan === plan.id) return;
  room.game.selectCircuit(plan.circuits[0]);
  room.cup = setupCup(plan.id, s.format ?? "strokes");
}
export function startRoomMatch(room: CupRoom) {
  const cup = room.cup ? beginCup(room.cup, room.game.state) : undefined;
  room.game.start();
  room.cup = cup;
}
export function settleRoomCup(room: CupRoom) {
  if (room.cup) room.cup = settleCup(room.cup, room.game.state);
}
export function retireCupPlayer(room: CupRoom, id: string) {
  // Close a physically finished leg before classifying a late departure.
  settleRoomCup(room);
  if (room.cup) room.cup = withdrawFromCup(room.cup, id);
  room.game.withdraw(id);
  settleRoomCup(room);
}
function replaceRound(
  room: CupRoom,
  players: Player[],
  circuit: Parameters<Game["selectCircuit"]>[0],
) {
  const previous = room.game,
    s = previous.state,
    next = new Game();
  try {
    next.selectCircuit(circuit);
    // Keep ball colours stable while tee honours use a separate turn order.
    const roster = [...players].sort(
      (a, b) =>
        room.cup!.entrants.findIndex((p) => p.id === a.id) -
        room.cup!.entrants.findIndex((p) => p.id === b.id),
    );
    roster.forEach((p) => {
      const added = next.add(p.id, p.name);
      added.connected = p.connected;
    });
    next.state.host = players.some((p) => p.id === s.host && p.connected)
      ? s.host
      : players.find((p) => p.connected)?.id || "";
    next.state.code = s.code;
    next.eventSeq = previous.eventSeq;
    // A cup already admitted at least two friends; its survivor may finish in points.
    next.start(room.cup!.format, { cupContinuation: true });
    next.turnOrder = players.map((p) =>
      next.state.players.findIndex((v) => v.id === p.id),
    );
    next.state.turn = next.turnOrder[0];
    next.place();
  } catch (error) {
    next.dispose();
    throw error;
  }
  room.game = next;
  previous.dispose();
}
export function advanceRoomCup(room: CupRoom) {
  settleRoomCup(room);
  const c = room.cup,
    s = room.game.state;
  if (
    !c ||
    c.phase !== "playing" ||
    s.phase !== "finished" ||
    c.rounds.length !== c.round + 1
  )
    throw Error("Termina la vuelta antes de avanzar la copa");
  const players = matchRanking(s).filter(
    (p) => !p.withdrawn && !c.entrants.find((v) => v.id === p.id)?.withdrawn,
  );
  if (!players.length) throw Error("No quedan jugadores en la copa");
  const round = c.round + 1,
    circuit = getCupPlan(c.plan)!.circuits[round];
  replaceRound(room, players, circuit);
  room.cup = { ...c, round };
}
export function replayRoomCup(room: CupRoom) {
  const c = room.cup,
    s = room.game.state;
  if (!c || c.phase !== "finished" || s.phase !== "finished")
    throw Error("Termina la copa antes de la revancha");
  const players = cupStandings(c).flatMap((row) =>
    s.players.filter(
      (p) => p.id === row.id && p.connected && !p.withdrawn && !row.withdrawn,
    ),
  );
  if (players.length < 2)
    throw Error("La revancha necesita dos jugadores conectados");
  replaceRound(room, players, getCupPlan(c.plan)!.circuits[0]);
  room.cup = {
    ...setupCup(c.plan, c.format),
    phase: "playing",
    entrants: room.game.state.players.map((p) => ({
      id: p.id,
      name: p.name,
      withdrawn: false,
    })),
  };
}
export function resetRoomCup(room: CupRoom) {
  if (room.cup?.phase === "playing")
    throw Error("Termina la copa antes de volver a la sala");
  room.game.returnToLobby();
  if (room.cup) {
    const plan = getCupPlan(room.cup.plan)!;
    room.game.selectCircuit(plan.circuits[0]);
    room.cup = setupCup(plan.id, room.game.state.format ?? "strokes");
  }
}
