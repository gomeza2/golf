import { useState, type Dispatch, type SetStateAction } from "react";
import { ranking, total, position, canStart, type State } from "../shared/game";
import { wrapAngle, type ShotStyle } from "../shared/shot";
import { getCourse, getCircuit, courseSize, colors } from "../shared/courses";
import { CircuitPicker } from "./CircuitPicker";
import { HoleMap } from "./HoleMap";
import { useFullscreen } from "./useFullscreen";
type Setter<T> = Dispatch<SetStateAction<T>>;
type Props = {
  s: State;
  mode: "local" | "online";
  status: string;
  serverUrl: string;
  latency: number | null;
  id: string;
  canShoot: boolean;
  angle: number;
  power: number;
  style: ShotStyle;
  setStyle: Setter<ShotStyle>;
  overview: boolean;
  transitioning: boolean;
  setOverview: Setter<boolean>;
  setSettings: Setter<boolean>;
  setAngle: Setter<number>;
  setPower: Setter<number>;
  setError: Setter<string>;
  shoot: () => void;
  action: (type: string, value?: string) => void;
  leave: () => void;
};
export function GamePanels({
  s,
  mode,
  status,
  serverUrl,
  latency,
  id,
  canShoot,
  angle,
  power,
  style,
  setStyle,
  overview,
  transitioning,
  setOverview,
  setSettings,
  setAngle,
  setPower,
  setError,
  shoot,
  action,
  leave,
}: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const fullscreen = useFullscreen(setError);
  const current = s.players[s.turn],
    circuit = getCircuit(s.circuit),
    courses = circuit.courses;
  const isHost = mode === "local" || s.host === id;
  const sorted = ranking(s.players),
    winners = sorted.filter(
      (p) =>
        !p.withdrawn &&
        total(p) === total(sorted[0]) &&
        p.aces === sorted[0].aces,
    );
  const winnerLabel = !winners.length
    ? "Partida abandonada."
    : winners.length > 1
      ? "Victoria compartida."
      : `${sorted[0]?.name} gana el club.`;
  return (
    <>
      {s.phase === "lobby" && (
        <section className="panel setup">
          <div className="eyebrow">
            SALA PRIVADA / {status}
            {latency !== null ? ` · ${latency} ms` : ""}
          </div>
          <h2>El club está abierto.</h2>
          <p>
            Comparte el código o el enlace. Todos deben estar listos para
            comenzar.
          </p>
          <button
            className="invite"
            onClick={() => {
              if (!navigator.clipboard) {
                setError("Copia el código de sala: " + s.code);
                return;
              }
              navigator.clipboard
                ?.writeText(
                  `${location.origin}${location.pathname}?room=${s.code}${serverUrl ? `&server=${encodeURIComponent(serverUrl)}` : ""}`,
                )
                .then(() => setError("Enlace copiado"))
                .catch(() => setError("Copia el código de sala: " + s.code));
            }}
          >
            <span data-testid="room-code">{s.code}</span>
            <small>COPIAR INVITACIÓN →</small>
          </button>
          <CircuitPicker
            value={s.circuit}
            onChange={(id) => action("circuit", id)}
            disabled={!isHost || status !== "Conectado"}
          />
          <p className="muted">
            Cambiar el recorrido cancela el estado preparado. Al comenzar solo
            entran los invitados conectados.
          </p>
          <div className="players">
            {s.players.map((p, i) => (
              <div key={p.id}>
                <i style={{ background: colors[i] }} />
                <strong>{p.name}</strong>
                <span>
                  {p.id === s.host ? "ANFITRIÓN · " : ""}
                  {!p.connected
                    ? "DESCONECTADO"
                    : p.ready
                      ? "LISTO"
                      : "ESPERANDO"}
                </span>
                {isHost && !p.connected && (
                  <button
                    className="text-button"
                    aria-label={`Quitar a ${p.name}`}
                    onClick={() => action("remove", p.id)}
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="secondary" onClick={() => action("ready")}>
            {s.players.find((p) => p.id === id)?.ready
              ? "Cancelar preparado"
              : "Estoy listo"}
          </button>
          {isHost && (
            <button
              className="primary"
              disabled={!canStart(s) || status !== "Conectado"}
              onClick={() => action("start")}
            >
              Comenzar partida →
            </button>
          )}
          <button className="text-button" onClick={leave}>
            Salir de la sala
          </button>
        </section>
      )}
      {s.phase === "playing" && (
        <>
          <div className="hole-hud">
            <div className="eyebrow">{circuit.name.toUpperCase()}</div>
            <h2>
              <span>0{s.hole + 1}</span> {courses[s.hole].name}
            </h2>
            <p>
              PAR {courses[s.hole].par} <span>·</span>{" "}
              {courseSize(courses[s.hole]).length} m <span>·</span>{" "}
              {courses[s.hole].subtitle}
            </p>
          </div>
          <aside className="leaderboard">
            <div className="eyebrow">
              CLASIFICACIÓN{" "}
              {mode === "online"
                ? "· " + status + (latency !== null ? ` · ${latency} ms` : "")
                : ""}
            </div>
            {ranking(s.players).map((p, i) => (
              <div className={p.id === current.id ? "active" : ""} key={p.id}>
                <span>{position(p, s.players)}</span>
                <i style={{ background: colors[s.players.indexOf(p)] }} />
                <strong>
                  {p.name}
                  {p.withdrawn
                    ? " · retirado"
                    : !p.connected && mode === "online"
                      ? " · sin red"
                      : ""}
                </strong>
                <b>{total(p)}</b>
              </div>
            ))}
          </aside>
          {transitioning && (
            <div className="turn-intro" role="status">
              <div
                className="turn-orb"
                style={{ background: colors[s.turn] }}
              />
              <div>
                <small>
                  {mode === "online" && current.id !== id
                    ? "SIGUIENDO A"
                    : "A LA PISTA"}
                </small>
                <strong>{current.name}</strong>
                <span>
                  Hoyo {s.hole + 1} · {courses[s.hole].name}
                </span>
              </div>
            </div>
          )}
          {mapOpen && <HoleMap s={s} />}
          <div className="view-controls">
            <button onClick={() => setOverview((v) => !v)}>
              {overview ? "Seguir pelota" : "Ver campo"}
            </button>
            <button
              aria-pressed={mapOpen}
              onClick={() => setMapOpen((v) => !v)}
            >
              {mapOpen ? "Cerrar mapa" : "Mapa"}
            </button>
            {fullscreen.supported && (
              <button onClick={() => void fullscreen.toggle()}>
                {fullscreen.fullscreen
                  ? "Salir de pantalla completa"
                  : "Pantalla completa"}
              </button>
            )}
            <button onClick={() => setSettings(true)}>Controles</button>
            <button onClick={leave}>Salir</button>
          </div>
          <div className="turn-toast" aria-live="polite">
            <i style={{ background: colors[s.turn] }} />
            <strong>{current.name}</strong>
            <span>
              {transitioning
                ? "Cambio de jugador"
                : s.moving
                  ? "Pelota en movimiento"
                  : canShoot
                    ? "Tu turno de golpear"
                    : "Preparando su golpe"}
            </span>
            <b>{current.strokes}/12</b>
          </div>
          <section className="shot-panel">
            <div className="shot-top">
              <span>{s.message}</span>
              <b>
                {s.moving
                  ? "EN JUEGO"
                  : `${Math.max(0, Math.ceil(s.deadline - s.time))} s`}
              </b>
            </div>
            <div className="shot-options">
              <div role="group" aria-label="Tipo de golpe">
                <button
                  aria-pressed={style === "putt"}
                  disabled={!canShoot}
                  onClick={() => setStyle("putt")}
                >
                  Rodado
                </button>
                <button
                  aria-pressed={style === "chip"}
                  disabled={!canShoot}
                  onClick={() => setStyle("chip")}
                >
                  Elevado
                </button>
              </div>
              <div role="group" aria-label="Ajuste fino">
                <button
                  aria-label="Girar medio grado a la izquierda"
                  disabled={!canShoot}
                  onClick={() => setAngle((a) => wrapAngle(a - Math.PI / 360))}
                >
                  −0,5°
                </button>
                <button
                  aria-label="Girar medio grado a la derecha"
                  disabled={!canShoot}
                  onClick={() => setAngle((a) => wrapAngle(a + Math.PI / 360))}
                >
                  +0,5°
                </button>
              </div>
              <span className="shot-surface">
                {courses[s.hole].water?.length
                  ? "AGUA: +1 GOLPE"
                  : "PRIMER REBOTE APROXIMADO"}
              </span>
            </div>
            <div className="shot-controls">
              <label>
                ÁNGULO <output>{((angle * 180) / Math.PI).toFixed(1)}°</output>
                <input
                  aria-label="Ángulo"
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="any"
                  value={angle}
                  disabled={!canShoot}
                  onChange={(e) => setAngle(Number(e.target.value))}
                />
              </label>
              <label>
                POTENCIA <output>{Math.round(power * 100)}%</output>
                <input
                  aria-label="Potencia"
                  type="range"
                  min=".03"
                  max="1"
                  step=".01"
                  value={power}
                  disabled={!canShoot}
                  onChange={(e) => setPower(Number(e.target.value))}
                />
              </label>
              <button
                className="primary shoot"
                disabled={!canShoot}
                onClick={shoot}
              >
                GOLPEAR <span>→</span>
              </button>
            </div>
            <div
              className="power-presets"
              role="group"
              aria-label="Potencia rápida"
            >
              {[0.25, 0.5, 0.75, 1].map((value) => (
                <button
                  key={value}
                  disabled={!canShoot}
                  aria-pressed={Math.abs(power - value) < 0.005}
                  onClick={() => setPower(value)}
                >
                  {value * 100}%
                </button>
              ))}
            </div>
            <small>
              Arrastra: dirección y fuerza · Shift + flechas: ajuste fino ·
              Soltar no dispara
            </small>
          </section>
        </>
      )}
      {(s.phase === "scores" || s.phase === "finished") && (
        <section className="panel results">
          <div className="eyebrow">
            {s.phase === "finished"
              ? "RECORRIDO COMPLETADO"
              : "HOYO COMPLETADO"}
          </div>
          <h2>{s.phase === "finished" ? winnerLabel : "Cada golpe cuenta."}</h2>
          <p>
            Menor puntuación gana. Desempate por hoyos en uno; si persiste,
            victoria compartida.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>POS / JUGADOR</th>
                  {courses.map((_, i) => (
                    <th key={i}>H{i + 1}</th>
                  ))}
                  <th>TOTAL</th>
                  <th>ACES</th>
                  <th>PEN.</th>
                </tr>
              </thead>
              <tbody>
                {ranking(s.players).map((p, i) => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ color: colors[s.players.indexOf(p)] }}>
                        {position(p, s.players)} ·{" "}
                      </span>
                      {p.name}
                      {p.withdrawn ? " · retirado" : ""}
                    </td>
                    {courses.map((_, j) => (
                      <td key={j}>{p.scores[j] ?? "—"}</td>
                    ))}
                    <td>
                      <b>{total(p)}</b>
                    </td>
                    <td>{p.aces}</td>
                    <td>{p.penalties}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isHost ? (
            <button
              className="primary"
              disabled={
                mode === "online" &&
                (status !== "Conectado" ||
                  (s.phase === "finished" &&
                    s.players.filter((p) => p.connected && !p.withdrawn)
                      .length < 2))
              }
              onClick={() => action(s.phase === "scores" ? "next" : "replay")}
            >
              {s.phase === "scores" ? "Siguiente hoyo →" : "La revancha →"}
            </button>
          ) : (
            <p>Esperando al anfitrión…</p>
          )}
          {s.phase === "finished" && isHost && (
            <button className="secondary" onClick={() => action("lobby")}>
              Elegir otro recorrido
            </button>
          )}
          <button className="text-button" onClick={leave}>
            Volver al inicio
          </button>
        </section>
      )}
    </>
  );
}
