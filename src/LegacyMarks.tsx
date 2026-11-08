import { getCircuit, type CircuitId } from "../shared/courses";
import { readPersonalRecords, recordKey, goalLabels } from "./personalRecords";
import { readPracticeRecords, practiceKey } from "./practiceRecords";
import type { ControlMode } from "./shotControls";
export function LegacyMarks({
  circuit,
  control,
}: {
  circuit: CircuitId;
  control: ControlMode;
}) {
  const round = readPersonalRecords(1)[recordKey(circuit, control)];
  const practice = readPracticeRecords(1);
  const holes = getCircuit(circuit).courses.flatMap((course, i) => {
    const record = practice[practiceKey(circuit, i, control)];
    return record ? [{ name: course.name, ...record }] : [];
  });
  if (!round && !holes.length) return null;
  return (
    <details className="legacy-marks">
      <summary>Marcas anteriores · física original</summary>
      <p>
        Tus resultados se conservan. La potencia y los aterrizajes actuales
        tienen una clasificación personal separada.
      </p>
      {round && (
        <>
          <p>
            <strong>{round.best} golpes</strong> · {round.rounds} rondas
            completas
          </p>
          <p>{round.goals.map((goal) => goalLabels[goal]).join(" · ")}</p>
        </>
      )}
      {holes.length > 0 && (
        <ul>
          {holes.map((r) => (
            <li key={r.name}>
              {r.name}: <strong>{r.best} golpes</strong> · {r.attempts} intentos
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
