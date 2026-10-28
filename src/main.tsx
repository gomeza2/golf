import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io, type Socket } from "socket.io-client";
import { Game, initPhysics, type State } from "../shared/game";
import { colors } from "../shared/courses";
import { Scene } from "./Scene";
import { GamePanels } from "./GamePanels";
import { tone } from "./audio";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/700.css";
import "./style.css";
const initial: State = {
  phase: "lobby",
  players: [],
  hole: 0,
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
    [mode, setMode] = useState<"local" | "online">("local"),
    [names, setNames] = useState(["Golfista 1", "Golfista 2"]),
    [name, setName] = useState(localStorage.getItem("golf-name") || ""),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Sin conexión"),
    [id, setId] = useState(""),
    [angle, setAngle] = useState(0),
    [power, setPower] = useState(0.55),
    [overview, setOverview] = useState(true),
    [settings, setSettings] = useState(false),
    [volume, setVolume] = useState(
      Number(localStorage.getItem("golf-volume") ?? ".6"),
    ),
    [ready, setReady] = useState(false);
  const game = useRef<Game | null>(null),
    socket = useRef<Socket | null>(null),
    lastTurn = useRef("");
  useEffect(() => {
    initPhysics()
      .then(() => setReady(true))
      .catch(() =>
        setError("No se pudo cargar el motor de físicas. Recarga la página."),
      );
    return () => {
      game.current?.dispose();
      socket.current?.disconnect();
    };
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      if (game.current) {
        for (let i = 0; i < 3; i++) game.current.tick();
        setS(structuredClone(game.current.state));
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    localStorage.setItem("golf-volume", String(volume));
  }, [volume]);
  useEffect(() => {
    const key = `${s.hole}:${s.turn}:${s.phase}`;
    if (lastTurn.current && key !== lastTurn.current) {
      tone(s.message.includes("embocó") ? "cup" : "turn", volume);
      setAngle(0);
    }
    lastTurn.current = key;
  }, [s.turn, s.hole, s.phase]);
  const current = s.players[s.turn];
  const canShoot =
    s.phase === "playing" &&
    !s.moving &&
    !settings &&
    (mode === "local" || (current?.id === id && status === "Conectado"));
  const shoot = () => {
    if (!canShoot) return;
    tone("shot", volume);
    if (mode === "local") {
      game.current?.shoot(current.id, angle, power);
      setS(structuredClone(game.current!.state));
    } else socket.current?.emit("action", { type: "shoot", angle, power });
  };
  const shotRef = useRef(shoot);
  shotRef.current = shoot;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,button,select")) return;
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
      ) {
        e.preventDefault();
        if (e.key === " ") shotRef.current();
        else if (e.key === "ArrowLeft")
          setAngle((a) => ((a - 0.04 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        else if (e.key === "ArrowRight")
          setAngle((a) => ((a + 0.04 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        else
          setPower((p) =>
            Math.min(
              1,
              Math.max(0.03, p + (e.key === "ArrowUp" ? 0.03 : -0.03)),
            ),
          );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function localStart() {
    socket.current?.disconnect();
    game.current?.dispose();
    const g = new Game();
    names.forEach((n, i) => g.add(String(i), n));
    g.start();
    game.current = g;
    setMode("local");
    setS(structuredClone(g.state));
    setScreen("game");
    setOverview(true);
    setError("");
  }
  function connect(type: "create" | "join" | "resume") {
    game.current?.dispose();
    game.current = null;
    socket.current?.disconnect();
    setError("");
    setStatus("Conectando…");
    setMode("online");
    const sock = io(import.meta.env.VITE_SERVER_URL || undefined, {
      timeout: 7000,
      reconnectionAttempts: 10,
    });
    socket.current = sock;
    sock.on("connect", () => {
      setStatus("Conectado");
      const saved = JSON.parse(
        sessionStorage.getItem("golf-session") || "null",
      );
      sock.emit(
        "action",
        saved && type === "resume"
          ? { type: "resume", ...saved }
          : { type, name, code: code.trim().toUpperCase() },
      );
    });
    sock.on("session", (session) => {
      setId(session.id);
      setCode(session.code);
      sessionStorage.setItem("golf-session", JSON.stringify(session));
      localStorage.setItem("golf-name", name);
      setScreen("game");
    });
    sock.on("state", (state: State) => setS(state));
    sock.on("notice", (msg: string) => {
      setError(msg);
      if (msg === "Sesión no válida" || msg === "Sala inexistente o caducada")
        sessionStorage.removeItem("golf-session");
    });
    sock.on("connect_error", () =>
      setStatus("Servidor no disponible. Reintentando…"),
    );
    sock.on("disconnect", () => {
      setStatus("Desconectado. Reconectando…");
      type = "resume";
    });
  }
  function action(type: string) {
    if (mode === "online") socket.current?.emit("action", { type });
    else if (game.current) {
      type === "next" ? game.current.next() : game.current.start();
      setS(structuredClone(game.current.state));
    }
  }
  function leave() {
    socket.current?.disconnect();
    socket.current = null;
    game.current?.dispose();
    game.current = null;
    setS(initial);
    setScreen("home");
    setError("");
    setStatus("Sin conexión");
  }
  return (
    <main>
      <div className={"scene " + (screen === "game" ? "" : "hero-scene")}>
        <Scene
          s={s}
          angle={angle}
          power={power}
          overview={screen !== "game" || overview}
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
          MGB<span>MINI GOLF BATTLE</span>
        </button>
        <div className="header-right">
          <span className="edition">CLUB DEL ATARDECER / VOL. 01</span>
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
        <section className="hero">
          <div className="eyebrow">
            <span className="dot" /> EL PRÓXIMO GOLPE LO CAMBIA TODO
          </div>
          <h1>
            Poco campo.
            <br />
            Mucha <em>rivalidad.</em>
          </h1>
          <p>
            Tres hoyos. Tus amigos. Una sola victoria.
            <br />
            Encuentra tu línea en el club del atardecer.
          </p>
          <div className="hero-actions">
            <button
              className="primary"
              disabled={!ready}
              onClick={() => setScreen("local")}
            >
              {ready ? "Jugar en este dispositivo" : "Cargando físicas…"}{" "}
              <span>→</span>
            </button>
            <button className="secondary" onClick={() => setScreen("online")}>
              Jugar online <span>→</span>
            </button>
          </div>
          <div className="hero-meta">
            <span>01—08 JUGADORES</span>
            <span>3 HOYOS CON PERSONALIDAD</span>
            <span>SIN REGISTRO</span>
          </div>
          <div className="course-tag">
            <small>EL RECORRIDO INAUGURAL</small>
            <strong>Club del atardecer</strong>
            <span>Jardín · Torre · Péndulo</span>
          </div>
          <footer>LA PRECISIÓN SE ENTRENA. LAS REVANCHAS SE PIDEN.</footer>
        </section>
      )}
      {screen === "local" && (
        <section className="panel setup">
          <button className="text-button" onClick={() => setScreen("home")}>
            ← Volver al club
          </button>
          <div className="eyebrow">PASA EL DISPOSITIVO</div>
          <h2>
            Una pantalla.
            <br />
            Todos tus rivales.
          </h2>
          <p>De 1 a 8 jugadores. Un golpe por turno. Menos golpes gana.</p>
          <div className="name-list">
            {names.map((n, i) => (
              <label key={i}>
                <span style={{ background: colors[i] }} />
                {i + 1}
                <input
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
          <div className="route-preview">
            01 Jardín de rebotes <span>PAR 3</span>
            <br />
            02 La torre dorada <span>PAR 4</span>
            <br />
            03 El péndulo <span>PAR 4</span>
          </div>
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
          <label className="field">
            Tu nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="¿Cómo te llamas?"
            />
          </label>
          <button
            className="primary"
            disabled={!name.trim() || !ready}
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
            disabled={!name.trim() || code.length !== 6 || !ready}
            onClick={() => connect("join")}
          >
            Unirme a la sala
          </button>
          {sessionStorage.getItem("golf-session") && (
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
          s={s}
          mode={mode}
          status={status}
          id={id}
          canShoot={canShoot}
          angle={angle}
          power={power}
          overview={overview}
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
              Apunta tocando el campo o con el control de ángulo. Ajusta la
              potencia y pulsa GOLPEAR.
            </p>
            <p>
              Teclado: ← → para apuntar, ↑ ↓ para potencia y espacio para
              lanzar. La cámara se cambia con “Ver campo”.
            </p>
            <p>
              12 golpes por hoyo. 45 segundos por turno: al agotarse se suma un
              golpe y pasa el turno. Fuera de campo: un golpe adicional. Las
              demás pelotas son fantasmas y no bloquean tu trayectoria.
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
    <App />
  </React.StrictMode>,
);
