import { useEffect, useState } from "react";
export function Numeric({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(Number(value.toFixed(3)))), [value]);
  return (
    <label>
      {label}
      <input
        type="number"
        aria-label={label}
        value={text}
        min={min}
        max={max}
        step="0.5"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = Number(text);
          if (text !== "" && Number.isFinite(n))
            onChange(Math.max(min, Math.min(max, n)));
          else setText(String(value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
