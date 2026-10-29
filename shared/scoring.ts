export type OutcomeKind =
  | "ace"
  | "albatross"
  | "eagle"
  | "birdie"
  | "par"
  | "bogey"
  | "double-bogey"
  | "over"
  | "limit";
export type HoleOutcome = {
  kind: OutcomeKind;
  label: string;
  relative: number;
};
export function holeOutcome(
  strokes: number,
  par: number,
  capped = false,
): HoleOutcome {
  const relative = strokes - par;
  if (capped) return { kind: "limit", label: "Límite de golpes", relative };
  if (strokes === 1) return { kind: "ace", label: "Hoyo en uno", relative };
  if (relative <= -3)
    return {
      kind: "albatross",
      label: relative === -3 ? "Albatros" : `${-relative} bajo par`,
      relative,
    };
  if (relative === -2) return { kind: "eagle", label: "Eagle", relative };
  if (relative === -1) return { kind: "birdie", label: "Birdie", relative };
  if (relative === 0) return { kind: "par", label: "Par", relative };
  if (relative === 1) return { kind: "bogey", label: "Bogey", relative };
  if (relative === 2)
    return { kind: "double-bogey", label: "Doble bogey", relative };
  return { kind: "over", label: `${relative} sobre par`, relative };
}
export const relativeLabel = (n: number) =>
  n === 0 ? "PAR" : n > 0 ? `+${n}` : String(n);
