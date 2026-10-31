import type { Player, State } from "../shared/game";
export function reconnectGrace(value: string | undefined) {
  const seconds = Number(value);
  return Number.isInteger(seconds) && seconds >= 1 && seconds <= 300
    ? seconds
    : 90;
}
export function shouldWithdraw(
  player: Pick<Player, "connected" | "withdrawn">,
  phase: State["phase"],
  lostAt: number | undefined,
  now: number,
  graceMs: number,
) {
  return (
    !player.connected &&
    !player.withdrawn &&
    (phase === "playing" || phase === "scores") &&
    lostAt !== undefined &&
    Number.isFinite(lostAt) &&
    now - lostAt >= graceMs
  );
}
