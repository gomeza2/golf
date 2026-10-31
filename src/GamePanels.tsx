import {
  useState,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { total, canStart, type State } from "../shared/game";
import {
  pointsMatch,
  matchRanking,
  matchPosition,
  confirmedPoints,
  holePoints,
} from "../shared/competition";
import { wrapAngle } from "../shared/shot";
import { getCourse, getCircuit, courseSize, colors } from "../shared/courses";
import { controlModes, type ControlMode } from "./shotControls";
import { CircuitPicker } from "./CircuitPicker";
import { HoleMap } from "./HoleMap";
import { goalLabels, type RoundReport } from "./personalRecords";
import type { CameraLook } from "./camera";
import { ScoreFeedback } from "./ScoreFeedback";
import { holeOutcome, relativeLabel } from "../shared/scoring";
import { PracticeSummary } from "./Training";
import type { PracticeReport } from "./practiceRecords";
import { useFullscreen } from "./useFullscreen";
import { MatchFormatPicker } from "./MatchFormatPicker";
import { FinalPodium } from "./FinalPodium";
type Setter<T> = Dispatch<SetStateAction<T>>;
type Props = {
  practiceReport: PracticeReport | null;
  onPause: () => void;
  lookMode: boolean;
  toggleLook: () => void;
  onLook: (delta: Partial<CameraLook>) => void;
  s: State;
  roundReport: RoundReport | null;
  mode: "local" | "online";
  status: string;
  disconnectGrace: number;
  serverUrl: string;
  latency: number | null;
  id: string;
  canShoot: boolean;
  angle: number;
  power: number;
  controlMode: ControlMode;
  chargeActive: boolean;
  referencePower: number;
  startCharge: () => void;
  releaseCharge: () => void;
  cancelCharge: () => void;
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
  practiceReport,
  onPause,
  lookMode,
  toggleLook,
  onLook,
  s,
  roundReport,
  mode,
  status,
  disconnectGrace,
  serverUrl,
  latency,
  id,
  canShoot,
  angle,
  power,
  controlMode,
  chargeActive,
  referencePower,
  startCharge,
  releaseCharge,
  cancelCharge,
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
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [s.turn, s.hole, s.moving]);
  const chargePointer = useRef<number | null>(null);
  useEffect(() => {
    if (!chargeActive) chargePointer.current = null;
  }, [chargeActive]);
  const fullscreen = useFullscreen(setError);
  const current = s.players[s.turn],
    circuit = getCircuit(s.circuit),
    courses = circuit.courses;
  const scoreColumns = s.practice
    ? [{ hole: s.hole, score: 0 }]
    : courses.map((_, i) => ({ hole: i, score: i }));
  const parPlayed = s.practice
    ? courses[s.hole].par
    : courses
        .slice(0, s.players[0]?.scores.length || 0)
        .reduce((n, c) => n + c.par, 0);
  const soloOutcome =
    s.players.length === 1 && s.players[0].scores.length
      ? holeOutcome(
          s.players[0].scores[s.players[0].scores.length - 1],
          courses[s.hole].par,
          s.players[0].capped.includes(s.hole),
        )
      : null;
  const isHost = mode === "local" || s.host === id;
  const points = pointsMatch(s);
  const sorted = matchRanking(s),
    winners = sorted.filter((p) => !p.withdrawn && matchPosition(p, s) === 1);
  const winnerLabel =
    s.players.length === 1 && !s.players[0].withdrawn
      ? "Tu vuelta, tu marca."
      : !winners.length
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
          <MatchFormatPicker
            value={s.format ?? "strokes"}
            players={s.players.length}
            allowWaiting
            disabled={!isHost || status !== "Conectado"}
            onChange={(format) => action("format", format)}
          />
          <p className="muted">
            Cambiar el recorrido o el formato cancela el estado preparado. Al
            comenzar solo entran los invitados conectados.
          </p>
          <small className="muted">
            Una desconexión durante la partida conserva la plaza{" "}
            {disconnectGrace} segundos; después se registra el retiro.
          </small>
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
          <ScoreFeedback event={s.event} time={s.time} points={points} />
          <div className="hole-hud">
            <div className="eyebrow">
              {s.practice
                ? "ENTRENAMIENTO · "
                : points
                  ? "DUELO POR PUNTOS · "
                  : ""}
              {circuit.name.toUpperCase()}
            </div>
            <h2>
              <span>{String(s.hole + 1).padStart(2, "0")}</span>{" "}
              {courses[s.hole].name}
            </h2>
            <p>
              PAR {courses[s.hole].par} <span>·</span>{" "}
              {courseSize(courses[s.hole]).length} m <span>·</span>{" "}
              {courses[s.hole].subtitle}
            </p>
          </div>
          <aside className="leaderboard">
            <div className="eyebrow">
              {points ? "PUNTOS CONFIRMADOS" : "CLASIFICACIÓN"}{" "}
              {mode === "online"
                ? "· " + status + (latency !== null ? ` · ${latency} ms` : "")
                : ""}
            </div>
            {sorted.map((p) => (
              <div className={p.id === current.id ? "active" : ""} key={p.id}>
                <span>{matchPosition(p, s)}</span>
                <i style={{ background: colors[s.players.indexOf(p)] }} />
                <strong>
                  {p.name}
                  {p.withdrawn
                    ? " · retirado"
                    : !p.connected && mode === "online"
                      ? " · sin red"
                      : ""}
                </strong>
                <b>{points ? `${confirmedPoints(p, s)} pt` : total(p)}</b>
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
            <button
              aria-label={lookMode ? "Volver a apuntar" : "Mirar"}
              aria-pressed={lookMode}
              onClick={toggleLook}
            >
              {lookMode ? "Apuntar" : "Mirar"}
            </button>
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
                  : lookMode
                    ? "Explorando el campo"
                    : canShoot
                      ? "Tu turno de golpear"
                      : "Preparando su golpe"}
            </span>
            <b>{current.strokes}/12</b>
          </div>
          {lookMode && (
            <section className="camera-dock" aria-label="Explorar cámara">
              <small>
                {mode === "local"
                  ? "PAUSA LOCAL · ARRASTRA PARA MIRAR"
                  : `MIRAR NO PAUSA EL RELOJ · ${Math.max(0, Math.ceil(s.deadline - s.time))} s`}
              </small>
              <div>
                <button
                  aria-label="Girar cámara a la izquierda"
                  onClick={() => onLook({ yaw: -0.22 })}
                >
                  ←
                </button>
                <button
                  aria-label="Subir cámara"
                  onClick={() => onLook({ pitch: 0.12 })}
                >
                  ↑
                </button>
                <button
                  aria-label="Bajar cámara"
                  onClick={() => onLook({ pitch: -0.12 })}
                >
                  ↓
                </button>
                <button
                  aria-label="Girar cámara a la derecha"
                  onClick={() => onLook({ yaw: 0.22 })}
                >
                  →
                </button>
                <button
                  aria-label="Acercar cámara"
                  onClick={() => onLook({ zoom: -0.12 })}
                >
                  +
                </button>
                <button
                  aria-label="Alejar cámara"
                  onClick={() => onLook({ zoom: 0.12 })}
                >
                  −
                </button>
              </div>
            </section>
          )}
          <section
            hidden={lookMode}
            className="shot-panel"
            data-control-mode={controlMode}
            data-expanded={expanded}
            data-moving={s.moving}
          >
            <div className="shot-top">
              <span>{s.message}</span>
              <b
                className={
                  !s.moving && s.deadline - s.time <= 8 ? "timer-urgent" : ""
                }
              >
                {s.moving
                  ? "EN JUEGO"
                  : `${Math.max(0, Math.ceil(s.deadline - s.time))} s`}
              </b>
            </div>
            <div className="control-mode-row">
              <button
                className="text-button expand-shot"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Menos ajustes" : "Más ajustes"}
              </button>
              {mode === "local" && (
                <button className="text-button pause-shot" onClick={onPause}>
                  Pausar
                </button>
              )}
              <span className="locked-control">
                {controlModes.find((mode) => mode.id === controlMode)?.name} ·
                FIJO
              </span>
              {chargeActive && (
                <button className="text-button" onClick={cancelCharge}>
                  Cancelar preparación
                </button>
              )}
            </div>
            <div className="shot-options">
              <div role="group" aria-label="Ajuste fino">
                <button
                  aria-label="Girar medio grado a la izquierda"
                  disabled={!canShoot || chargeActive}
                  onClick={() => setAngle((a) => wrapAngle(a - Math.PI / 360))}
                >
                  −0,5°
                </button>
                <button
                  aria-label="Girar medio grado a la derecha"
                  disabled={!canShoot || chargeActive}
                  onClick={() => setAngle((a) => wrapAngle(a + Math.PI / 360))}
                >
                  +0,5°
                </button>
              </div>
              <span className="shot-surface">
                {courses[s.hole].water?.length
                  ? "AGUA: +1 GOLPE"
                  : "GOLPE NORMAL · GUÍA CORTA"}
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
                  disabled={!canShoot || chargeActive}
                  onChange={(e) => setAngle(Number(e.target.value))}
                />
              </label>
              <label>
                POTENCIA <output>{Math.round(power * 1000) / 10}%</output>
                <input
                  aria-label="Potencia"
                  type="range"
                  min=".03"
                  max="1"
                  step="any"
                  value={power}
                  disabled={!canShoot || chargeActive}
                  onChange={(e) => setPower(Number(e.target.value))}
                />
              </label>
              {controlMode === "classic" ? (
                <button
                  className="primary shoot"
                  disabled={!canShoot || chargeActive}
                  onClick={shoot}
                >
                  GOLPEAR <span>→</span>
                </button>
              ) : controlMode === "pulse" ? (
                <button
                  className="primary shoot pulse-trigger"
                  disabled={!canShoot}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (chargePointer.current !== null) return;
                    chargePointer.current = e.pointerId;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    startCharge();
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    if (chargePointer.current !== e.pointerId) return;
                    chargePointer.current = null;
                    releaseCharge();
                  }}
                  onPointerCancel={(e) => {
                    if (chargePointer.current === e.pointerId) {
                      chargePointer.current = null;
                      cancelCharge();
                    }
                  }}
                  onKeyDown={(e) => {
                    if ([" ", "Enter"].includes(e.key)) {
                      e.preventDefault();
                      if (!e.repeat) startCharge();
                    }
                  }}
                  onKeyUp={(e) => {
                    if ([" ", "Enter"].includes(e.key)) {
                      e.preventDefault();
                      releaseCharge();
                    }
                  }}
                >
                  {chargeActive ? "SUELTA EN TU PUNTO" : "MANTENER Y SOLTAR"}
                </button>
              ) : (
                <div className="pull-instruction">
                  <strong>
                    {chargeActive
                      ? `${Math.round(power * 100)}% · SUELTA PARA TIRAR`
                      : s.moving
                        ? "PELOTA EN JUEGO"
                        : !canShoot
                          ? "ESPERA TU TURNO"
                          : "TIRA HACIA ATRÁS"}
                  </strong>
                  <small>Mantén sobre el campo y arrastra</small>
                </div>
              )}
            </div>
            {controlMode !== "classic" && (
              <div
                className={`charge-track ${controlMode}`}
                role="progressbar"
                aria-label={
                  controlMode === "pulse"
                    ? "Precisión de potencia"
                    : "Potencia de arrastre"
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(power * 100)}
              >
                <span style={{ width: `${power * 100}%` }} />
                <i
                  style={{
                    left: `${Math.max(0, Math.min(0.95, referencePower - 0.025)) * 100}%`,
                  }}
                />
              </div>
            )}
            <div
              className="power-presets"
              role="group"
              aria-label="Potencia rápida"
            >
              {[0.25, 0.5, 0.75, 1].map((value) => (
                <button
                  key={value}
                  disabled={!canShoot || chargeActive}
                  aria-pressed={Math.abs(power - value) < 0.005}
                  onClick={() => setPower(value)}
                >
                  {value * 100}%
                </button>
              ))}
            </div>
            <small>
              {controlMode === "classic"
                ? "Clásico · Flecha y potencia · Shift + flechas: ajuste fino · Golpear confirma"
                : controlMode === "pull"
                  ? "Arrastra hacia atrás: fuerza y dirección · Soltar dispara · Escape cancela"
                  : "La dirección y la fuerza oscilan · Mantén y suelta en tu instante · Escape cancela"}
            </small>
          </section>
        </>
      )}
      {(s.phase === "scores" || s.phase === "finished") && (
        <section className="panel results">
          <div className="eyebrow">
            {points ? "DUELO POR PUNTOS · " : ""}
            {s.practice
              ? "ENTRENAMIENTO INDIVIDUAL"
              : s.phase === "finished"
                ? "RECORRIDO COMPLETADO"
                : "HOYO COMPLETADO"}
          </div>
          <h2>
            {soloOutcome && (s.practice || s.phase === "scores")
              ? soloOutcome.label
              : s.phase === "finished"
                ? winnerLabel
                : points
                  ? "Cada hoyo suma."
                  : "Cada golpe cuenta."}
          </h2>
          <p>
            {s.practice
              ? `${courses[s.hole].name} · Hoyo ${s.hole + 1} · Par ${courses[s.hole].par}. Completa el hoyo con menos golpes.`
              : points
                ? "Más puntos gana. Desempate por hoyos en uno; si persiste, victoria compartida. Los golpes reales aparecen debajo de cada puntuación."
                : "Menor puntuación gana. Desempate por hoyos en uno; si persiste, victoria compartida."}
          </p>
          {points && (
            <div
              className="points-key"
              aria-label="Reglas del Duelo por puntos"
            >
              Doble bogey o peor: 0 · Bogey: 1 · Par: 2 · Birdie: 3 · Eagle: 4 ·
              Albatros: 5. El hoyo en uno puntúa según el par.
            </div>
          )}
          <FinalPodium state={s} />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>POS / JUGADOR</th>
                  {scoreColumns.map((c) => (
                    <th key={c.hole}>H{c.hole + 1}</th>
                  ))}
                  <th>{points ? "PUNTOS" : "TOTAL"}</th>
                  <th>ACES</th>
                  <th>PEN.</th>
                </tr>
                <tr className="score-par-row" aria-label="Par del recorrido">
                  <th scope="row">PAR</th>
                  {scoreColumns.map((c) => (
                    <td key={c.hole}>{courses[c.hole].par}</td>
                  ))}
                  <td>
                    {scoreColumns.reduce(
                      (sum, c) => sum + courses[c.hole].par,
                      0,
                    )}
                  </td>
                  <td colSpan={2} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ color: colors[s.players.indexOf(p)] }}>
                        {matchPosition(p, s)} ·{" "}
                      </span>
                      {p.name}
                      {p.withdrawn ? " · retirado" : ""}
                      {p.scores.length > 0 && !p.withdrawn && (
                        <small
                          className={`hole-outcome outcome-${holeOutcome(p.scores[p.scores.length - 1], courses[s.hole].par, p.capped.includes(s.hole)).kind}`}
                        >
                          {
                            holeOutcome(
                              p.scores[p.scores.length - 1],
                              courses[s.hole].par,
                              p.capped.includes(s.hole),
                            ).label
                          }{" "}
                          ·{" "}
                          {relativeLabel(
                            p.scores[p.scores.length - 1] - courses[s.hole].par,
                          )}
                        </small>
                      )}
                    </td>
                    {scoreColumns.map((c) => (
                      <td
                        key={c.hole}
                        className={points ? "points-cell" : undefined}
                      >
                        {points && p.scores[c.score] !== undefined ? (
                          <>
                            <b>
                              {holePoints(
                                p.scores[c.score],
                                courses[c.hole].par,
                                p.capped.includes(c.hole),
                              )}
                            </b>
                            <small>
                              {p.scores[c.score]}{" "}
                              {p.scores[c.score] === 1 ? "golpe" : "golpes"}
                              {p.capped.includes(c.hole) ? "*" : ""}
                            </small>
                          </>
                        ) : (
                          <>
                            {p.scores[c.score] ?? "—"}
                            {p.capped.includes(c.hole) ? "*" : ""}
                          </>
                        )}
                      </td>
                    ))}
                    <td>
                      <b>{points ? `${confirmedPoints(p, s)} pt` : total(p)}</b>
                      {points && (
                        <small className="points-gross">
                          {total(p)} {total(p) === 1 ? "golpe" : "golpes"}
                        </small>
                      )}
                      <small className="relative-par">
                        {total(p) === parPlayed
                          ? "PAR"
                          : `${total(p) > parPlayed ? "+" : ""}${total(p) - parPlayed}`}{" "}
                        · par {parPlayed}
                      </small>
                    </td>
                    <td>{p.aces}</td>
                    <td>{p.penalties}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small className="muted">
            * Límite de golpes. Estos hoyos no cuentan para récords personales.
          </small>
          {s.phase === "finished" && roundReport && (
            <div className="round-report" role="status">
              <strong>
                {roundReport.improved
                  ? "Nuevo récord personal"
                  : "Ronda completada"}
                : {roundReport.score} golpes
              </strong>
              <p>
                Mejor marca de este recorrido y control: {roundReport.best}.
              </p>
              {roundReport.earned.length > 0 && (
                <p>
                  {roundReport.earned.map((g) => goalLabels[g]).join(" · ")}
                </p>
              )}
              {!roundReport.persisted && (
                <small>
                  Tu marca se conserva durante esta sesión; el navegador no
                  permitió guardarla.
                </small>
              )}
            </div>
          )}
          {s.practice && <PracticeSummary report={practiceReport} />}
          {s.practice ? (
            <>
              <button
                className="primary"
                onClick={() => action("practice-retry")}
              >
                Repetir hoyo →
              </button>
              {s.hole < courses.length - 1 && (
                <button
                  className="secondary"
                  onClick={() => action("practice-next")}
                >
                  Entrenar siguiente hoyo →
                </button>
              )}
            </>
          ) : isHost ? (
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
          {s.phase === "finished" && isHost && !s.practice && (
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
