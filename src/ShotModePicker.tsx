import { controlModes, type ControlMode } from "./shotControls";
export function ShotModePicker({
  value,
  onChange,
}: {
  value: ControlMode;
  onChange: (mode: ControlMode) => void;
}) {
  return (
    <fieldset className="shot-mode-picker">
      <legend>ELIGE CÓMO GOLPEAR</legend>
      {controlModes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          aria-pressed={value === mode.id}
          onClick={() => onChange(mode.id)}
        >
          <small>{mode.difficulty}</small>
          <strong>{mode.name}</strong>
          <span>{mode.description}</span>
        </button>
      ))}
    </fieldset>
  );
}
