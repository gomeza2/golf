import { useState } from "react";
export function ConnectionSettings({
  value,
  onChange,
  defaultUrl,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  defaultUrl: string;
  required: boolean;
}) {
  const [expanded, setExpanded] = useState(required);
  return (
    <details
      className="connection-settings"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        {required ? "Conectar el servidor del club" : "Conexión avanzada"}
      </summary>
      <label className="field">
        Servidor online
        <input
          aria-label="Servidor online"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://tu-servidor.onrender.com"
          type="url"
        />
        <small>
          Desde el enlace del servidor podés dejarlo vacío. Para conectar otra
          dirección, pegá su URL completa.
        </small>
      </label>
      {defaultUrl && value !== defaultUrl && (
        <button className="text-button" onClick={() => onChange(defaultUrl)}>
          Usar servidor del club
        </button>
      )}
    </details>
  );
}
