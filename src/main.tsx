import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io, type Socket } from "socket.io-client";
import { normalizeServerUrl } from "./serverUrl";
import { FixedStepper } from "../shared/timing";
import { wrapAngle } from "../shared/shot";
import { Game, initPhysics, type State } from "../shared/game";
import {
  colors,
  circuits,
  getCircuit,
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
import { Scene } from "./Scene";
import { GamePanels } from "./GamePanels";
import { tone } from "./audio";
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
  deadline: 45,
  message: "",
  host: "",
  code: "",
};
function App() {
  const [s, setS] = useState<State>(initial),
    [screen, setScreen] = useState<"home" | "local" | "online" | "game">(
      "home",
    ),
    [serverUrl, setServerUrl] = useState(
      new URLSearchParams(location.search).get("server") ||
        readLocal("golf-server-url", import.meta.env.VITE_SERVER_URL || ""),
    ),
    [mode, setMode] = useState<"local" | "online">("local"),
    [circuit, setCircuit] = useState<CircuitId>("sunset"),
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
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [error, setError] = useState(""),
    [latency, setLatency] = useState<number | null>(null),
    [status, setStatus] = useState("Sin conexión"),
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
    [ready, setReady] = useState(false);
  const onlineAvailable =
    import.meta.env.VITE_STATIC_HOST !== "true" || Boolean(serverUrl.trim());
  const activeControl = mode === "online" ? "classic" : roundControl;
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
  hold.current = mode === "local" && (paused || settings || lookMode || hidden);
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
    socket = useRef<Socket | null>(null),
    lastTurn = useRef("");
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
      const result = recordPractice(practiceHistory, s, roundControl);
      if (result) {
        const persisted = persistPracticeRecords(result.history);
        setPracticeHistory(result.history);
        setPracticeReport({ ...result.report, persisted });
      }
      return;
    }
    const result = recordCompletedRound(personalHistory, s, roundControl);
    if (result) {
      const persisted = persistPersonalRecords(result.history);
      setPersonalHistory(result.history);
      setRoundReport({ ...result.report, persisted });
    }
  }, [s.phase, roundId, mode]);
  const lastEvent = useRef(0);
  useEffect(() => {
    if (s.event && s.event.seq !== lastEvent.current) {
      lastEvent.current = s.event.seq;
      tone(
        s.event.kind === "water"
          ? "splash"
          : s.event.kind === "bounce"
            ? "bounce"
            : "cup",
        volume,
      );
    }
  }, [s.event?.seq]);
  useEffect(() => {
    if (status !== "Conectado") {
      setLatency(null);
      return;
    }
    const measure = () => {
      const started = performance.now();
      socket.current
        ?.timeout(3000)
        .emit("action", { type: "ping" }, (error: Error | null) =>
          setLatency(error ? null : Math.round(performance.now() - started)),
        );
    };
    measure();
    const timer = setInterval(measure, 5000);
    return () => clearInterval(timer);
  }, [status]);
  const current = s.players[s.turn];
  const canShoot =
    s.phase === "playing" &&
    !s.moving &&
    !settings &&
    !paused &&
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
    tone("shot", volume);
    if (mode === "local") {
      game.current?.shoot(
        current.id,
        shot?.angle ?? angle,
        shot?.power ?? power,
      );
      setS(structuredClone(game.current!.state));
    } else
      socket.current?.emit("action", {
        type: "shoot",
        angle: shot?.angle ?? angle,
        power: shot?.power ?? power,
      });
  };
  const controls = useShotControls({
    mode: activeControl,
    canShoot,
    turnKey,
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
            if (!e.repeat) controlsRef.current.controls.start();
          } else if (!controlsRef.current.controls.active) shotRef.current();
        } else if (e.key === "ArrowLeft")
          setAngle((a) => wrapAngle(a - (e.shiftKey ? 0.005 : 0.04)));
        else if (e.key === "ArrowRight")
          setAngle((a) => wrapAngle(a + (e.shiftKey ? 0.005 : 0.04)));
        else
          setPower((p) =>
            Math.min(
              1,
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
        controlsRef.current.controls.release();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", release);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", release);
    };
  }, []);
  function localStart() {
    socket.current?.disconnect();
    game.current?.dispose();
    lastEvent.current = 0;
    const g = new Game();
    g.selectCircuit(circuit);
    names.forEach((n, i) => g.add(String(i), n));
    g.start();
    saveLocal("golf-local-names", JSON.stringify(names));
    setRoundControl(controlMode);
    setRoundId((v) => v + 1);
    setRoundReport(null);
    setPracticeReport(null);
    setPaused(false);
    game.current = g;
    setMode("local");
    setS(structuredClone(g.state));
    setScreen("game");
    setOverview(false);
    setError("");
  }
  function practiceStart(hole: number) {
    saveLocal("golf-local-names", JSON.stringify(names));
    socket.current?.disconnect();
    game.current?.dispose();
    lastEvent.current = 0;
    const g = new Game();
    g.selectCircuit(circuit);
    g.add("0", names[0]);
    g.startPractice(hole);
    setRoundControl(controlMode);
    setRoundId((v) => v + 1);
    setRoundReport(null);
    setPracticeReport(null);
    setPaused(false);
    setLookMode(false);
    setSettings(false);
    setCameraLook(defaultLook);
    setAngle(0);
    game.current = g;
    setMode("local");
    setS(structuredClone(g.state));
    setScreen("game");
    setOverview(false);
    setError("");
  }
  function connect(type: "create" | "join" | "resume") {
    if (!onlineAvailable) {
      setError(
        "Online no está disponible en este sitio. Puedes jugar en este dispositivo.",
      );
      return;
    }
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
    const sock = io(endpoint || undefined, {
      timeout: 7000,
      reconnectionAttempts: 10,
    });
    socket.current = sock;
    sock.on("connect", () => {
      if (socket.current !== sock) return;
      setStatus("Recuperando sesión…");
      const saved = readSession();
      sock.emit(
        "action",
        saved && type === "resume"
          ? { type: "resume", ...saved }
          : { type, name, code: code.trim().toUpperCase(), circuit },
      );
    });
    sock.on("session", (session) => {
      if (socket.current !== sock) return;
      if (session.protocol !== 5) {
        setError(
          "El servidor necesita actualizarse para admitir el golpe normal equilibrado",
        );
        setStatus("Servidor de otra versión");
        sock.disconnect();
        return;
      }
      setStatus("Conectado");
      setId(session.id);
      setCode(session.code);
      saveSession(session);
      saveLocal("golf-name", name);
      setScreen("game");
    });
    sock.on("state", (state: State) => {
      if (socket.current === sock) setS(state);
    });
    sock.on("notice", (msg: string) => {
      if (socket.current !== sock) return;
      setError(msg);
      if (msg === "Sesión no válida" || msg === "Sala inexistente o caducada") {
        saveSession(null);
        setStatus("Sesión no recuperada");
      }
    });
    sock.on(
      "connect_error",
      () =>
        socket.current === sock &&
        setStatus("Servidor no disponible. Reintentando…"),
    );
    sock.on("disconnect", () => {
      if (socket.current !== sock) return;
      setStatus("Desconectado. Reconectando…");
      type = "resume";
    });
  }
  function action(type: string, value?: string) {
    if (mode === "online") {
      if (!socket.current?.connected || status !== "Conectado") {
        setError("Recupera la conexión antes de continuar");
        return;
      }
      socket.current.emit("action", {
        type,
        ...(type === "remove" ? { id: value } : { circuit: value }),
      });
    } else if (game.current) {
      if (type === "lobby") {
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
        setRoundId((v) => v + 1);
        setPracticeReport(null);
        setPaused(false);
        setLookMode(false);
        setCameraLook(defaultLook);
        setAngle(0);
        setOverview(false);
      } else if (type === "next") game.current.next();
      else {
        game.current.start();
        setRoundId((v) => v + 1);
        setRoundReport(null);
      }
      setS(structuredClone(game.current.state));
    }
  }
  function leave() {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    const previous = socket.current;
    socket.current = null;
    if (previous?.connected)
      previous
        .timeout(1500)
        .emit("action", { type: "leave" }, () => previous.disconnect());
    else previous?.disconnect();
    if (mode === "online") saveSession(null);
    game.current?.dispose();
    game.current = null;
    setS(initial);
    setPaused(false);
    setLookMode(false);
    setSettings(false);
    setScreen("home");
    setError("");
    setStatus("Sin conexión");
  }
  return (
    <main
      className={screen === "game" && s.phase === "playing" ? "in-match" : ""}
    >
      <div className={"scene " + (screen === "game" ? "" : "hero-scene")}>
        <Scene
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
          overview={screen !== "game" || s.phase !== "playing" || overview}
          focusId={focusId}
          onAim={(a) => {
            if (canShoot) setAngle(a);
          }}
        />
      </div>
      <header>
        <button
          className="wordmark"
          onClick={() => {
            if (screen !== "game") setScreen("home");
          }}
        >
          UG<span>CLUB DEL ÚLTIMO GOLPE</span>
        </button>
        <div className="header-right">
          <span className="edition">
            {getCircuit(
              screen === "game" ? s.circuit : circuit,
            ).name.toUpperCase()}{" "}
            / VOL. 03
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
          circuit={circuit}
          setCircuit={setCircuit}
          controlMode={controlMode}
          setControlMode={setControlMode}
          ready={ready}
          onlineAvailable={onlineAvailable}
          onLocal={() => setScreen("local")}
          onOnline={() => setScreen("online")}
        />
      )}
      {controls.active && controls.pointer && (
        <svg className="gesture-layer" aria-hidden="true">
          <circle cx={controls.pointer.ox} cy={controls.pointer.oy} r="22" />
          <line
            x1={controls.pointer.ox}
            y1={controls.pointer.oy}
            x2={controls.pointer.x}
            y2={controls.pointer.y}
          />
          <text
            x={Math.min(innerWidth - 60, Math.max(20, controls.pointer.x + 16))}
            y={Math.max(30, controls.pointer.y - 20)}
          >
            {Math.round(power * 100)}%
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
          <p>De 1 a 8 jugadores. Un golpe por turno. Menos golpes gana.</p>
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
            El online utiliza Clásico. Tu preferencia local se conserva.
          </p>
          <label className="field">
            Servidor online
            <input
              aria-label="Servidor online"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://tu-servidor.example.com"
              type="url"
            />
            <small>
              Necesitas un servidor del club activo. En desarrollo puedes
              dejarlo vacío para usar el servidor local.
            </small>
          </label>
          <label className="field">
            Tu nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="¿Cómo te llamas?"
            />
          </label>
          <SelectedRound circuit={circuit} onChange={() => setScreen("home")} />

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
          roundReport={roundReport}
          practiceReport={practiceReport}
          onPause={() => setPaused(true)}
          lookMode={lookMode}
          toggleLook={toggleLook}
          onLook={adjustCamera}
          s={s}
          mode={mode}
          status={status}
          serverUrl={serverUrl}
          latency={latency}
          id={id}
          controlMode={activeControl}
          referencePower={controls.targetPower}
          chargeActive={controls.active}
          startCharge={() => controls.start()}
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
      {paused && mode === "local" && screen === "game" && !settings && (
        <PauseDialog
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
              golpes por hoyo. 45 segundos por turno: al agotarse se suma un
              golpe y pasa el turno. Agua o fuera de campo: un golpe adicional y
              regreso al último punto. La arena frena más la pelota. Las demás
              pelotas son fantasmas y no bloquean tu trayectoria.
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
