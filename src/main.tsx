import { readEditor } from "./workshopProjectStorage";
import { workshopPhysics, workshopPhysicsLabel } from "../shared/workshop";
import { physicsEdition } from "../shared/rules";
import {
  readPublicationTarget,
  saveCommunityIntent,
  clearCommunityIntent,
} from "./communityIntent";
import { loadCommunityConfig } from "./communityApi";
import type { CommunityConfig, CreationDetail } from "../shared/community";
import type { PublicationTarget } from "./CommunityPublisher";
import {
  readWorkshopDraft,
  readWorkshopLibrary,
  saveWorkshopLibrary,
  saveWorkshopDraft,
} from "./workshopStorage";
import type { WorkshopDocument } from "../shared/workshop";
import { CupDialog } from "./CupPanels";
import { getCupPlan } from "../shared/cups";
import { TURN_SECONDS } from "../shared/rules";
import { APP_VERSION, GAME_NAME } from "./release";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createOnlineConnection,
  type OnlineConnection,
  type RoomEntry,
} from "./onlineConnection";
import { normalizeServerUrl } from "./serverUrl";
import { PUBLIC_SERVER_URL } from "./onlineServer";
import { FixedStepper } from "../shared/timing";
import { wrapAngle } from "../shared/shot";
import { Game, initPhysics, type State } from "../shared/game";
import {
  colors,
  circuits,
  getCircuit,
  isCircuitId,
  type CircuitId,
} from "../shared/courses";
import {
  readPersonalRecords,
  recordCompletedRound,
  persistPersonalRecords,
  type RoundReport,
} from "./personalRecords";
import { defaultLook, changeLook, type CameraLook } from "./camera";
import {
  readPracticeRecords,
  recordPractice,
  persistPracticeRecords,
  type PracticeReport,
} from "./practiceRecords";
import { PauseDialog } from "./PauseDialog";
import { restoreLocalRound } from "./localRound";
import { useLocalRecovery } from "./useLocalRecovery";
import { SavedRound } from "./SavedRound";
import { GraphicsSettings } from "./GraphicsSettings";
import { MatchFormatPicker } from "./MatchFormatPicker";
import { ConnectionSettings } from "./ConnectionSettings";
import type { MatchFormat } from "../shared/scoring";
import { isGraphicsMode, type GraphicsMode } from "./graphics";
import { Scene } from "./Scene";
import { useGolfSchool } from "./useGolfSchool";
import { useClubChallenges } from "./useClubChallenges";
import {
  ChallengeHub,
  ChallengeDialog,
  ChallengeSummary,
} from "./ClubChallenges";
import {
  challengeFromSearch,
  challengeLink,
  getChallenge,
  type ClubChallenge,
} from "../shared/challenges";
import {
  restoreChallengeSession,
  challengeResultText,
} from "./challengeRecords";
import { SchoolCoach } from "./GolfSchool";
import { schoolTarget } from "./school";
import { useHoleIntro } from "./useHoleIntro";
import { getCourse } from "../shared/courses";
import { GamePanels } from "./GamePanels";
import { tone, celebrateOutcome } from "./audio";
import { useTurnPresentation } from "./useTurnPresentation";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { ClubCatalog, SelectedRound } from "./ClubCatalog";
import { controlModes, isControlMode, type ControlMode } from "./shotControls";
import { useShotControls, type Shot } from "./useShotControls";
import { readLocal, saveLocal, readSession, saveSession } from "./storage";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/700.css";
import "./style.css";
const initial: State = {
  phase: "lobby",
  players: [],
  hole: 0,
  circuit: "sunset",
  turn: 0,
  moving: false,
  time: 0,
  deadline: TURN_SECONDS,
  message: "",
  host: "",
  code: "",
};
const defaultServerUrl =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.VITE_STATIC_HOST === "true" ? PUBLIC_SERVER_URL : "");
const communityServerUrl = (
  import.meta.env.VITE_COMMUNITY_SERVER_URL ||
  (import.meta.env.VITE_STATIC_HOST === "true"
    ? import.meta.env.VITE_SERVER_URL || PUBLIC_SERVER_URL
    : "")
).replace(/\/+$/, "");
const communityRequested = () => {
  const p = new URLSearchParams(location.search);
  return (
    p.has("community") ||
    p.has("creation") ||
    (p.has("state") && (p.has("code") || p.has("error")))
  );
};
const sharedChallenge = challengeFromSearch(location.search);
const invalidChallengeLink =
  new URLSearchParams(location.search).has("challenge") &&
  !new URLSearchParams(location.search).has("room") &&
  !sharedChallenge;
