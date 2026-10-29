import { useEffect, useState } from "react";
import type { State } from "../shared/game";
import { relativeLabel } from "../shared/scoring";
export function ScoreFeedback({
  event,
  time,
}: {
  event: State["event"];
  time: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (
      event?.kind !== "cup" ||
      !event.outcome ||
      time - event.time > 4 ||
      time < event.time
    ) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [event?.seq, event?.kind]);
  if (!visible || !event?.outcome) return null;
  const result = event.outcome;
  return (
    <aside
      className={`score-feedback outcome-${result.kind}`}
      role="status"
      aria-live="polite"
    >
      <small>
        {result.playerName} · HOYO {result.hole + 1}
      </small>
      <strong>{result.label}</strong>
      <span>
        {result.strokes} {result.strokes === 1 ? "golpe" : "golpes"} ·{" "}
        {relativeLabel(result.relative)}
      </span>
    </aside>
  );
}
