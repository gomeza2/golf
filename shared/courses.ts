export type V3 = { x: number; y: number; z: number };
export type Block = {
  pos: [number, number, number];
  size: [number, number, number];
  rotation?: number;
  color?: string;
  moving?: boolean;
};
export type Course = {
  name: string;
  subtitle: string;
  par: number;
  start: V3;
  cup: V3;
  blocks: Block[];
  ramp?: boolean;
};
const wall = (x: number, z: number, w: number, d: number): Block => ({
  pos: [x, 0.4, z],
  size: [w, 0.8, d],
});
export const courses: Course[] = [
  {
    name: "Jardín de rebotes",
    subtitle: "Busca el ángulo. El camino directo no siempre gana.",
    par: 3,
    start: { x: -3, y: 0.24, z: 9 },
    cup: { x: 3, y: 0, z: -9 },
    blocks: [wall(-1, 2, 8, 0.5), wall(2, -4, 8, 0.5)],
  },
  {
    name: "La torre dorada",
    subtitle: "Sube la rampa. Controla la caída y conquista la cima.",
    par: 4,
    start: { x: 0, y: 0.24, z: 9 },
    cup: { x: 3, y: 2.4, z: -9 },
    ramp: true,
    blocks: [{ pos: [-2, 2.8, -7], size: [0.5, 0.8, 4] }, wall(-4, 5, 3, 0.5)],
  },
  {
    name: "El péndulo",
    subtitle: "Dos caminos, una ventana. Elige cuándo arriesgar.",
    par: 4,
    start: { x: 0, y: 0.24, z: 9 },
    cup: { x: 0, y: 0, z: -9 },
    blocks: [
      wall(0, 4, 3, 0.6),
      wall(-4, -5, 3, 0.6),
      wall(4, -5, 3, 0.6),
      {
        pos: [0, 0.55, -1],
        size: [7, 1.1, 0.35],
        moving: true,
        color: "#ffad64",
      },
    ],
  },
];
export const colors = [
  "#ffce68",
  "#70d9df",
  "#ee8eae",
  "#b6a0ff",
  "#d2e994",
  "#ff9778",
  "#89aaff",
  "#f6f0da",
];
