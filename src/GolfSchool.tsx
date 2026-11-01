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
}: {
  state: State;
  control: ControlMode;
  session: SchoolSession;
  persisted: boolean;
  onRetry: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const lesson = lessons[session.lesson],
    passed = session.phase === "passed";
  return (
    <aside
      className={`school-coach ${passed ? "school-passed" : ""}`}
      aria-label="Escuela del Club"
    >
      <small>ESCUELA / {session.lesson + 1} DE 3</small>
      <strong>{lesson.title}</strong>
      <p role="status">{schoolFeedback(session, state)}</p>
      {!passed && (
        <small className="school-control-hint">
          {controlModes.find((m) => m.id === control)!.description}
        </small>
      )}
      {!passed && session.lesson === 1 && session.bounced && (
        <small>Banda conseguida. Espera a que se detenga.</small>
      )}
      {passed ? (
        <button className="primary" onClick={onNext}>
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
