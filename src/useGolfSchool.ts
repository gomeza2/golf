import { useEffect, useState } from "react";
import type { State } from "../shared/game";
import type { ControlMode } from "./shotControls";
import {
  newSchoolSession,
  observeSchool,
  readSchoolProgress,
  persistSchoolProgress,
  restoreSchoolSession,
  type SchoolSession,
} from "./school";
export function useGolfSchool(
  state: State,
  control: ControlMode,
  enabled: boolean,
) {
  const [session, setSession] = useState<SchoolSession | null>(null),
    [progress, setProgress] = useState(readSchoolProgress),
    [persisted, setPersisted] = useState(true);
  useEffect(() => {
    if (!enabled || !session) return;
    if (!restoreSchoolSession(session, state)) {
      setSession(null);
      return;
    }
    const next = observeSchool(session, state);
    if (next !== session) setSession(next);
    if (next.phase === "passed" && !progress[control]?.includes(next.lesson)) {
      const updated = {
        ...progress,
        [control]: [...(progress[control] || []), next.lesson],
      };
      setProgress(updated);
      setPersisted(persistSchoolProgress(updated));
    }
  }, [state, session, control, enabled, progress]);
  return {
    session,
    progress,
    persisted,
    close: () => setSession(null),
    start: (lesson: number, s: State) =>
      setSession(newSchoolSession(lesson, s)),
    restore: (value: unknown, s: State) =>
      setSession(restoreSchoolSession(value, s)),
  };
}
