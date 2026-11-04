import { useEffect, useMemo, useRef, useState } from "react";
import type { State } from "../shared/game";
import { getChallenge } from "../shared/challenges";
import {
  newChallengeSession,
  restoreChallengeSession,
  readChallengeHistory,
  recordChallengeRound,
  persistChallengeHistory,
  type ChallengeSession,
  type ChallengeReport,
} from "./challengeRecords";
export function useClubChallenges(
  state: State,
  control: unknown,
  enabled: boolean,
) {
  const [session, setSession] = useState<ChallengeSession | null>(null),
    [history, setHistory] = useState(readChallengeHistory),
    [report, setReport] = useState<ChallengeReport | null>(null),
    [persisted, setPersisted] = useState(true);
  const processed = useRef<string | null>(null),
    definition = useMemo(() => getChallenge(session?.id), [session?.id]);
  useEffect(() => {
    if (
      !enabled ||
      !session ||
      state.phase !== "finished" ||
      processed.current === session.attempt
    )
      return;
    processed.current = session.attempt;
    const result = recordChallengeRound(history, session, state, control);
    if (!result) return;
    setReport(result.report);
    if (result.report.recorded) {
      setHistory(result.history);
      setPersisted(persistChallengeHistory(result.history));
    }
  }, [state, session, control, enabled, history]);
  const start = (id: string) => {
    processed.current = null;
    setSession(newChallengeSession(id));
    setReport(null);
    setPersisted(true);
  };
  return {
    session,
    definition,
    history,
    report,
    persisted,
    start,
    restart: () => {
      if (session) start(session.id);
    },
    close: () => {
      setSession(null);
      setReport(null);
    },
    restore: (value: unknown, s: State, mode: unknown) => {
      processed.current = null;
      setSession(restoreChallengeSession(value, s, mode));
      setReport(null);
      setPersisted(true);
    },
  };
}
