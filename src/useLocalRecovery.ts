import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Game, State } from "../shared/game";
import type { ControlMode } from "./shotControls";
import {
  captureLocalRound,
  discardLocalRound,
  persistLocalRound,
  readLocalRound,
} from "./localRound";

export function useLocalRecovery({
  game,
  mode,
  screen,
  state,
  control,
  angle,
  power,
}: {
  game: RefObject<Game | null>;
  mode: "local" | "online";
  screen: string;
  state: State;
  control: ControlMode;
  angle: number;
  power: number;
}) {
  const [save, setSave] = useState(readLocalRound);
  const config = useRef({ mode, screen, control, angle, power });
  config.current = { mode, screen, control, angle, power };
  const checkpoint = useCallback(() => {
    const c = config.current,
      g = game.current;
    if (c.mode !== "local" || !g) return false;
    if (g.state.phase === "finished") {
      const removed = discardLocalRound();
      setSave({ kind: removed ? "empty" : "unavailable" });
      return removed;
    }
    if (!["playing", "scores"].includes(g.state.phase)) return false;
    try {
      const round = captureLocalRound(g, c.control, {
        angle: c.angle,
        power: c.power,
      });
      if (!persistLocalRound(round)) {
        setSave({ kind: "unavailable" });
        return false;
      }
      setSave({ kind: "saved", round });
      return true;
    } catch {
      setSave({ kind: "unavailable" });
      return false;
    }
  }, [game]);
  useEffect(() => {
    if (screen === "game" && mode === "local") checkpoint();
  }, [
    screen,
    mode,
    state.phase,
    state.hole,
    state.turn,
    state.moving,
    checkpoint,
  ]);
  useEffect(() => {
    const flush = () => {
      if (config.current.screen === "game") checkpoint();
    };
    const hidden = () => {
      if (document.hidden) flush();
    };
    const timer = setInterval(flush, 1000);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [checkpoint]);
  const discard = () => {
    const removed = discardLocalRound();
    setSave({ kind: removed ? "empty" : "unavailable" });
  };
  return { save, checkpoint, discard };
}
