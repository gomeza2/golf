import { useEffect, useState } from "react";
import { getCircuit, courseSize, type CircuitId } from "../shared/courses";
import type { ControlMode } from "./shotControls";
import {
  practiceKey,
  practiceMedal,
  type PracticeHistory,
  type PracticeReport,
} from "./practiceRecords";
export function TrainingPicker({
  circuit,
  control,
  history,
  ready,
  onStart,
}: {
  circuit: CircuitId;
  control: ControlMode;
  history: PracticeHistory;
  ready: boolean;
  onStart: (hole: number) => void;
}) {
  const [hole, setHole] = useState(0);
  useEffect(() => setHole(0), [circuit]);
  const courses = getCircuit(circuit).courses,
    index = Math.min(hole, courses.length - 1),
    course = courses[index];
  const best = history[practiceKey(circuit, index, control)];
  return (
    <details className="training-picker">
      <summary>Entrenamiento · elige un hoyo</summary>
      <p>
        Practica solo, repite y busca tu medalla. La misma física, sin modificar
        los récords de una ronda completa.
      </p>
      <label className="field">
        Hoyo de entrenamiento
        <select
          aria-label="Hoyo de entrenamiento"
          value={index}
          onChange={(e) => setHole(Number(e.target.value))}
        >
          {courses.map((c, i) => (
            <option key={i} value={i}>
              {i + 1}. {c.name} · Par {c.par}
            </option>
          ))}
        </select>
      </label>
      <span>
        Par {course.par} · {courseSize(course).length} m · {course.subtitle}
      </span>
      <div className="training-best" aria-label="Marca de entrenamiento">
        {best ? (
          <>
            <strong>
              {practiceMedal(best.best, course.par)} · {best.best} golpes
            </strong>
            <small>
              {best.attempts}{" "}
              {best.attempts === 1
                ? "intento completado"
                : "intentos completados"}{" "}
              · este control
            </small>
          </>
        ) : (
          <small>
            Sin marca con este control. Oro: bajo par · Plata: al par · Bronce:
            hasta +2.
          </small>
        )}
      </div>
      <button
        className="secondary"
        disabled={!ready}
        onClick={() => onStart(index)}
      >
        Practicar este hoyo →
      </button>
    </details>
  );
}
export function PracticeSummary({ report }: { report: PracticeReport | null }) {
  return (
    <div className="practice-summary" role="status">
      {report ? (
        <>
          <div
            className={`medal medal-${report.medal.toLowerCase().replace(" ", "-")}`}
            aria-hidden="true"
          />
          <strong>
            {report.medal} · {report.score} golpes
          </strong>
          <p>
            {report.improved
              ? "Nueva marca de entrenamiento."
              : "Hoyo completado."}{" "}
            Mejor con este control: {report.best} golpes.
          </p>
          {!report.persisted && (
            <small>
              Marca de esta sesión: el navegador no permitió guardarla.
            </small>
          )}
        </>
      ) : (
        <p>
          Este intento no registra marca: termina embocando sin alcanzar el
          límite de golpes.
        </p>
      )}
      <small>
        Entrenamiento individual · no modifica la clasificación de rondas
        completas.
      </small>
    </div>
  );
}
