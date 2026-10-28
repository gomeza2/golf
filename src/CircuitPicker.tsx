import { circuits, type CircuitId } from "../shared/courses";
export function CircuitPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: CircuitId;
  onChange: (id: CircuitId) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="circuit-picker">
      <legend>ELIGE TU RECORRIDO</legend>
      {circuits.map((c, i) => (
        <button
          type="button"
          key={c.id}
          aria-pressed={value === c.id}
          disabled={disabled}
          onClick={() => onChange(c.id)}
        >
          <span className="circuit-number">0{i + 1}</span>
          <span>
            <strong>{c.name}</strong>
            <small>{c.description}</small>
            <b>
              {c.courses.length} HOYOS · PAR{" "}
              {c.courses.reduce((n, h) => n + h.par, 0)}
            </b>
          </span>
          <i style={{ background: c.accent }} />
        </button>
      ))}
    </fieldset>
  );
}
