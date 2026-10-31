import { graphicsModes, isGraphicsMode, type GraphicsMode } from "./graphics";
export function GraphicsSettings({
  mode,
  onChange,
}: {
  mode: GraphicsMode;
  onChange: (mode: GraphicsMode) => void;
}) {
  return (
    <div className="graphics-settings">
      <label className="field">
        Calidad visual
        <select
          aria-label="Calidad visual"
          value={mode}
          onChange={(e) => {
            if (isGraphicsMode(e.target.value)) onChange(e.target.value);
          }}
        >
          {graphicsModes.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      <p>{graphicsModes.find((option) => option.id === mode)!.description}</p>
      <small>
        Se recuerda en este navegador. Puedes ajustarla durante la ronda. Las
        reglas y el control de tiro se conservan.
      </small>
    </div>
  );
}
