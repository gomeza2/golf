import { useEffect, useRef, useState } from "react";
import { Game, type State } from "../shared/game";
import { compileWorkshop, type WorkshopDocument } from "../shared/workshop";
import { Scene } from "./Scene";
import { useShotControls } from "./useShotControls";
import { changeLook, defaultLook, type CameraMargins } from "./camera";
import type { GraphicsMode } from "./graphics";
export function WorkshopPlay({
  doc,
  graphicsMode,
  onBack,
  label,
  playerName = "Diseñador",
  backLabel = "Volver al diseño",
  context = "workshop",
}: {
  doc: WorkshopDocument;
  graphicsMode: GraphicsMode;
  onBack: () => void;
  label?: string;
  playerName?: string;
  backLabel?: string;
  context?: "workshop" | "community";
}) {
  const [course] = useState(() => compileWorkshop(doc));
  const game = useRef<Game | null>(null);
  const header = useRef<HTMLDivElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const [margins, setMargins] = useState<CameraMargins>({
    left: 16,
    right: 16,
    top: 150,
    bottom: 250,
  });
  useEffect(() => {
    const measure = () => {
      const next = {
        left: 16,
        right: 16,
        top:
          Math.ceil(header.current?.getBoundingClientRect().bottom ?? 130) + 12,
        bottom:
          Math.ceil(
            innerHeight -
              (panel.current?.getBoundingClientRect().top ?? innerHeight - 230),
          ) + 12,
      };
      setMargins((v) =>
        JSON.stringify(v) === JSON.stringify(next) ? v : next,
      );
    };
    const observer = new ResizeObserver(measure);
    if (header.current) observer.observe(header.current);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const [s, setS] = useState<State | null>(null),
    [angle, setAngle] = useState(0),
    [power, setPower] = useState(0.55),
    [overview, setOverview] = useState(false),
    [inspecting, setInspecting] = useState(false),
    [look, setLook] = useState(defaultLook);
  const canShoot = !inspecting && !!s && s.phase === "playing" && !s.moving;
  useEffect(() => {
    const g = new Game(course);
    g.add("workshop", playerName);
    g.startPractice(0);
    game.current = g;
    setS(structuredClone(g.state));
    let frame = 0,
      last = performance.now(),
      accumulator = 0;
    function update(now: number) {
      if (document.hidden) {
        last = now;
        accumulator = 0;
      } else {
        accumulator += Math.min((now - last) / 1000, 0.1);
        last = now;
        while (accumulator >= 1 / 60) {
          g.tick();
          accumulator -= 1 / 60;
        }
        setS(structuredClone(g.state));
      }
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      g.dispose();
      game.current = null;
    };
  }, [course]);
  const fire = () => {
    if (canShoot && game.current?.shoot("workshop", angle, power))
      setS(structuredClone(game.current.state));
  };
  const controls = useShotControls({
    mode: "classic",
    canShoot,
    turnKey: s ? `${s.phase}:${s.players[0].strokes}` : null,
    angle,
    power,
    setAngle,
    setPower,
    fire,
  });
  const p = s?.players[0];
  return (
    <section
      className="workshop-test"
      aria-label={
        context === "community"
          ? "Partida individual de comunidad"
          : "Prueba física del taller"
      }
    >
      {s && (
        <Scene
          graphicsMode={graphicsMode}
          courseOverride={course}
          cameraMargins={margins}
          s={s}
          angle={angle}
          cameraAngle={angle}
          cameraLook={look}
          lookMode={inspecting}
          onLook={(delta) => setLook((v) => changeLook(v, delta))}
          controlMode="classic"
          canShoot={canShoot}
          shotInput={controls}
          power={power}
          onPower={setPower}
          onAim={setAngle}
          overview={overview}
        />
      )}
      <div ref={header} className="workshop-test-top">
        <div>
          <small>{label || "TALLER · PRUEBA LOCAL"}</small>
          <h1>{course.name}</h1>
          <p>
            Par {course.par} ·{" "}
            {(s?.phase === "finished" ? p?.scores[0] : p?.strokes) ?? 0} golpes
            · {p?.penalties ?? 0} penalizaciones
          </p>
        </div>
        <button onClick={onBack}>{backLabel}</button>
        <button onClick={() => setOverview((v) => !v)}>
          {overview ? "Seguir pelota" : "Ver campo"}
        </button>
      </div>
      <div ref={panel} className="workshop-test-controls">
        <button
          aria-pressed={inspecting}
          disabled={!!s?.moving}
          onClick={() => {
            setInspecting((v) => !v);
            setOverview(!inspecting);
          }}
        >
          Inspeccionar cancha
        </button>
        {inspecting && (
          <div
            className="workshop-inspection"
            aria-label="Inspección del taller"
          >
            <p>
              Arrastra para girar e inclinar. El tiro está bloqueado durante la
              inspección.
            </p>
            {[
              {
                label: "Girar inspección a la izquierda",
                delta: { yaw: -0.2 },
              },
              { label: "Girar inspección a la derecha", delta: { yaw: 0.2 } },
              { label: "Subir vista de inspección", delta: { pitch: 0.08 } },
              { label: "Bajar vista de inspección", delta: { pitch: -0.08 } },
              { label: "Acercar inspección", delta: { zoom: -0.1 } },
              { label: "Alejar inspección", delta: { zoom: 0.1 } },
            ].map(({ label, delta }) => (
              <button
                key={label}
                aria-label={label}
                onClick={() => setLook((v) => changeLook(v, delta))}
              >
                {
                  (
                    {
                      "Girar inspección a la izquierda": "← Girar",
                      "Girar inspección a la derecha": "Girar →",
                      "Subir vista de inspección": "↑ Vista",
                      "Bajar vista de inspección": "↓ Vista",
                      "Acercar inspección": "+ Acercar",
                      "Alejar inspección": "− Alejar",
                    } as Record<string, string>
                  )[label]
                }
              </button>
            ))}
            <button onClick={() => setLook(defaultLook)}>
              Restablecer inspección
            </button>
          </div>
        )}

        {s?.phase === "finished" ? (
          <>
            <strong>
              {p?.capped.length
                ? "Límite alcanzado"
                : context === "community"
                  ? "¡Cancha completada!"
                  : `Embocado en ${p?.scores[0]} ${p?.scores[0] === 1 ? "golpe" : "golpes"}`}
            </strong>
            <p>
              {context === "community"
                ? `${p?.scores[0]} ${p?.scores[0] === 1 ? "golpe" : "golpes"} · Sin récords oficiales.`
                : "Resultado de prueba. No registra récords ni verifica todos los caminos."}
            </p>
            <button
              onClick={() => {
                game.current?.startPractice(0);
                setS(structuredClone(game.current!.state));
              }}
            >
              {context === "community" ? "Repetir cancha" : "Repetir prueba"}
            </button>
          </>
        ) : (
          <>
            <p role="status">
              {s?.moving
                ? "Pelota en movimiento"
                : context === "community"
                  ? "Prepara tu golpe normal"
                  : "Prueba tu recorrido con el golpe normal"}
            </p>
            <label>
              {context === "community" ? "Ángulo" : "Ángulo de prueba"}
              <input
                aria-label={
                  context === "community" ? "Ángulo" : "Ángulo de prueba"
                }
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
              {context === "community" ? "Potencia" : "Potencia de prueba"} ·{" "}
              {Math.round(power * 100)}%
              <input
                aria-label={
                  context === "community" ? "Potencia" : "Potencia de prueba"
                }
                type="range"
                min="0.03"
                max="1"
                step="any"
                value={power}
                disabled={!canShoot}
                onChange={(e) => setPower(Number(e.target.value))}
              />
            </label>
            <button className="primary" disabled={!canShoot} onClick={fire}>
              {context === "community" ? "GOLPEAR" : "Golpear prueba"}
            </button>
            <button
              disabled={!canShoot}
              onClick={() => {
                game.current?.startPractice(0);
                setS(structuredClone(game.current!.state));
              }}
            >
              {context === "community"
                ? "Reiniciar intento"
                : "Reiniciar desde salida"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
