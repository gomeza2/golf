import {
  circuits,
  courseSize,
  geometry,
  uniqueCourses,
  type CircuitId,
} from "../shared/courses";
import { recordKey, goalLabels, type PersonalHistory } from "./personalRecords";
import { ShotModePicker } from "./ShotModePicker";
import type { ControlMode } from "./shotControls";
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
  setCircuit,
  controlMode,
  setControlMode,
  ready,
  onlineAvailable,
  onLocal,
  onOnline,
}: {
  circuit: CircuitId;
  personalHistory: PersonalHistory;
  setCircuit: (id: CircuitId) => void;
  controlMode: ControlMode;
  setControlMode: (mode: ControlMode) => void;
  ready: boolean;
  onlineAvailable: boolean;
  onLocal: () => void;
  onOnline: () => void;
}) {
  return (
    <section className="club-catalog">
      <div className="catalog-intro">
        <div>
          <div className="eyebrow">EL CLUB / CATÁLOGO DE PARTIDAS</div>
          <h1>
            Poco campo.
            <br />
            Mucha <em>rivalidad.</em>
          </h1>
        </div>
        <p>
          {uniqueCourses.length} hoyos distintos. Una vuelta completa.
          <br />
          Elige el recorrido, tu forma de golpear y con quién jugar.
        </p>
      </div>
      <div className="catalog-layout">
        <div
          className="course-catalog"
          role="group"
          aria-label="Catálogo de recorridos"
        >
          {circuits.map((c, i) => {
            const first = c.courses[0],
              size = courseSize(first),
              longest = Math.max(...c.courses.map((h) => courseSize(h).length)),
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
                aria-pressed={circuit === c.id}
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
                      fill={c.ground}
                      stroke={c.edge}
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
                    {first.terrain &&
                      geometry(first).surfaces.map((b, j) => (
                        <rect
                          key={`d${j}`}
                          x={b.pos[0] - b.size[0] / 2}
                          y={b.pos[2] - b.size[2] / 2}
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
                    {c.id === "tour"
                      ? "18 HOYOS SEGUIDOS"
                      : longest >= 48
                        ? "DESAFÍO"
                        : i === 0
                          ? "INICIACIÓN"
                          : "COMPETITIVO"}
                  </span>
                </div>
                <div className="course-copy">
                  <small>
                    0{i + 1} / {c.courses.length} HOYOS · PAR {par}
                  </small>
                  <strong>{c.name}</strong>
                  <p>{c.description}</p>
                  <span className="course-terrain-tags">
                    {tags.join(" · ") || "Césped · Bandas"}
                  </span>
                  <span>
                    Hasta {longest} m por hoyo{" "}
                    {circuit === c.id ? "· SELECCIONADO" : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <aside className="match-builder">
          <div className="eyebrow">TU PRÓXIMA PARTIDA</div>
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
    </section>
  );
}
