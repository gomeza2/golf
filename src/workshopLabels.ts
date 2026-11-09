import type { PieceKind } from "../shared/workshop";
export const names: Record<PieceKind, string> = {
  floor: "Plataforma",
  wall: "Pared",
  ramp: "Rampa",
  sand: "Arena",
  rough: "Césped alto",
  water: "Agua",
  gate: "Compuerta",
  rotor: "Barra giratoria",
  lift: "Puerta elevable",
  dirt: "Tierra",
};
export const paletteSections: {
  name: string;
  tools: ("select" | "start" | "cup" | PieceKind)[];
}[] = [
  { name: "Selección y objetivos", tools: ["select", "start", "cup"] },
  { name: "Suelo y alturas", tools: ["floor", "ramp"] },
  { name: "Paredes y mecanismos", tools: ["wall", "gate", "rotor", "lift"] },
  { name: "Superficies", tools: ["sand", "rough", "water", "dirt"] },
];
export const colors: Record<PieceKind, string> = {
  floor: "#5e9673",
  wall: "#ddcba6",
  ramp: "#b0c47f",
  sand: "#d9bf86",
  rough: "#657541",
  water: "#299bac",
  gate: "#ecb16e",
  rotor: "#e6a466",
  lift: "#9bc8bd",
  dirt: "#967352",
};
