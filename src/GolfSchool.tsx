import { controlModes, type ControlMode } from "./shotControls";
import type { State } from "../shared/game";
import {
  lessons,
  schoolFeedback,
  type SchoolProgress,
  type SchoolSession,
} from "./school";
export function SchoolEntry({
  control,
  progress,
  ready,
  onStart,
}: {
  control: ControlMode;
  progress: SchoolProgress;
  ready: boolean;
  onStart: () => void;
}) {
  return (
    <div className="school-entry">
      <small>ESCUELA DEL CLUB · OPCIONAL</small>
      <strong>Aprende con tiros reales.</strong>
      <p>
        Tres ejercicios: aproximación, banda y copa. Con tu control elegido y la
        física normal.
      </p>
      <span>
        {progress[control]?.length || 0}/3 completados con este control
      </span>
      <button className="secondary" disabled={!ready} onClick={onStart}>
        Aprender jugando →
      </button>
      <small>Comenzar sustituye el guardado local en curso.</small>
    </div>
  );
}
export function SchoolCoach({
  state,
  control,
  session,
  persisted,
  onRetry,
  onNext,
  onClose,
  onPlayRound,
}: {
  state: State;
  control: ControlMode;
  session: SchoolSession;
  persisted: boolean;
  onRetry: () => void;
  onNext: () => void;
  onClose: () => void;
  onPlayRound?: () => void;
}) {
  const lesson = lessons[session.lesson],
    passed = session.phase === "passed";
  return (
    <aside
      className={`school-coach ${passed ? "school-passed" : ""}`}
      aria-label="Escuela del Club"
    >
      <small>ESCUELA / {session.lesson + 1} DE 3</small>
      <div
        className="lesson-progress"
        aria-label={`Ejercicio ${session.lesson + 1} de 3`}
      >
        {["Fuerza", "Banda", "Copa"].map((label, i) => (
          <span
            key={label}
            className={
              i === session.lesson
                ? "active"
                : i < session.lesson
                  ? "complete"
                  : ""
            }
          >
            <b>{i < session.lesson ? "✓" : `0${i + 1}`}</b>
            {label}
          </span>
        ))}
      </div>
      <strong>{lesson.title}</strong>
      <svg
        className="lesson-sketch"
        viewBox="0 0 220 54"
        role="img"
        aria-label={
          session.lesson === 0
            ? "Acerca la pelota al aro con un golpe suave"
            : session.lesson === 1
              ? "Usa una pared para cambiar de dirección"
              : "Haz caer la pelota dentro de la copa"
        }
      >
        <path
          d={session.lesson === 1 ? "M24 38 L108 10 L192 38" : "M24 30 L170 30"}
          fill="none"
          stroke="#f6ce7d"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        {session.lesson === 1 ? (
          <path d="M74 7 H142" stroke="#94c8ad" strokeWidth="7" />
        ) : (
          <ellipse
            cx="182"
            cy="30"
            rx={session.lesson === 0 ? 23 : 13}
            ry={session.lesson === 0 ? 17 : 8}
            fill={session.lesson === 0 ? "none" : "#839c91"}
            stroke="#f6ce7d"
            strokeWidth="2"
          />
        )}
        <circle
          cx="24"
          cy={session.lesson === 1 ? 38 : 30}
          r="7"
          fill="#fff4db"
        />
        {session.lesson === 2 && (
          <path
            d="M182 29 V3 L205 3 L199 12 L182 12"
            fill="#f6ce7d"
            stroke="#f6ce7d"
          />
        )}
      </svg>
      <p role="status">{schoolFeedback(session, state)}</p>
      {!passed && session.lesson === 0 && !state.players[0]?.strokes && (
        <small className="lesson-tip">
          Prueba un golpe suave. La flecha indica dirección, no dónde terminará
          la pelota.
        </small>
      )}
      {!passed && (
        <small className="school-control-hint">
          {controlModes.find((m) => m.id === control)!.description}
        </small>
      )}
      {!passed && session.lesson === 1 && session.bounced && (
        <small>Banda conseguida. Espera a que se detenga.</small>
      )}
      {passed && session.lesson === 2 && onPlayRound && (
        <div className="school-graduation">
          <strong>Ya tienes tu primera línea.</strong>
          <p>
            Ahora una vuelta de tres hoyos: bandas, una subida y un péndulo. Tus
            golpes cuentan.
          </p>
          <button className="primary" onClick={onPlayRound}>
            Jugar mi primera vuelta →
          </button>
        </div>
      )}
      {passed ? (
        <button
          className={session.lesson === 2 ? "text-button" : "primary"}
          onClick={onNext}
        >
          {session.lesson === 2 ? "Terminar escuela" : "Siguiente ejercicio"} →
        </button>
      ) : (
        <button
          className="text-button"
          aria-label="Reintentar desde la salida"
          onClick={onRetry}
        >
          Reintentar
        </button>
      )}
      <button
        className="text-button"
        aria-label="Cerrar guía y seguir practicando"
        onClick={onClose}
      >
        Cerrar guía
      </button>
      {!persisted && (
        <small>
          Progreso de esta sesión: no se pudo guardar en este navegador.
        </small>
      )}
    </aside>
  );
}
