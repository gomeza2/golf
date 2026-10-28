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
  dimensions?: { width: number; length: number };
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

export type CircuitId = "sunset" | "moonlight" | "park";
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
// Larger championship greens; dimensions are consumed by physics, camera and map.
export const parkCourses: Course[] = [
  {
    name: "La gran serpiente",
    subtitle: "Tres bandas, dos rutas. Prepara el siguiente rebote.",
    par: 5,
    dimensions: { width: 16, length: 36 },
    start: { x: -5, y: 0.24, z: 15 },
    cup: { x: 5, y: 0, z: -15 },
    blocks: [
      wall(-2, 8, 11, 0.55),
      wall(2, 0, 11, 0.55),
      wall(-2, -8, 11, 0.55),
    ],
  },
  {
    name: "El corredor del viento",
    subtitle: "Alterna los laterales o espera la apertura de las compuertas.",
    par: 5,
    dimensions: { width: 16, length: 36 },
    start: { x: 0, y: 0.24, z: 15 },
    cup: { x: 0, y: 0, z: -15 },
    blocks: [
      { pos: [0, 0.5, 7], size: [8, 1, 0.5], moving: true, motion: "slide" },
      { ...wall(-5.5, 0, 4, 0.55), yaw: -0.45 },
      { ...wall(5.5, 0, 4, 0.55), yaw: 0.45 },
      {
        pos: [0, 0.5, -7],
        size: [8, 1, 0.5],
        moving: true,
        motion: "slide",
        phase: Math.PI,
      },
    ],
  },
  {
    name: "La última carambola",
    subtitle: "Encadena diagonales. La banda exterior te devuelve al centro.",
    par: 5,
    dimensions: { width: 16, length: 36 },
    start: { x: -5, y: 0.24, z: 15 },
    cup: { x: 4, y: 0, z: -15 },
    blocks: [
      { ...wall(-2, 8, 8, 0.6), yaw: -Math.PI / 5 },
      { ...wall(2, -1, 8, 0.6), yaw: Math.PI / 5 },
      { pos: [0, 0.5, -9], size: [6, 1, 0.4], moving: true },
    ],
  },
];
export const courseSize = (course: Course) =>
  course.dimensions || { width: 12, length: 24 };
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
  {
    id: "park" as const,
    name: "Gran Parque",
    description:
      "Canchas de 36 metros: serpientes, compuertas y carambolas largas.",
    courses: parkCourses,
    ground: "#4b875c",
    edge: "#e5d2ad",
    background: "#263d37",
    accent: "#f4b578",
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
  const { width, length } = courseSize(course);
  const surfaces: Block[] = course.ramp
    ? [
        { pos: [0, -0.2, 7], size: [12, 0.4, 10] },
        { pos: [0, 1, -1], size: [12, 0.4, 6.46], rotation: Math.atan(0.4) },
        { pos: [0, 2.2, -8], size: [12, 0.4, 8] },
      ]
    : [{ pos: [0, -0.2, 0], size: [width, 0.4, length] }];
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
    : [-width / 2 - 0.2, width / 2 + 0.2].map((x) => ({
        pos: [x, 0.45, 0],
        size: [0.4, 0.9, length],
      }));
  walls.push(
    {
      pos: [0, course.ramp ? 2.85 : 0.45, -length / 2 - 0.2],
      size: [width, 0.9, 0.4],
    },
    { pos: [0, 0.45, length / 2 + 0.2], size: [width, 0.9, 0.4] },
  );
  surfaces.pop(); // Cup platform is supplied by cupGreen(), including its opening.
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

export const CUP_RADIUS = 0.5;
export const CUP_DEPTH = 0.85;
// Annular mesh: radial spokes connect the circular rim to a rectangular outer edge.
// Identical triangles are rendered and passed to Rapier, so no invisible floor covers the cup.
export function cupGreen(course: Course) {
  const { width, length } = courseSize(course);
  const minZ = course.ramp ? -12 : -length / 2;
  const maxZ = course.ramp ? -4 : length / 2;
  const { x, y, z } = course.cup;
  const angles = Array.from({ length: 64 }, (_, i) => (i * Math.PI * 2) / 64);
  for (const bx of [-width / 2, width / 2])
    for (const bz of [minZ, maxZ])
      angles.push((Math.atan2(bz - z, bx - x) + Math.PI * 2) % (Math.PI * 2));
  angles.sort((a, b) => a - b);
  const vertices: number[] = [],
    indices: number[] = [];
  for (const angle of angles) {
    const dx = Math.cos(angle),
      dz = Math.sin(angle);
    const tx =
      Math.abs(dx) < 1e-9
        ? Infinity
        : (dx > 0 ? width / 2 - x : -width / 2 - x) / dx;
    const tz =
      Math.abs(dz) < 1e-9 ? Infinity : (dz > 0 ? maxZ - z : minZ - z) / dz;
    const distance = Math.min(tx, tz);
    vertices.push(
      x + dx * CUP_RADIUS,
      y,
      z + dz * CUP_RADIUS,
      x + dx * distance,
      y,
      z + dz * distance,
    );
  }
  for (let i = 0; i < angles.length; i++) {
    const a = i * 2,
      b = ((i + 1) % angles.length) * 2;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { vertices, indices };
}
export function cupWalls(course: Course): Block[] {
  const { x, y, z } = course.cup;
  return Array.from({ length: 32 }, (_, i): Block => {
    const angle = (i * Math.PI * 2) / 32;
    return {
      pos: [
        x + Math.cos(angle) * 0.54,
        y - CUP_DEPTH / 2,
        z + Math.sin(angle) * 0.54,
      ],
      size: [0.1, CUP_DEPTH, 0.115],
      yaw: -angle,
    };
  }).concat([
    { pos: [x, y - CUP_DEPTH - 0.05, z], size: [1.2, 0.1, 1.2], yaw: 0 },
  ]);
}