const Workshop = lazy(() =>
  import("./Workshop").then((m) => ({ default: m.Workshop })),
);
const Community = lazy(() =>
  import("./Community").then((m) => ({ default: m.Community })),
);
function App() {
  const [s, setS] = useState<State>(initial),
    [screen, setScreen] = useState<
      "home" | "local" | "online" | "game" | "workshop" | "community"
    >(communityRequested() ? "community" : "home"),
    [serverUrl, setServerUrl] = useState(
      new URLSearchParams(location.search).get("server") ||
        readLocal("golf-server-url") ||
        defaultServerUrl,
    ),
    [mode, setMode] = useState<"local" | "online">("local"),
    [circuit, setCircuit] = useState<CircuitId>(() => {
      const saved = readLocal("golf-circuit");
      return isCircuitId(saved) ? saved : "rift";
    }),
    [names, setNames] = useState<string[]>(() => {
      try {
        const saved = JSON.parse(readLocal("golf-local-names", "null"));
        if (
          Array.isArray(saved) &&
          saved.length >= 1 &&
          saved.length <= 8 &&
          saved.every(
            (n) =>
              typeof n === "string" && n.trim().length > 0 && n.length <= 20,
          )
        )
          return saved;
      } catch {}
      return ["Golfista 1"];
    }),
    [name, setName] = useState(readLocal("golf-name")),
    [matchFormat, setMatchFormat] = useState<MatchFormat>("strokes"),
    [onlineFormat, setOnlineFormat] = useState<MatchFormat>("strokes"),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [error, setError] = useState(
      invalidChallengeLink
        ? "El enlace del reto no es válido o usa otras reglas. Puedes jugar los retos actuales."
        : "",
    ),
    [latency, setLatency] = useState<number | null>(null),
    [status, setStatus] = useState("Sin conexión"),
    [disconnectGrace, setDisconnectGrace] = useState(90),
    [id, setId] = useState(""),
    [angle, setAngle] = useState(0),
    [power, setPower] = useState(0.55),
    [controlMode, setControlMode] = useState(() => {
      const saved = readLocal("golf-control-mode");
      return isControlMode(saved) ? saved : "classic";
    }),
    [personalHistory, setPersonalHistory] = useState(readPersonalRecords),
    [roundReport, setRoundReport] = useState<RoundReport | null>(null),
    [practiceHistory, setPracticeHistory] = useState(readPracticeRecords),
    [practiceReport, setPracticeReport] = useState<PracticeReport | null>(null),
    [paused, setPaused] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
    [roundId, setRoundId] = useState(0),
    [roundControl, setRoundControl] = useState<ControlMode>("classic"),
    [overview, setOverview] = useState(false),
    [lookMode, setLookMode] = useState(false),
    [cameraLook, setCameraLook] = useState<CameraLook>(defaultLook),
    [settings, setSettings] = useState(false),
    [volume, setVolume] = useState(Number(readLocal("golf-volume", ".6"))),
    [graphicsMode, setGraphicsMode] = useState<GraphicsMode>(() => {
      const saved = readLocal("golf-graphics-mode");
      return isGraphicsMode(saved) ? saved : "auto";
    }),
    [ready, setReady] = useState(false);
  const [showHoleIntro, setShowHoleIntro] = useState(
    readLocal("golf-hole-intro", "true") !== "false",
  );
  useEffect(
    () => saveLocal("golf-hole-intro", String(showHoleIntro)),
    [showHoleIntro],
  );
  const [challengePreview, setChallengePreview] =
      useState<ClubChallenge | null>(sharedChallenge),
    [challengeDetails, setChallengeDetails] = useState(false);
  const [cupDetails, setCupDetails] = useState(false);
  const [roomWorkshop, setRoomWorkshop] = useState<WorkshopDocument | null>(
    null,
  );
  const [roomPublication, setRoomPublication] = useState<{
    id: string;
    revision: number;
    title: string;
    par: number;
    physics: 1 | 2;
  } | null>(null);
  const [communityDraft, setCommunityDraft] = useState<WorkshopDocument | null>(
    null,
  );
  const [communityTarget, setCommunityTarget] = useState<
    PublicationTarget | undefined
  >(readPublicationTarget);
  const [communityCapability, setCommunityCapability] =
    useState<CommunityConfig | null>(null);
  const [communityCheck, setCommunityCheck] = useState(0);
  const [communityCheckError, setCommunityCheckError] = useState("");
  useEffect(() => {
    if (!["home", "workshop", "community"].includes(screen)) return;
    const c = new AbortController();
    setCommunityCapability(null);
    setCommunityCheckError("");
    loadCommunityConfig(communityServerUrl, c.signal)
      .then(setCommunityCapability)
      .catch(() => {
        if (!c.signal.aborted)
          setCommunityCheckError(
            "No pudimos comprobar la comunidad. Puedes reintentar.",
          );
      });
    return () => c.abort();
  }, [screen, communityCheck]);
  const openCommunity = (document?: WorkshopDocument) => {
    setCommunityDraft(document || null);
    const u = new URL(location.pathname, location.origin);
    u.searchParams.set("community", "1");
    history.pushState(null, "", u);
    setScreen("community");
  };
  const closeCommunity = () => {
    history.replaceState(null, "", location.pathname);
    setScreen("home");
  };
  const editCommunity = (
    document: WorkshopDocument,
    target: PublicationTarget,
  ) => {
    try {
      const current = readWorkshopDraft();
      if (current && JSON.stringify(current) !== JSON.stringify(document)) {
        const library = readWorkshopLibrary();
        if (
          !library.some(
            (s) => JSON.stringify(s.doc) === JSON.stringify(current),
          )
        ) {
          saveWorkshopLibrary([
            ...library,
            {
              id: crypto.randomUUID(),
              updated: new Date().toISOString(),
              doc: current,
              editor: readEditor(current),
            },
          ]);
        }
      }
      if (!saveWorkshopDraft(document))
        throw Error(
          "No se pudo conservar el diseño. Exporta tu borrador antes de editar otra creación.",
        );
      setCommunityTarget(target);
      saveCommunityIntent("club-community-target", JSON.stringify(target));
      history.replaceState(null, "", location.pathname);
      setScreen("workshop");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const inviteCommunity = (entry: CreationDetail) => {
    setRoomWorkshop(null);
    setRoomPublication({
      id: entry.id,
      revision: entry.revision,
      title: entry.title,
      par: entry.par,
      physics: entry.document
        ? workshopPhysics(entry.document)
        : (entry.physics ?? 1),
    });
    setServerUrl(communityServerUrl || location.origin);
    setScreen("online");
  };
  useEffect(() => setCupDetails(false), [s.phase, s.cup?.round]);
  useEffect(() => saveLocal("golf-circuit", circuit), [circuit]);
  const onlineAvailable =
    import.meta.env.VITE_STATIC_HOST !== "true" || Boolean(serverUrl.trim());
  useEffect(() => {
    if (names.length < 2) setMatchFormat("strokes");
  }, [names.length]);
  const activeControl = mode === "online" ? "classic" : roundControl;
  const school = useGolfSchool(
    s,
    activeControl,
    mode === "local" && screen === "game",
  );
  const challenges = useClubChallenges(
    s,
    activeControl,
    mode === "local" && screen === "game",
  );
  const intro = useHoleIntro(
    screen === "game" && s.phase === "playing"
      ? `${roundId}:${s.circuit}:${s.hole}`
      : null,
    showHoleIntro &&
      mode === "local" &&
      !s.practice &&
      !s.moving &&
      s.players.every((p) => p.strokes === 0) &&
      !paused &&
      !settings,
  );
  const turnKey =
    screen === "game" && s.phase === "playing"
      ? `${s.circuit}:${s.hole}:${s.players[s.turn]?.id}`
      : null;
  const { focusId, transitioning } = useTurnPresentation(
    turnKey,
    s.players[s.turn]?.id,
  );
  const handoff = useRef(false);
  handoff.current = transitioning;
  const hold = useRef(false);
  const clockReset = useRef(false);
  hold.current =
    mode === "local" &&
    (paused ||
      settings ||
      lookMode ||
      hidden ||
      intro.active ||
      challengeDetails ||
      (school.session !== null &&
        (!s.moving || school.session.phase === "passed")));
  useEffect(() => {
    const update = () => {
      clockReset.current = true;
      setHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (turnKey) setOverview(false);
  }, [turnKey]);
  const game = useRef<Game | null>(null),
    socket = useRef<OnlineConnection | null>(null),
    lastTurn = useRef("");
  const recovery = useLocalRecovery({
    game,
    mode,
    screen,
    state: s,
    control: roundControl,
    angle,
    power,
    school: school.session,
    challenge: challenges.session,
  });
  useEffect(() => {
    initPhysics()
      .then(() => {
        setReady(true);
        window.dispatchEvent(new Event("club:physics-ready"));
      })
      .catch(() => {
        setError("No se pudo cargar el motor de físicas. Recarga la página.");
        window.dispatchEvent(
          new CustomEvent("club:failed", {
            detail:
              "No se pudo preparar la pelota. Recarga para volver a intentarlo.",
          }),
        );
      });
    return () => {
      game.current?.dispose();
      socket.current?.disconnect();
    };
  }, []);
  useEffect(() => {
    const stepper = new FixedStepper();
    let frame = 0,
      lastPaint = 0;
    const loop = (now: number) => {
      if (clockReset.current) {
        stepper.reset(now);
        clockReset.current = false;
      }
      if (game.current && !handoff.current && !hold.current) {
        stepper.advance(now, () => game.current?.tick());
        if (now - lastPaint >= 50) {
          setS(structuredClone(game.current.state));
          lastPaint = now;
        }
      } else stepper.reset(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    saveLocal("golf-volume", String(volume));
  }, [volume]);
  useEffect(
    () => saveLocal("golf-graphics-mode", graphicsMode),
    [graphicsMode],
  );
  useEffect(() => {
    const key = `${s.hole}:${s.turn}:${s.phase}`;
    if (lastTurn.current && key !== lastTurn.current) {
      if (!s.message.includes("embocó")) tone("turn", volume);
      setAngle(0);
    }
    lastTurn.current = key;
  }, [s.turn, s.hole, s.phase]);
  const savedRound = useRef(0);
  useEffect(() => {
    if (
      mode !== "local" ||
      s.phase !== "finished" ||
      roundId === savedRound.current
    )
      return;
    savedRound.current = roundId;
    if (s.practice) {
      const physics = physicsEdition(s);
      const result = recordPractice(
        physics === 1 ? readPracticeRecords(1) : practiceHistory,
        s,
        roundControl,
      );
      if (result) {
        const persisted = persistPracticeRecords(result.history, physics);
        if (physics === 2) setPracticeHistory(result.history);
        setPracticeReport({ ...result.report, persisted });
      }
      return;
    }
    if (challenges.session) return;
    const physics = physicsEdition(s);
    const result = recordCompletedRound(
      physics === 1 ? readPersonalRecords(1) : personalHistory,
      s,
      roundControl,
    );
    if (result) {
      const persisted = persistPersonalRecords(result.history, physics);
      if (physics === 2) setPersonalHistory(result.history);
      setRoundReport({ ...result.report, persisted });
    }
  }, [s.phase, roundId, mode]);
  const lastEvent = useRef(0);
  useEffect(() => {
    if (s.event && s.event.seq !== lastEvent.current) {
      lastEvent.current = s.event.seq;
      if (s.time - s.event.time > 4 || s.time < s.event.time) return;
      if (s.event.kind === "cup" && s.event.outcome)
        celebrateOutcome(s.event.outcome.kind, volume);
      else
        tone(
          s.event.kind === "water"
            ? "splash"
            : s.event.kind === "bounce" || s.event.kind === "landing"
              ? "bounce"
              : "cup",
          volume,
        );
    }
  }, [s.event?.seq]);
  const current = s.players[s.turn];
  const canShoot =
    s.phase === "playing" &&
    !s.moving &&
    !settings &&
    !paused &&
    !intro.active &&
    !challengeDetails &&
    !cupDetails &&
    school.session?.phase !== "passed" &&
    !(mode === "local" && hidden) &&
    !lookMode &&
    !transitioning &&
    (mode === "local" || (current?.id === id && status === "Conectado"));
  const toggleLook = () => {
    setLookMode((v) => !v);
    setCameraLook(defaultLook);
  };
  useEffect(() => {
    setLookMode(false);
    setCameraLook(defaultLook);
  }, [turnKey, screen]);
  const adjustCamera = (delta: Partial<CameraLook>) =>
    setCameraLook((v) => changeLook(v, delta));
  const shoot = (shot?: Shot) => {
    if (!canShoot) return;
    if (!shot) controls.clearReview();
    tone("shot", volume);
    if (mode === "local") {
      game.current?.shoot(
        current.id,
        shot?.angle ?? angle,
        shot?.power ?? power,
      );
      setS(structuredClone(game.current!.state));
    } else
      socket.current?.send({
        type: "shoot",
        angle: shot?.angle ?? angle,
        power: shot?.power ?? power,
      });
  };
  const controls = useShotControls({
    mode: activeControl,
    canShoot,
    turnKey: turnKey ? `${roundId}:${turnKey}` : null,
    angle,
    power,
    setAngle,
    setPower,
    fire: shoot,
  });
  const controlsRef = useRef({ controls, controlMode: activeControl });
  controlsRef.current = { controls, controlMode: activeControl };
  useEffect(() => saveLocal("golf-control-mode", controlMode), [controlMode]);
  const shotRef = useRef(shoot);
  shotRef.current = shoot;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,button,select")) return;
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
      ) {
        e.preventDefault();
        if (e.key === " ") {
          if (controlsRef.current.controlMode === "pulse") {
            if (!e.repeat)
              controlsRef.current.controls.start(0, 0, e.timeStamp);
          } else if (!controlsRef.current.controls.active) shotRef.current();
        } else if (e.key === "ArrowLeft")
          setAngle((a) => wrapAngle(a - (e.shiftKey ? 0.005 : 0.04)));
        else if (e.key === "ArrowRight")
          setAngle((a) => wrapAngle(a + (e.shiftKey ? 0.005 : 0.04)));
        else
          setPower((p) =>
            Math.min(
              controlsRef.current.controlMode === "pull" &&
                controlsRef.current.controls.fine
                ? 0.35
                : 1,
              Math.max(
                0.03,
                p + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 0.01 : 0.03),
              ),
            ),
          );
      }
    };
    const release = (e: KeyboardEvent) => {
      if (e.key === " " && controlsRef.current.controlMode === "pulse")
        controlsRef.current.controls.release(e.timeStamp);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", release);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", release);
    };
  }, []);
  function mountLocalGame(g: Game, control: ControlMode) {
    socket.current?.disconnect();
    game.current?.dispose();
    controls.cancel();
    lastEvent.current = 0;
    saveLocal("golf-local-names", JSON.stringify(names));
    setRoundControl(control);
    setRoundId((v) => v + 1);
    setRoundReport(null);
    setPracticeReport(null);
    setPaused(false);
    setLookMode(false);
    setSettings(false);
    setChallengeDetails(false);
    setCameraLook(defaultLook);
    setAngle(0);
    game.current = g;
    setMode("local");
    setS(structuredClone(g.state));
    setScreen("game");
    setOverview(false);
    setError("");
  }
  function startWelcomeRound(control: ControlMode) {
    const g = new Game();
    g.selectCircuit("sunset");
    g.add("0", names[0]);
    g.start("strokes");
    school.close();
    challenges.close();
    setCircuit("sunset");
    mountLocalGame(g, control);
  }
  function localStart() {
    const g = new Game();
    g.selectCircuit(circuit);
    names.forEach((n, i) => g.add(String(i), n));
    g.start(matchFormat);
    school.close();
    challenges.close();
    mountLocalGame(g, controlMode);
  }
  function resumeLocal() {
    if (!ready || recovery.save.kind !== "saved") return;
    try {
      const round = recovery.save.round;
      const restored = restoreLocalRound(round);
      school.restore(round.school, restored.state);
      challenges.restore(round.challenge, restored.state, round.control);
      setChallengePreview(null);
      setChallengeDetails(false);
      socket.current?.disconnect();
      game.current?.dispose();
      game.current = restored;
      controls.cancel();
      lastEvent.current = round.simulation.eventSeq;
      setCircuit(round.state.circuit);
      setNames(round.state.players.map((p) => p.name));
      setMatchFormat(round.state.format ?? "strokes");
      setRoundControl(round.control);
      setRoundId((v) => v + 1);
      setRoundReport(null);
      setPracticeReport(null);
      setMode("local");
      setPaused(true);
      hold.current = true;
      clockReset.current = true;
      setSettings(false);
      setLookMode(false);
      setCameraLook(defaultLook);
      setAngle(round.aim.angle);
      setPower(round.aim.power);
      lastTurn.current = `${round.state.hole}:${round.state.turn}:${round.state.phase}`;
      setS(structuredClone(restored.state));
      setScreen("game");
      setOverview(false);
      setError("");
    } catch (e) {
      setError(
        `${(e as Error).message} Puedes descartar el guardado y empezar otra partida.`,
      );
    }
  }
  function practiceStart(
    hole: number,
    selectedCircuit: CircuitId = circuit,
    lesson?: number,
    selectedControl: ControlMode = controlMode,
  ) {
    const g = new Game();
    g.selectCircuit(selectedCircuit);
    g.add("0", names[0]);
    g.startPractice(hole);
    challenges.close();
    mountLocalGame(g, selectedControl);
    setCircuit(selectedCircuit);
    if (lesson === undefined) school.close();
    else {
      school.start(lesson, g.state);
      if (lesson === 0) setPower(0.16);
    }
  }
  function startChallenge(c: ClubChallenge) {
    if (!ready) return;
    const g = new Game();
    g.state.physics = 1;
    g.selectCircuit(c.circuit);
    g.add("0", names[0]);
    g.start("strokes");
    school.close();
    mountLocalGame(g, "classic");
    challenges.start(c.id);
    setCircuit(c.circuit);
    setChallengePreview(null);
  }
  async function copyChallenge(text: string, label: string) {
    try {
      if (!navigator.clipboard) throw Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setError(label);
      return true;
    } catch {
      setError("Copia este texto: " + text);
      return false;
    }
  }
  const shareChallenge = (c: ClubChallenge) =>
    copyChallenge(
      challengeLink(c, location.origin, location.pathname),
      "Enlace del reto copiado",
    );
  function connect(type: "create" | "join" | "resume") {
    if (!onlineAvailable) {
      setError(
        "Online no está disponible en este sitio. Puedes jugar en este dispositivo.",
      );
      return;
    }
    recovery.checkpoint();
    school.close();
    challenges.close();
    setChallengeDetails(false);
    game.current?.dispose();
    game.current = null;
    socket.current?.disconnect();
    setError("");
    setStatus("Conectando…");
    setMode("online");
    let endpoint: string;
    try {
      endpoint = normalizeServerUrl(serverUrl, location.protocol === "https:");
    } catch (e) {
      setError((e as Error).message);
      setStatus("Dirección no válida");
      return;
    }
    saveLocal("golf-server-url", endpoint);
    const entry: RoomEntry =
      type === "resume"
        ? { type }
        : type === "create"
          ? {
              type,
              name,
              circuit,
              format: onlineFormat,
              ...(roomPublication
                ? {
                    publication: {
                      id: roomPublication.id,
                      revision: roomPublication.revision,
                    },
                  }
                : roomWorkshop
                  ? { workshop: roomWorkshop }
                  : {}),
            }
          : { type, name, code: code.trim().toUpperCase() };
    setLatency(null);
    socket.current = createOnlineConnection(endpoint, entry, {
      onStatus: setStatus,
      onError: setError,
      onState: setS,
      onLatency: setLatency,
      onSession: (session) => {
        setDisconnectGrace(session.disconnectGraceSeconds);
        setId(session.id);
        setCode(session.code);
        saveLocal("golf-name", name);
        setScreen("game");
      },
    });
  }

  function action(type: string, value?: string) {
    if (mode === "online") {
      if (!socket.current?.connected || status !== "Conectado") {
        setError("Recupera la conexión antes de continuar");
        return;
      }
      socket.current.send({
        type,
        ...(type === "remove"
          ? { id: value }
          : type === "cup"
            ? { cup: value }
            : type === "format"
              ? { format: value }
              : { circuit: value }),
      });
    } else if (game.current) {
      if (type === "lobby") {
        challenges.close();
        setChallengeDetails(false);
        recovery.checkpoint();
        game.current.dispose();
        game.current = null;
        setScreen("local");
        return;
      }
      if (
        game.current.state.practice &&
        ["practice-retry", "practice-next", "replay"].includes(type)
      ) {
        controls.cancel();
        const hole =
          game.current.state.hole + (type === "practice-next" ? 1 : 0);
        game.current.startPractice(hole);
        if (school.session) {
          if (type === "practice-next") school.close();
          else school.start(school.session.lesson, game.current.state);
        }
        setRoundId((v) => v + 1);
        setPracticeReport(null);
        setPaused(false);
        setLookMode(false);
        setCameraLook(defaultLook);
        setAngle(0);
        setOverview(false);
      } else if (type === "concede") {
        controls.cancel();
        game.current.concede(
          game.current.state.players[game.current.state.turn].id,
        );
      } else if (type === "next") game.current.next();
      else {
        game.current.start(game.current.state.format ?? "strokes");
        challenges.restart();
        setRoundId((v) => v + 1);
        setRoundReport(null);
      }
      setS(structuredClone(game.current.state));
    }
  }
  function leave() {
    recovery.checkpoint();
    school.close();
    challenges.close();
    setChallengeDetails(false);
    setChallengePreview(null);
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    const previous = socket.current;
    socket.current = null;
    previous?.leave();
    setLatency(null);
    if (mode === "online") saveSession(null);
    game.current?.dispose();
    game.current = null;
    setS(initial);
    setRoomWorkshop(null);
    setRoomPublication(null);
    setPaused(false);
    setLookMode(false);
    setSettings(false);
    setScreen("home");
    setError("");
    setStatus("Sin conexión");
  }
  return (
    <main
      className={
        (screen === "game" && s.phase === "playing" ? "in-match" : "") +
        (school.session && screen === "game" ? " school-mode" : "")
      }
    >
      <div className={"scene " + (screen === "game" ? "" : "hero-scene")}>
        {screen !== "workshop" && screen !== "community" && (
          <Scene
            graphicsMode={graphicsMode}
            s={screen === "game" ? s : { ...initial, circuit }}
            angle={angle}
            cameraAngle={controls.cameraAngle}
            lookMode={screen === "game" && lookMode}
            cameraLook={cameraLook}
            onLook={adjustCamera}
            canShoot={canShoot}
            controlMode={activeControl}
            shotInput={controls}
            power={power}
            onPower={(p) => {
              if (canShoot) setPower(p);
            }}
            overview={
              screen !== "game" ||
              s.phase !== "playing" ||
              overview ||
              intro.active
            }
            trainingTarget={
              school.session?.lesson === 0 &&
              school.session.phase === "playing" &&
              screen === "game"
                ? schoolTarget
                : undefined
            }
            focusId={focusId}
            onAim={(a) => {
              if (canShoot) setAngle(a);
            }}
          />
        )}
      </div>
      <header>
        <button
          className="wordmark"
          aria-label={GAME_NAME}
          onClick={() => {
            if (screen === "community") closeCommunity();
            else if (screen !== "game") setScreen("home");
          }}
        >
          H1<span>HOYO EN UNO · GOLF CLUB</span>
        </button>
        <div className="header-right">
          <span className="edition">
            {screen === "game" && s.custom
              ? "TALLER PRIVADO"
              : getCircuit(
                  screen === "game" ? s.circuit : circuit,
                ).name.toUpperCase()}{" "}
            / v{APP_VERSION}
          </span>
          <button
            className="icon"
            aria-label="Ajustes"
            onClick={() => setSettings(true)}
          >
            ☷
          </button>
        </div>
      </header>
      {error && (
        <div className="notice" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}
      {screen === "home" && (
        <ClubCatalog
          personalHistory={personalHistory}
          practiceHistory={practiceHistory}
          onPractice={practiceStart}
          hasSavedRound={recovery.save.kind === "saved"}
          learned={[0, 1, 2].every((n) =>
            school.progress[controlMode]?.includes(n),
          )}
          onQuickPlay={() => {
            if (recovery.save.kind === "saved") resumeLocal();
            else {
              const next = [0, 1, 2].find(
                (n) => !school.progress[controlMode]?.includes(n),
              );
              if (next === undefined) startWelcomeRound(controlMode);
              else practiceStart(0, "sunset", next);
            }
          }}
          circuit={circuit}
          setCircuit={setCircuit}
          controlMode={controlMode}
          setControlMode={setControlMode}
          ready={ready}
          onlineAvailable={onlineAvailable}
          onLocal={() => setScreen("local")}
          onOnline={() => {
            setRoomWorkshop(null);
            setRoomPublication(null);
            setScreen("online");
          }}
          savedRound={
            <SavedRound
              save={recovery.save}
              ready={ready}
              onResume={resumeLocal}
              onDiscard={recovery.discard}
            />
          }
          activities={
            <ChallengeHub
              history={challenges.history}
              incoming={sharedChallenge}
              onPreview={setChallengePreview}
              onShare={shareChallenge}
            />
          }
          schoolProgress={school.progress}
          onLearn={() => practiceStart(0, "sunset", 0)}
          onWorkshop={() => setScreen("workshop")}
          onCommunity={() => openCommunity()}
        />
      )}
      {screen === "workshop" && (
        <Suspense
          fallback={
            <div className="workshop">
              <p role="status">Preparando el taller…</p>
            </div>
          }
        >
          <Workshop
            graphicsMode={graphicsMode}
            versionTarget={communityTarget}
            publicationStatus={
              communityCheckError ||
              (communityCapability
                ? communityCapability.publishing
                  ? ""
                  : "Publicación no disponible: falta configurar el servicio de comunidad."
                : "Comprobando el servicio de comunidad…")
            }
            onRefreshPublication={() => setCommunityCheck((v) => v + 1)}
            onDetachPublication={() => {
              setCommunityTarget(undefined);
              clearCommunityIntent("club-community-target");
            }}
            onClose={() => setScreen("home")}
            onPublish={
              communityCapability?.publishing
                ? (document) => {
                    saveCommunityIntent("club-community-publish", "1");
                    openCommunity(document);
                  }
                : undefined
            }
            onPlayOnline={(document) => {
              setRoomWorkshop(document);
              setRoomPublication(null);
              setScreen("online");
            }}
          />
        </Suspense>
      )}
      {screen === "community" && (
        <Suspense
          fallback={
            <div className="community-page">
              <p role="status">Abriendo comunidad…</p>
            </div>
          }
        >
          <Community
            base={communityServerUrl}
            graphicsMode={graphicsMode}
            draft={communityDraft}
            target={communityTarget}
            onClose={closeCommunity}
            onEdit={editCommunity}
            onInvite={inviteCommunity}
            onPublicationSent={() => {
              setCommunityTarget(undefined);
              clearCommunityIntent("club-community-target");
            }}
          />
        </Suspense>
      )}
      {controls.active && controls.pointer && (
        <svg
          className={`gesture-layer ${controls.armed ? "gesture-armed" : "gesture-safe"}`}
          aria-hidden="true"
        >
          <circle cx={controls.pointer.ox} cy={controls.pointer.oy} r="12" />
          <line
            x1={controls.pointer.ox}
            y1={controls.pointer.oy}
            x2={controls.pointer.x}
            y2={controls.pointer.y}
          />
          <text
            x={Math.min(
              innerWidth - (controls.armed ? 60 : 155),
              Math.max(16, controls.pointer.x + 16),
            )}
            y={Math.max(30, controls.pointer.y - 20)}
          >
            {controls.armed
              ? `${Math.round(power * 100)}%`
              : "Suelta para cancelar"}
          </text>
        </svg>
      )}
      {screen === "local" && (
        <section className="panel setup">
          <button className="text-button" onClick={() => setScreen("home")}>
            ← Volver al club
          </button>
          <div className="eyebrow">
            {names.length === 1
              ? "PARTIDA SOLO"
              : "TORNEO LOCAL · PASA EL DISPOSITIVO"}
          </div>
          <h2>
            {names.length === 1 ? (
              <>
                Tu próxima
                <br />
                mejor marca.
              </>
            ) : (
              <>
                Una pantalla.
                <br />
                Todos tus rivales.
              </>
            )}
          </h2>
          <p>De 1 a 8 jugadores. Un golpe por turno. Elige cómo competir.</p>
          {recovery.save.kind === "saved" && (
            <small className="availability">
              Comenzar sustituirá la partida local guardada. Puedes reanudarla
              desde el club.
            </small>
          )}
          <div className="name-list">
            {names.map((n, i) => (
              <label key={i}>
                <span style={{ background: colors[i] }} />
                {i + 1}
                <input
                  placeholder="Tu nombre"
                  aria-label={`Jugador ${i + 1}`}
                  value={n}
                  maxLength={20}
                  onChange={(e) =>
                    setNames((ns) =>
                      ns.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                />
                {names.length > 1 && (
                  <button
                    aria-label={`Quitar jugador ${i + 1}`}
                    onClick={() =>
                      setNames((ns) => ns.filter((_, j) => j !== i))
                    }
                  >
                    ×
                  </button>
                )}
              </label>
            ))}
          </div>
          {names.length < 8 && (
            <button
              className="text-button"
              onClick={() =>
                setNames((ns) => [...ns, `Golfista ${ns.length + 1}`])
              }
            >
              + Añadir jugador
            </button>
          )}
          <MatchFormatPicker
            value={matchFormat}
            players={names.length}
            onChange={setMatchFormat}
          />
          <SelectedRound circuit={circuit} onChange={() => setScreen("home")} />

          <button
            className="primary"
            disabled={!ready || names.some((n) => !n.trim())}
            onClick={localStart}
          >
            Comenzar recorrido →
          </button>
        </section>
      )}
      {screen === "online" && (
        <section className="panel setup">
          <button className="text-button" onClick={() => setScreen("home")}>
            ← Volver al club
          </button>
          <div className="eyebrow">PARTIDA PRIVADA · 2—8 JUGADORES</div>
          <h2>
            Invita a<br />
            tu competencia.
          </h2>
          <p className="muted">
            Online utiliza control Clásico. El anfitrión elige Menos golpes o
            Duelo por puntos. Tu preferencia de control local se conserva.
          </p>
          <ConnectionSettings
            value={serverUrl}
            onChange={setServerUrl}
            defaultUrl={defaultServerUrl}
            required={!onlineAvailable}
          />
          <label className="field">
            Tu nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="¿Cómo te llamas?"
            />
          </label>
          {roomPublication ? (
            <div className="private-course-summary">
              <strong>{roomPublication.title}</strong>
              <p>
                Comunidad · Revisión {roomPublication.revision} · Par{" "}
                {roomPublication.par}. El servidor carga esta revisión
                publicada. {workshopPhysicsLabel(roomPublication.physics)}.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  history.pushState(
                    null,
                    "",
                    `${location.pathname}?community=1&creation=${roomPublication.id}&revision=${roomPublication.revision}`,
                  );
                  setCommunityDraft(null);
                  setScreen("community");
                }}
              >
                Volver a la creación
              </button>
              <button
                className="text-button"
                onClick={() => setRoomPublication(null)}
              >
                Usar recorrido oficial
              </button>
            </div>
          ) : roomWorkshop ? (
            <div className="private-course-summary">
              <strong>{roomWorkshop.name}</strong>
              <p>
                Cancha del taller · Par {roomWorkshop.par} · Un hoyo privado. El
                servidor valida el diseño antes de admitir la sala.{" "}
                {workshopPhysicsLabel(workshopPhysics(roomWorkshop))}.
              </p>
              <button
                className="text-button"
                onClick={() => setScreen("workshop")}
              >
                Volver al taller
              </button>
              <button
                className="text-button"
                onClick={() => setRoomWorkshop(null)}
              >
                Usar recorrido oficial
              </button>
            </div>
          ) : (
            <SelectedRound
              circuit={circuit}
              onChange={() => setScreen("home")}
            />
          )}
          <MatchFormatPicker
            value={onlineFormat}
            players={1}
            allowWaiting
            onChange={setOnlineFormat}
          />
          <button
            className="primary"
            disabled={!name.trim() || !ready || !onlineAvailable}
            onClick={() => connect("create")}
          >
            Crear sala →
          </button>
          <div className="divider">O ENTRA CON UN CÓDIGO</div>
          <label className="field">
            Código de invitación
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="A1B2C3"
            />
          </label>
          <button
            className="secondary"
            disabled={
              !name.trim() || code.length !== 6 || !ready || !onlineAvailable
            }
            onClick={() => connect("join")}
          >
            Unirme a la sala
          </button>
          {readSession() && (
            <button className="text-button" onClick={() => connect("resume")}>
              Recuperar mi sesión
            </button>
          )}
          <small className="muted">
            {status}. Online requiere el servidor de partidas en ejecución.
          </small>
        </section>
      )}
      {screen === "game" && (
        <GamePanels
          hideResults={mode === "local" && school.session !== null}
          shotExtras={
            s.cup && s.cup.phase !== "setup" ? (
              <button
                className="text-button pause-shot"
                aria-label="Ver copa"
                onClick={() => setCupDetails(true)}
              >
                Copa {s.cup.round + 1}/{getCupPlan(s.cup.plan)!.circuits.length}
              </button>
            ) : challenges.definition ? (
              <button
                className="text-button pause-shot"
                aria-label="Objetivos del reto"
                onClick={() => setChallengeDetails(true)}
              >
                Objetivos
              </button>
            ) : undefined
          }
          resultExtras={
            challenges.definition && challenges.report ? (
              <ChallengeSummary
                challenge={challenges.definition}
                report={challenges.report}
                persisted={challenges.persisted}
                onShare={() => void shareChallenge(challenges.definition!)}
                onCopyResult={() =>
                  void copyChallenge(
                    challengeResultText(
                      challenges.definition!,
                      challenges.report!,
                      challengeLink(
                        challenges.definition!,
                        location.origin,
                        location.pathname,
                      ),
                    ),
                    "Resultado del reto copiado",
                  )
                }
              />
            ) : undefined
          }
          roundReport={roundReport}
          practiceReport={practiceReport}
          onPause={() => setPaused(true)}
          lookMode={lookMode}
          toggleLook={toggleLook}
          onLook={adjustCamera}
          s={s}
          mode={mode}
          status={status}
          disconnectGrace={disconnectGrace}
          serverUrl={serverUrl}
          latency={latency}
          id={id}
          controlMode={activeControl}
          referencePower={controls.targetPower}
          referenceAngle={controls.cameraAngle}
          chargeArmed={controls.armed}
          pullFine={controls.fine}
          togglePullFine={controls.toggleFine}
          shotReview={controls.review}
          chargeActive={controls.active}
          startCharge={(stamp) => controls.start(0, 0, stamp)}
          releaseCharge={controls.release}
          cancelCharge={controls.cancel}
          canShoot={canShoot}
          angle={angle}
          power={power}
          overview={overview}
          transitioning={transitioning}
          setOverview={setOverview}
          setSettings={setSettings}
          setAngle={setAngle}
          setPower={setPower}
          setError={setError}
          shoot={shoot}
          action={action}
          leave={leave}
        />
      )}
      {cupDetails && s.cup && screen === "game" && (
        <CupDialog state={s} onClose={() => setCupDetails(false)} />
      )}
      {challengePreview && screen === "home" && (
        <ChallengeDialog
          challenge={challengePreview}
          record={challenges.history[challengePreview.id]}
          startDisabled={!ready}
          onStart={() => startChallenge(challengePreview)}
          onClose={() => setChallengePreview(null)}
          onShare={() => shareChallenge(challengePreview)}
          onResume={
            recovery.save.kind === "saved" &&
            restoreChallengeSession(
              recovery.save.round.challenge,
              recovery.save.round.state,
              recovery.save.round.control,
            )?.id === challengePreview.id
              ? resumeLocal
              : undefined
          }
        />
      )}
      {challengeDetails && challenges.definition && screen === "game" && (
        <ChallengeDialog
          challenge={challenges.definition}
          record={challenges.history[challenges.definition.id]}
          state={s}
          onClose={() => setChallengeDetails(false)}
          onShare={() => shareChallenge(challenges.definition!)}
        />
      )}
      {intro.active && screen === "game" && !settings && (
        <aside className="hole-preview" aria-label="Vista inicial del hoyo">
          <small>LEE EL CAMPO · EL RELOJ ESTÁ DETENIDO</small>
          <strong>{getCourse(s).name}</strong>
          <p>{getCourse(s).subtitle}</p>
          <button className="secondary" onClick={intro.skip}>
            Omitir vista del hoyo →
          </button>
        </aside>
      )}
      {school.session &&
        mode === "local" &&
        screen === "game" &&
        !settings &&
        !paused && (
          <SchoolCoach
            state={s}
            control={activeControl}
            session={school.session}
            persisted={school.persisted}
            onRetry={() =>
              practiceStart(0, "sunset", school.session!.lesson, activeControl)
            }
            onNext={() =>
              school.session!.lesson < 2
                ? practiceStart(
                    0,
                    "sunset",
                    school.session!.lesson + 1,
                    activeControl,
                  )
                : leave()
            }
            onPlayRound={() => startWelcomeRound(activeControl)}
            onClose={school.close}
          />
        )}
      {paused && mode === "local" && screen === "game" && !settings && (
        <PauseDialog
          saveStatus={recovery.save.kind === "saved" ? "saved" : "unavailable"}
          onResume={() => setPaused(false)}
          onSettings={() => setSettings(true)}
          onRestart={s.practice ? () => action("practice-retry") : undefined}
          onLeave={leave}
        />
      )}
      {settings && (
        <div className="modal-backdrop">
          <section
            className="panel settings"
            role="dialog"
            aria-modal="true"
            aria-label="Ajustes"
          >
            <button
              className="close"
              onClick={() => setSettings(false)}
              aria-label="Cerrar ajustes"
            >
              ×
            </button>
            <div className="eyebrow">A TU MANERA</div>
            <h2>Ajustes del club</h2>
            <label className="intro-setting">
              <input
                type="checkbox"
                checked={showHoleIntro}
                onChange={(e) => setShowHoleIntro(e.target.checked)}
              />
              Vista inicial de cada hoyo local (se puede omitir)
            </label>
            {screen === "game" && mode === "online" && (
              <p>
                Una desconexión conserva tu plaza durante {disconnectGrace}{" "}
                segundos. El reloj sigue corriendo. Si no vuelves a tiempo, se
                registra el retiro para que tus amigos puedan continuar.
              </p>
            )}
            {screen === "game" && s.format === "stableford" && (
              <p>
                Duelo por puntos: bogey 1, par 2, birdie 3, eagle 4. Doble bogey
                o peor suma 0. El formato queda fijo hasta terminar la ronda;
                los honores del siguiente hoyo se deciden por menos golpes.
              </p>
            )}
            <GraphicsSettings mode={graphicsMode} onChange={setGraphicsMode} />
            <label className="field">
              Sonido · {Math.round(volume * 100)}%
              <input
                aria-label="Volumen"
                type="range"
                min="0"
                max="1"
                step=".05"
                value={volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  tone("turn", Number(e.target.value));
                }}
              />
            </label>
            <button
              className="secondary"
              onClick={() => setVolume(volume ? 0 : 0.6)}
            >
              {volume ? "Silenciar" : "Activar sonido"}
            </button>
            <p>
              {
                controlModes.find(
                  (m) =>
                    m.id === (screen === "game" ? activeControl : controlMode),
                )?.description
              }{" "}
              El control se elige antes de empezar y queda fijo toda la ronda.
              Solo hay golpe normal: las rampas y el terreno determinan la
              altura.
            </p>
            <p>
              Teclado: ← → para apuntar, ↑ ↓ para potencia y espacio para
              lanzar. Mantén Shift para ajustes finos. La cámara en tercera
              persona sigue al jugador activo. Usa “Ver campo” para planear
              desde arriba y “Mapa” para consultar el recorrido sin cambiar la
              vista.
            </p>
            <p>
              En local, Pausa, Mirar, los ajustes y cambiar de pestaña detienen
              el reloj y la pelota. En online el servidor mantiene el tiempo. 12
              golpes por hoyo. {TURN_SECONDS} segundos por turno: al agotarse se
              suma un golpe y pasa el turno. Agua o fuera de campo: un golpe
              adicional y regreso al último punto. La arena frena más la pelota.
              Las demás pelotas son fantasmas y no bloquean tu trayectoria.
            </p>
            <button className="primary" onClick={() => setSettings(false)}>
              Entendido
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
