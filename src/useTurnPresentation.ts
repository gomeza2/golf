import { useEffect, useRef, useState } from "react";
export function useTurnPresentation(
  key: string | null,
  playerId: string | undefined,
) {
  const previous = useRef<string | null>(null),
    [focusId, setFocusId] = useState<string>(),
    [transitioning, setTransitioning] = useState(false);
  useEffect(() => {
    if (!key) {
      previous.current = null;
      setTransitioning(false);
      setFocusId(undefined);
      return;
    }
    const first = previous.current === null;
    previous.current = key;
    setTransitioning(true);
    if (first) setFocusId(playerId);
    const focus = setTimeout(() => setFocusId(playerId), first ? 0 : 500);
    const ready = setTimeout(() => setTransitioning(false), 1500);
    return () => {
      clearTimeout(focus);
      clearTimeout(ready);
    };
  }, [key, playerId]);
  return {
    focusId,
    transitioning: transitioning || (key !== null && key !== previous.current),
  };
}
