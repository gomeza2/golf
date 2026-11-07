import { CourseFootprint } from "./CourseFootprint";
import {
  circuits,
  courseSize,
  courseDistance,
  geometry,
  uniqueCourses,
  type CircuitId,
} from "../shared/courses";
import { recordKey, goalLabels, type PersonalHistory } from "./personalRecords";
import { TrainingPicker } from "./Training";
import type { PracticeHistory } from "./practiceRecords";
import { ShotModePicker } from "./ShotModePicker";
import type { ControlMode } from "./shotControls";
import { SchoolEntry } from "./GolfSchool";
import type { SchoolProgress } from "./school";
export function SelectedRound({
  circuit,
  onChange,
}: {
  circuit: CircuitId;
  onChange: () => void;
}) {
  const selected = circuits.find((c) => c.id === circuit)!;
  return (
    <div className="selected-round">
      <div>
        <small>RECORRIDO ELEGIDO</small>
        <strong>{selected.name}</strong>
        <span>
          {selected.courses.length} hoyos · Par{" "}
          {selected.courses.reduce((n, c) => n + c.par, 0)}
        </span>
      </div>
      <button className="text-button" onClick={onChange}>
        Cambiar recorrido
      </button>
    </div>
  );
}
export function ClubCatalog({
  circuit,
  personalHistory,
  practiceHistory,
  onPractice,
  setCircuit,
  controlMode,
  setControlMode,
  ready,
  onlineAvailable,
  onLocal,
  onOnline,
  savedRound,
  schoolProgress,
  onLearn,
  activities,
  onWorkshop,
  onCommunity,
  onQuickPlay,
  hasSavedRound,
  learned,
}: {
  circuit: CircuitId;
  personalHistory: PersonalHistory;
  practiceHistory: PracticeHistory;
  onPractice: (hole: number) => void;
  setCircuit: (id: CircuitId) => void;
  controlMode: ControlMode;
  setControlMode: (mode: ControlMode) => void;
  ready: boolean;
  onlineAvailable: boolean;
  onLocal: () => void;
  onOnline: () => void;
  savedRound?: React.ReactNode;
  schoolProgress: SchoolProgress;
  onLearn: () => void;
  activities?: React.ReactNode;
  onWorkshop: () => void;
  onCommunity: () => void;
  onQuickPlay: () => void;
  hasSavedRound: boolean;
  learned: boolean;
}) {
  const catalog = [
    circuits.find((c) => c.id === "rift")!,
    ...circuits.filter((c) => c.id !== "rift" && c.id !== "rift-alt"),
  ];
  return (
    <section className="club-catalog">
      <div className="catalog-intro welcome-hero">
        <div className="welcome-copy">
          <div className="eyebrow">HOYO EN UNO · UN CLUB PARA COMPARTIR</div>
          <h1>
            Un buen golpe.
            <br />
            <em>Una gran rivalidad.</em>
          </h1>
          <p>
            Una banda inesperada. Un atajo sobre el agua. Ese último golpe que
            cambia la partida. Empieza a jugar o reúne a tus amigos.
          </p>
          <div className="welcome-actions">
            <button
              className="primary welcome-play"
              disabled={!ready}
              onClick={onQuickPlay}
            >
              {hasSavedRound ? "Seguir mi partida →" : "Jugar ahora →"}
            </button>
            <button
              className="welcome-online"
              disabled={!ready || !onlineAvailable}
              onClick={onOnline}
            >
              <svg
                className="friends-symbol"
                aria-hidden="true"
                viewBox="0 0 24 24"
              >
                <circle cx="8" cy="7" r="3" />
                <path d="M2 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 4 5v3" />
              </svg>{" "}
              Jugar online con amigos
            </button>
          </div>
          <small className="welcome-caption">
            {hasSavedRound
              ? "Tu partida guardada sigue aquí. Puedes continuarla."
              : learned
                ? "Sin cuenta · Vuelta de tres hoyos · Tu control elegido"
                : "Sin cuenta · Aprende con tiros reales · A tu ritmo"}
          </small>
          <small className="welcome-caption">
            {onlineAvailable
              ? "Online: crea una sala privada o entra con un código."
              : "Online no disponible en este sitio. El modo local sigue disponible."}
          </small>
          <div className="welcome-links">
            <a href="#recorridos">Elegir recorrido ↓</a>
            <button
              className="text-button"
              disabled={!ready}
              onClick={() => {
                if (circuit !== "rift-alt") setCircuit("rift");
                onLocal();
              }}
            >
              Jugar Al Filo →
            </button>
          </div>
        </div>
        <div className="welcome-window" aria-hidden="true">
          <span className="welcome-stamp">
            H1<span>GOLF CLUB</span>
          </span>
          <div className="welcome-field-caption">
            <span>LEE LA PISTA. ENCUENTRA TU LÍNEA.</span>
            <strong>
              La próxima buena historia
              <br />
              empieza con un golpe.
            </strong>
          </div>
        </div>
        <div className="welcome-footnote">
          {uniqueCourses.length} hoyos distintos · Tres formas de golpear ·
          Local, online y taller
        </div>
      </div>
      <div className="welcome-route" aria-label="Tu primera vuelta">
        <span>
          <b>01</b> Siente la fuerza
        </span>
        <span>
          <b>02</b> Descubre las bandas
        </span>
        <span>
          <b>03</b> Ve por la copa
        </span>
      </div>
      {activities && (
        <details className="club-activities">
          <summary>
            Retos del club <span>Desafío diario · Copa semanal →</span>
          </summary>
          {activities}
        </details>
      )}
      <div className="catalog-layout" id="recorridos">
        <div
          className="course-catalog"
          role="group"
          aria-label="Catálogo de recorridos"
        >
          {catalog.map((c, i) => {
            const first = c.courses[0],
              size = courseSize(first),
              longest = Math.max(...c.courses.map(courseDistance)),
              par = c.courses.reduce((n, h) => n + h.par, 0);
            const tags = [
              c.courses.some((h) => h.water?.length) ? "Agua" : "",
              c.courses.some((h) => h.sand?.length) ? "Arena" : "",
              c.courses.some((h) => h.rough?.length) ? "Césped alto" : "",
              c.courses.some((h) => h.dirt?.length) ? "Tierra" : "",
              c.courses.some(
                (h) => h.ramp || h.terrain?.some((b) => b.rotation),
              )
                ? "Pendientes"
                : "",
            ].filter(Boolean);
            return (
              <button
                key={c.id}
                className={`course-choice ${c.id === "tour" ? "full-tour" : ""}`}
                aria-pressed={
                  circuit === c.id ||
                  (c.id === "rift" && circuit === "rift-alt")
                }
                onClick={() => setCircuit(c.id)}
              >
                <div
                  className="course-art"
                  style={{ background: c.background }}
                >
                  <svg
                    viewBox={`${-size.width / 2 - 1} ${-size.length / 2 - 1} ${size.width + 2} ${size.length + 2}`}
                    aria-hidden="true"
                  >
                    <rect
                      x={-size.width / 2}
                      y={-size.length / 2}
                      width={size.width}
                      height={size.length}
                      fill={first.outerWalls === false ? "none" : c.ground}
                      stroke={first.outerWalls === false ? "none" : c.edge}
                      strokeWidth={0.6}
                    />
                    {first.water?.map((z, j) => (
                      <rect
                        key={`w${j}`}
                        x={z.x - z.width / 2}
                        y={z.z - z.length / 2}
                        width={z.width}
                        height={z.length}
                        fill="#2194a0"
                      />
                    ))}
                    {first.outerWalls === false && (
                      <CourseFootprint course={first} color={c.ground} />
                    )}
                    {first.outerWalls !== false &&
                      first.terrain &&
                      geometry(first).surfaces.map((b, j) => (
                        <rect
                          key={`d${j}`}
                          x={-b.size[0] / 2}
                          y={-b.size[2] / 2}
                          transform={`translate(${b.pos[0]} ${b.pos[2]}) rotate(${(-(b.yaw || 0) * 180) / Math.PI})`}
                          width={b.size[0]}
                          height={b.size[2]}
                          fill={c.ground}
                        />
                      ))}
                    {first.blocks.map((b, j) => (
                      <rect
                        key={j}
                        x={-b.size[0] / 2}
                        y={-b.size[2] / 2}
                        width={b.size[0]}
                        height={b.size[2]}
                        transform={`translate(${b.pos[0]} ${b.pos[2]}) rotate(${(-(b.yaw || 0) * 180) / Math.PI})`}
                        fill={c.edge}
                      />
                    ))}
                    <circle
                      cx={first.start.x}
                      cy={first.start.z}
                      r={0.6}
                      fill="#f4d47b"
                    />
                    <circle
                      cx={first.cup.x}
                      cy={first.cup.z}
                      r={0.6}
                      fill="#112e2c"
                      stroke="white"
                      strokeWidth={0.15}
                    />
                  </svg>
                  <span>
                    {c.id === "rift"
                      ? "NUEVO · SIN PERÍMETRO RECTANGULAR"
                      : c.id === "aces"
                        ? "RIESGO / RECOMPENSA"
                        : c.id === "tour"
                          ? "18 HOYOS SEGUIDOS"
                          : longest >= 48
                            ? "DESAFÍO"
                            : c.id === "sunset"
                              ? "INICIACIÓN"
                              : "COMPETITIVO"}
                  </span>
                </div>
                <div className="course-copy">
                  <small>
                    {String(
                      circuits.findIndex((v) => v.id === c.id) + 1,
                    ).padStart(2, "0")}{" "}
                    / {c.courses.length} HOYOS · PAR {par}
                  </small>
                  <strong>{c.name}</strong>
                  <p>{c.description}</p>
                  <span className="course-terrain-tags">
                    {tags.join(" · ") || "Césped · Bandas"}
                  </span>
                  <span>
                    Hasta {longest} m{" "}
                    {c.id.startsWith("rift")
                      ? "por la ruta amplia"
                      : "por hoyo"}{" "}
                    {circuit === c.id ||
                    (c.id === "rift" && circuit === "rift-alt")
                      ? "· SELECCIONADO"
                      : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <aside className="match-builder">
          {savedRound}
          <div className="eyebrow">TU PRÓXIMA PARTIDA</div>
          {(circuit === "rift" || circuit === "rift-alt") && (
            <div
              className="pin-picker"
              role="group"
              aria-label="Posición de banderas"
            >
              <small>BANDERAS · MISMA HUELLA, OTRAS LLEGADAS</small>
              <div>
                {(["rift", "rift-alt"] as CircuitId[]).map((id) => (
                  <button
                    key={id}
                    aria-pressed={circuit === id}
                    onClick={() => setCircuit(id)}
                  >
                    {id === "rift" ? "Abiertas" : "Cruzadas"}
                  </button>
                ))}
              </div>
              <p>
                Se eligen antes de jugar. Todos afrontan las mismas posiciones.
              </p>
            </div>
          )}
          <SelectedRound
            circuit={circuit}
            onChange={() =>
              document
                .querySelector('.course-choice[aria-pressed="true"]')
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          />
          <ShotModePicker value={controlMode} onChange={setControlMode} />
          <div className="personal-record" aria-label="Récord personal">
            <small>SOLO · ESTE RECORRIDO Y CONTROL</small>
            {personalHistory[recordKey(circuit, controlMode)] ? (
              <>
                <strong>
                  {personalHistory[recordKey(circuit, controlMode)].best} golpes
                </strong>
                <span>
                  {personalHistory[recordKey(circuit, controlMode)].rounds}{" "}
                  rondas válidas
                </span>
                <p>
                  {personalHistory[recordKey(circuit, controlMode)].goals
                    .map((g) => goalLabels[g])
                    .join(" · ")}
                </p>
              </>
            ) : (
              <p>
                Completa una ronda sin alcanzar el límite para registrar tu
                mejor marca.
              </p>
            )}
          </div>
          <TrainingPicker
            circuit={circuit}
            control={controlMode}
            history={practiceHistory}
            ready={ready}
            onStart={onPractice}
          />
          <SchoolEntry
            control={controlMode}
            progress={schoolProgress}
            ready={ready}
            onStart={onLearn}
          />
          <button className="primary" disabled={!ready} onClick={onLocal}>
            {ready ? "Jugar en este dispositivo" : "Cargando físicas…"} →
          </button>
          <small>1–8 jugadores · Una pantalla · Sin registro</small>
          <button
            className="secondary"
            disabled={!onlineAvailable}
            onClick={onOnline}
          >
            Jugar online →
          </button>
          {!onlineAvailable && (
            <p className="availability">
              Online necesita un servidor conectado.{" "}
              <button className="text-button" onClick={onOnline}>
                Conectar un servidor
              </button>
            </p>
          )}
        </aside>
      </div>
      <div className="adventure-entry">
        <div>
          <small>NUEVO RECORRIDO · CUMBRES Y MAREAS</small>
          <strong>Abajo hay agua. Arriba, otra ruta.</strong>
          <p>
            Glaciar de ocho metros, faro en espiral y túneles bajo los puentes.
            Tres hoyos con rutas amplias y atajos.
          </p>
        </div>
        <button
          className="primary"
          disabled={!ready}
          onClick={() => {
            setCircuit("cumbres");
            onLocal();
          }}
        >
          Jugar Cumbres y Mareas
        </button>
      </div>
      <div className="workshop-entry">
        <div>
          <small>CREATIVIDAD DEL CLUB</small>
          <strong>Tu cancha. Tus decisiones.</strong>
          <p>
            Plataformas, rampas y obstáculos. Crea, guarda y prueba con físicas
            reales.
          </p>
        </div>
        <button disabled={!ready} onClick={onWorkshop}>
          Abrir taller de hoyos
        </button>
      </div>
      <div className="community-entry">
        <div>
          <small>CREACIONES DE JUGADORES</small>
          <strong>Una comunidad de nuevas ideas.</strong>
          <p>
            Descubre canchas publicadas, versiones y desafíos creados en el
            taller.
          </p>
        </div>
        <button onClick={onCommunity}>Abrir comunidad de canchas</button>
      </div>
    </section>
  );
}
