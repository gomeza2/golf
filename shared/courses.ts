export type V3 = { x: number; y: number; z: number };
export type Block = {
  pos: [number, number, number];
  size: [number, number, number];
  rotation?: number;
  color?: string;
  moving?: boolean;
  yaw?: number;
  motion?: "slide";
  phase?: number;
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

export type CircuitId = "sunset" | "moonlight";
export const nightCourses: Course[] = [
  {
    name: "Las diagonales",
    subtitle: "Lee las bandas oblicuas y elige tu rebote.",
    par: 4,
    start: { x: -3, y: 0.24, z: 9 },
    cup: { x: 3, y: 0, z: -9 },
    blocks: [
      { ...wall(-1, 3, 6, 0.5), yaw: -Math.PI / 5 },
      { ...wall(1, -3, 6, 0.5), yaw: Math.PI / 5 },
    ],
  },
  {
    name: "Doble compuerta",
    subtitle: "Dos puertas, dos ritmos. El momento importa.",
    par: 3,
    start: { x: 0, y: 0.24, z: 9 },
    cup: { x: 0, y: 0, z: -9 },
    blocks: [
      { pos: [0, 0.5, 3], size: [4, 1, 0.4], moving: true, motion: "slide" },
      {
        pos: [0, 0.5, -4],
        size: [4, 1, 0.4],
        moving: true,
        motion: "slide",
        phase: Math.PI,
      },
    ],
  },
  {
    name: "Mirador lunar",
    subtitle: "Rodea la banda y sube por el lado del objetivo.",
    par: 4,
    start: { x: 3, y: 0.24, z: 9 },
    cup: { x: -3, y: 2.4, z: -9 },
    ramp: true,
    blocks: [
      { ...wall(0, 5, 5, 0.5), yaw: Math.PI / 6 },
      { pos: [0, 2.8, -7], size: [0.5, 0.8, 5] },
    ],
  },
];
export const circuits = [
  {
    id: "sunset" as const,
    name: "Club del atardecer",
    description: "Bandas clásicas, altura y un péndulo. Tu primera rivalidad.",
    courses,
    ground: "#36876c",
    edge: "#dbc89f",
    background: "#163d3a",
    accent: "#ffcc68",
  },
  {
    id: "moonlight" as const,
    name: "Jardín lunar",
    description:
      "Diagonales, compuertas deslizantes y una subida bajo la luna.",
    courses: nightCourses,
    ground: "#367d87",
    edge: "#aabcc7",
    background: "#162d43",
    accent: "#80dfe5",
  },
];
export const isCircuitId = (value: unknown): value is CircuitId =>
  circuits.some((c) => c.id === value);
export const getCircuit = (id: CircuitId) => circuits.find((c) => c.id === id)!;
export const getCourse = (state: { circuit: CircuitId; hole: number }) =>
  getCircuit(state.circuit).courses[state.hole];
// The renderer and Rapier consume exactly the same dimensions and rotations.
export function geometry(course: Course): {
  surfaces: Block[];
  walls: Block[];
} {
  const surfaces: Block[] = course.ramp
    ? [
        { pos: [0, -0.2, 7], size: [12, 0.4, 10] },
        { pos: [0, 1, -1], size: [12, 0.4, 6.46], rotation: Math.atan(0.4) },
        { pos: [0, 2.2, -8], size: [12, 0.4, 8] },
      ]
    : [{ pos: [0, -0.2, 0], size: [12, 0.4, 24] }];
  const walls: Block[] = course.ramp
    ? [-6.2, 6.2].flatMap((x) => [
        {
          pos: [x, 0.45, 7] as [number, number, number],
          size: [0.4, 0.9, 10] as [number, number, number],
        },
        {
          pos: [x, 1.65, -1] as [number, number, number],
          size: [0.4, 0.9, 6.46] as [number, number, number],
          rotation: Math.atan(0.4),
        },
        {
          pos: [x, 2.85, -8] as [number, number, number],
          size: [0.4, 0.9, 8] as [number, number, number],
        },
      ])
    : [-6.2, 6.2].map((x) => ({ pos: [x, 0.45, 0], size: [0.4, 0.9, 24] }));
  walls.push(
    { pos: [0, course.ramp ? 2.85 : 0.45, -12.2], size: [12, 0.9, 0.4] },
    { pos: [0, 0.45, 12.2], size: [12, 0.9, 0.4] },
  );
  return { surfaces, walls };
}
export function blockPose(block: Block, time: number) {
  const pos: [number, number, number] = [...block.pos];
  const phase = time * 0.8 + (block.phase || 0);
  if (block.moving && block.motion === "slide") pos[0] += Math.sin(phase) * 2.5;
  const yaw =
    (block.yaw || 0) +
    (block.moving && block.motion !== "slide" ? Math.sin(phase) * 1.25 : 0);
  return { pos, yaw };
}
