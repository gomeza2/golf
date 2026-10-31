import type { MatchFormat } from "../shared/scoring";
export function MatchFormatPicker({
  value,
  players,
  onChange,
  disabled = false,
  allowWaiting = false,
}: {
  value: MatchFormat;
  players: number;
  onChange: (value: MatchFormat) => void;
  disabled?: boolean;
  allowWaiting?: boolean;
}) {
  return (
    <fieldset className="match-format-picker">
      <legend>Cómo se gana · fijo durante la ronda</legend>
      <button
        type="button"
        aria-pressed={value === "strokes"}
        disabled={disabled}
        onClick={() => onChange("strokes")}
      >
        <strong>Menos golpes</strong>
        <span>La vuelta clásica. Suma todos tus golpes.</span>
      </button>
      <button
        type="button"
        aria-pressed={value === "stableford"}
        disabled={disabled || (!allowWaiting && players < 2)}
        onClick={() => onChange("stableford")}
      >
        <strong>Duelo por puntos</strong>
        <span>Stableford · 2–8 jugadores. Cada buen hoyo suma.</span>
      </button>
      <p>
        {!allowWaiting && players < 2
          ? "Añade otro jugador para abrir el Duelo por puntos."
          : value === "stableford"
            ? "Más puntos gana: bogey 1, par 2, birdie 3, eagle 4. Doble bogey o peor: 0. Cada golpe sigue contando; el siguiente hoyo permite remontar."
            : "Menos golpes gana. Se conservan los turnos, límites y penalizaciones."}
      </p>
    </fieldset>
  );
}
