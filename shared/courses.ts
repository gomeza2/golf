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
export type Zone = {
  x: number;
  z: number;
  width: number;
  length: number;
  y: number;
};
export type Course = {
  name: string;
  subtitle: string;
  par: number;
  start: V3;
  cup: V3;
  blocks: Block[];
  ramp?: boolean;
  terrain?: Block[];
  greenBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  water?: Zone[];
  sand?: Zone[];
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

export type CircuitId =
  "sunset" | "moonlight" | "park" | "riviera" | "masters" | "tour";
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
// Terrain pieces describe the actual playable deck, not an invisible flat floor.
export const deck = (
  x: number,
  z: number,
  width: number,
  length: number,
  y = 0,
): Block => ({ pos: [x, y - 0.2, z], size: [width, 0.4, length] });
export function rampDeck(
  x: number,
  width: number,
  fromZ: number,
  toZ: number,
  fromY: number,
  toY: number,
): Block {
  const angle = Math.atan2(toY - fromY, fromZ - toZ);
  return {
    pos: [
      x,
      (fromY + toY) / 2 - 0.2 * Math.cos(angle),
      (fromZ + toZ) / 2 - 0.2 * Math.sin(angle),
    ],
    size: [width, 0.4, Math.hypot(fromZ - toZ, toY - fromY)],
    rotation: angle,
  };
}
export const rivieraCourses: Course[] = [
  {
    name: "Las dos orillas",
    par: 6,
    subtitle:
      "Puente a la izquierda; rampa de salto a la derecha. El agua suma un golpe.",
    dimensions: { width: 20, length: 48 },
    start: { x: -6, y: 0.24, z: 21 },
    cup: { x: 6, y: 0, z: -21 },
    greenBounds: { minX: -10, maxX: 10, minZ: -24, maxZ: -2 },
    terrain: [
      deck(0, 15, 20, 18),
      deck(-5, 2, 3, 8),
      rampDeck(4, 4, 12, 6, 0, 2.4),
    ],
    water: [{ x: 0, z: 2, width: 20, length: 8, y: -0.3 }],
    sand: [{ x: 6, z: -9, width: 5, length: 4, y: 0 }],
    blocks: [wall(-2, 16, 10, 0.5), { ...wall(0, -11, 9, 0.6), yaw: -0.35 }],
  },
  {
    name: "El acueducto",
    par: 6,
    subtitle:
      "Asciende 3,6 metros y domina el puente suspendido. No hay barandilla que te salve.",
    dimensions: { width: 20, length: 54 },
    start: { x: 0, y: 0.24, z: 24 },
    cup: { x: 4, y: 3.6, z: -24 },
    greenBounds: { minX: -10, maxX: 10, minZ: -27, maxZ: -16 },
    terrain: [
      deck(0, 19.5, 20, 15),
      rampDeck(0, 6, 12, 2, 0, 3.6),
      deck(0, -7, 4, 18, 3.6),
    ],
    water: [{ x: 0, z: -2, width: 20, length: 28, y: -0.3 }],
    blocks: [
      { pos: [0, 4.1, -7], size: [2, 1, 0.4], moving: true, motion: "slide" },
      { pos: [-10.2, 4.05, -21.5], size: [0.4, 0.9, 11] },
      { pos: [10.2, 4.05, -21.5], size: [0.4, 0.9, 11] },
      { pos: [0, 4.05, -27.2], size: [20, 0.9, 0.4] },
      { pos: [-2, 4, -21], size: [6, 0.8, 0.5], yaw: 0.4 },
    ],
  },
  {
    name: "Archipiélago",
    par: 7,
    subtitle:
      "Sesenta metros de islas. Traza la S, controla la arena y no te precipites.",
    dimensions: { width: 22, length: 60 },
    start: { x: -7, y: 0.24, z: 27 },
    cup: { x: 7, y: 0, z: -27 },
    greenBounds: { minX: -11, maxX: 11, minZ: -30, maxZ: -18 },
    terrain: [
      deck(0, 24, 22, 12),
      deck(-7, 9, 6, 18),
      deck(0, 0, 10, 4),
      deck(7, -9, 6, 18),
    ],
    water: [{ x: 0, z: 0, width: 22, length: 36, y: -0.3 }],
    sand: [
      { x: -7, z: 6, width: 5.8, length: 4, y: 0 },
      { x: 7, z: -12, width: 5.8, length: 4, y: 0 },
    ],
    blocks: [
      { pos: [7, 0.5, -6], size: [3, 1, 0.4], moving: true },
      { ...wall(-1, -23, 10, 0.55), yaw: -0.3 },
    ],
  },
  {
    name: "La presa final",
    par: 7,
    subtitle:
      "Cruza la cresta: bajada lateral segura o salto sobre el embalse. Elige tu final.",
    dimensions: { width: 22, length: 60 },
    start: { x: 0, y: 0.24, z: 27 },
    cup: { x: 6, y: 0, z: -27 },
    greenBounds: { minX: -11, maxX: 11, minZ: -30, maxZ: -8 },
    terrain: [
      deck(0, 24, 22, 12),
      rampDeck(0, 10, 18, 8, 0, 3.2),
      deck(0, 4, 10, 8, 3.2),
      rampDeck(-3.5, 3, 0, -8, 3.2, 0),
    ],
    water: [{ x: 0, z: 5, width: 22, length: 26, y: -0.3 }],
    sand: [{ x: -5, z: -15, width: 6, length: 5, y: 0 }],
    blocks: [
      { ...wall(2, -17, 12, 0.5), yaw: 0.35 },
      { pos: [3, 0.5, -23], size: [6, 1, 0.4], moving: true },
    ],
  },
];
export const mastersCourses: Course[] = [
  {
    name: "La costura",
    par: 5,
    subtitle:
      "Cose las diagonales con golpes cortos. El control gana a la fuerza.",
    dimensions: { width: 14, length: 48 },
    start: { x: -4, y: 0.24, z: 21 },
    cup: { x: 4, y: 0, z: -21 },
    blocks: [
      { ...wall(-2, 10, 8, 0.5), yaw: -0.3 },
      { ...wall(2, -2, 8, 0.5), yaw: 0.3 },
      { ...wall(-2, -12, 6, 0.5), yaw: -0.3 },
    ],
    sand: [{ x: 4, z: -15, width: 4, length: 3, y: 0 }],
  },
  {
    name: "El ocho",
    par: 6,
    subtitle:
      "Dos cambios de lado y un péndulo. No pierdas la siguiente salida de vista.",
    dimensions: { width: 18, length: 54 },
    start: { x: -5, y: 0.24, z: 24 },
    cup: { x: 5, y: 0, z: -24 },
    blocks: [
      wall(-3, 14, 10, 0.5),
      wall(3, 2, 10, 0.5),
      wall(-3, -10, 10, 0.5),
      { pos: [2, 0.5, -19], size: [5, 1, 0.4], moving: true },
    ],
  },
  {
    name: "La terraza",
    par: 6,
    subtitle:
      "Una larga subida y un green elevado. Cuida el aterrizaje: aquí el suelo absorbe la caída.",
    dimensions: { width: 20, length: 60 },
    start: { x: 0, y: 0.24, z: 27 },
    cup: { x: 6, y: 3, z: -27 },
    greenBounds: { minX: -10, maxX: 10, minZ: -30, maxZ: -5 },
    terrain: [
      deck(0, 24, 20, 12),
      rampDeck(0, 12, 18, 6, 0, 3),
      deck(0, 0.5, 12, 11, 3),
    ],
    blocks: [
      { pos: [-2, 3.4, -14], size: [11, 0.8, 0.5], yaw: -0.25 },
      { pos: [10.2, 3.45, -17.5], size: [0.4, 0.9, 25] },
      { pos: [-10.2, 3.45, -17.5], size: [0.4, 0.9, 25] },
      { pos: [0, 3.45, -30.2], size: [20, 0.9, 0.4] },
    ],
  },
  {
    name: "Dos canales",
    par: 7,
    subtitle:
      "Sesenta y seis metros: cruza por la izquierda, cambia de orilla y encuentra el segundo puente.",
    dimensions: { width: 20, length: 66 },
    start: { x: -5, y: 0.24, z: 30 },
    cup: { x: 5, y: 0, z: -30 },
    greenBounds: { minX: -10, maxX: 10, minZ: -33, maxZ: -14 },
    terrain: [
      deck(0, 23.5, 20, 19),
      deck(-5, 10, 3.5, 8),
      deck(0, 0, 20, 12),
      deck(5, -10, 3.5, 8),
    ],
    water: [
      { x: 0, z: 10, width: 20, length: 8, y: -0.3 },
      { x: 0, z: -10, width: 20, length: 8, y: -0.3 },
    ],
    sand: [{ x: 0, z: 0, width: 5, length: 5, y: 0 }],
    blocks: [{ ...wall(-2, -22, 8, 0.5), yaw: -0.3 }],
  },
  {
    name: "El último aliento",
    par: 7,
    subtitle:
      "Setenta y dos metros de temple. Coloca cada golpe para preparar el siguiente.",
    dimensions: { width: 22, length: 72 },
    start: { x: -6, y: 0.24, z: 33 },
    cup: { x: 6, y: 0, z: -33 },
    blocks: [
      { ...wall(-3, 20, 12, 0.6), yaw: -0.2 },
      { ...wall(3, 0, 12, 0.6), yaw: 0.2 },
      { pos: [0, 0.5, -23], size: [8, 1, 0.4], moving: true },
    ],
    sand: [{ x: -6, z: -11, width: 5, length: 5, y: 0 }],
  },
];
export const uniqueCourses = [
  ...courses,
  ...nightCourses,
  ...parkCourses,
  ...rivieraCourses,
  ...mastersCourses,
];
export const inZone = (zone: Zone, p: V3, margin = 0) =>
  Math.abs(p.x - zone.x) < zone.width / 2 + margin &&
  Math.abs(p.z - zone.z) < zone.length / 2 + margin;
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
  {
    id: "riviera" as const,
    name: "Riviera Salvaje",
    description:
      "4 desafíos de 48–60 m: agua, arena, puentes y saltos. PAR 26.",
    courses: rivieraCourses,
    ground: "#45896a",
    edge: "#d7c6a1",
    background: "#153d47",
    accent: "#f4b36b",
  },
  {
    id: "masters" as const,
    name: "Desafío Maestro",
    description: "5 hoyos de 48–72 m. Precisión, desniveles y dos canales.",
    courses: mastersCourses,
    ground: "#3c7d64",
    edge: "#d8c39a",
    background: "#233c3f",
    accent: "#e8a785",
  },
  {
    id: "tour" as const,
    name: "Vuelta completa",
    description:
      "Los 18 hoyos en una sola partida, desde el jardín hasta el último desafío.",
    courses: uniqueCourses,
    ground: "#3e8469",
    edge: "#e5cda6",
    background: "#173c3c",
    accent: "#f4cf7d",
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
  if (course.terrain) surfaces.splice(0, surfaces.length, ...course.terrain);
  else surfaces.pop(); // Cup platform is supplied by cupGreen(), including its opening.
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
  const bounds = course.greenBounds || {
    minX: -width / 2,
    maxX: width / 2,
    minZ: course.ramp ? -12 : -length / 2,
    maxZ: course.ramp ? -4 : length / 2,
  };
  const { minX, maxX, minZ, maxZ } = bounds;
  const { x, y, z } = course.cup;
  const angles = Array.from({ length: 64 }, (_, i) => (i * Math.PI * 2) / 64);
  for (const bx of [minX, maxX])
    for (const bz of [minZ, maxZ])
      angles.push((Math.atan2(bz - z, bx - x) + Math.PI * 2) % (Math.PI * 2));
  angles.sort((a, b) => a - b);
  for (let i = angles.length - 1; i > 0; i--)
    if (angles[i] - angles[i - 1] < 1e-8) angles.splice(i, 1);
  const vertices: number[] = [],
    indices: number[] = [];
  for (const angle of angles) {
    const dx = Math.cos(angle),
      dz = Math.sin(angle);
    const tx =
      Math.abs(dx) < 1e-9 ? Infinity : (dx > 0 ? maxX - x : minX - x) / dx;
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
