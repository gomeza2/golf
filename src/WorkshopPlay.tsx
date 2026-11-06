import { useEffect, useRef, useState } from "react";
import { Game, type State } from "../shared/game";
import { compileWorkshop, type WorkshopDocument } from "../shared/workshop";
import { Scene } from "./Scene";
import { useShotControls } from "./useShotControls";
import { defaultLook } from "./camera";
import type { GraphicsMode } from "./graphics";
export function WorkshopPlay({
  doc,
  graphicsMode,
  onBack,
}: {
  doc: WorkshopDocument;
  graphicsMode: GraphicsMode;
  onBack: () => void;
}) {
  const [course] = useState(() => compileWorkshop(doc));
  const game = useRef<Game | null>(null);
  const [s, setS] = useState<State | null>(null),
    [angle, setAngle] = useState(0),
    [power, setPower] = useState(0.55),
    [overview, setOverview] = useState(false);
  const canShoot = !!s && s.phase === "playing" && !s.moving;
  useEffect(() => {
    const g = new Game(course);
    g.add("workshop", "Diseñador");
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
    <section className="workshop-test" aria-label="Prueba física del taller">
      {s && (
        <Scene
          graphicsMode={graphicsMode}
          courseOverride={course}
          s={s}
          angle={angle}
          cameraAngle={angle}
          cameraLook={defaultLook}
          lookMode={false}
          onLook={() => {}}
          controlMode="classic"
          canShoot={canShoot}
          shotInput={controls}
          power={power}
          onPower={setPower}
          onAim={setAngle}
          overview={overview}
        />
      )}
      <div className="workshop-test-top">
        <div>
          <small>TALLER · PRUEBA LOCAL</small>
          <h1>{course.name}</h1>
          <p>
            Par {course.par} ·{" "}
            {(s?.phase === "finished" ? p?.scores[0] : p?.strokes) ?? 0} golpes
            · {p?.penalties ?? 0} penalizaciones
          </p>
        </div>
        <button onClick={onBack}>Volver al diseño</button>
        <button onClick={() => setOverview((v) => !v)}>
          {overview ? "Seguir pelota" : "Ver campo"}
        </button>
      </div>
      <div className="workshop-test-controls">
        {s?.phase === "finished" ? (
          <>
            <strong>
              {p?.capped.length
                ? "Límite alcanzado"
                : `Embocado en ${p?.scores[0]} ${p?.scores[0] === 1 ? "golpe" : "golpes"}`}
            </strong>
            <p>
              Resultado de prueba. No registra récords ni verifica todos los
              caminos.
            </p>
            <button
              onClick={() => {
                game.current?.startPractice(0);
                setS(structuredClone(game.current!.state));
              }}
            >
              Repetir prueba
            </button>
          </>
        ) : (
          <>
            <p role="status">
              {s?.moving
                ? "Pelota en movimiento"
                : "Prueba tu recorrido con el golpe normal"}
            </p>
            <label>
              Ángulo de prueba
              <input
                aria-label="Ángulo de prueba"
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
              Potencia de prueba · {Math.round(power * 100)}%
              <input
                aria-label="Potencia de prueba"
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
              Golpear prueba
            </button>
            <button
              disabled={!canShoot}
              onClick={() => {
                game.current?.startPractice(0);
                setS(structuredClone(game.current!.state));
              }}
            >
              Reiniciar desde salida
            </button>
          </>
        )}
      </div>
    </section>
  );
}
