import type { Course, Block, V3 } from "./courses";
import { ringSlab } from "./riftCourses";
type Build = Pick<
  typeof import("./courses"),
  "deck" | "rampDeck" | "curvedBank"
>;
/** Three different footprints, shared by rendering and the authoritative simulation. */
export function createAdventureCourses({
  deck,
  rampDeck,
  curvedBank,
}: Build): Course[] {
  const bank = (
    x: number,
    y: number,
    z: number,
    w: number,
    l: number,
  ): Block => ({
    pos: [x, y + 0.45, z],
    size: [w, 0.9, l],
    bevel: 0.06,
    color: "#afb9ba",
  });
  const slope = (a: V3, b: V3, w: number): Block => {
    const length = Math.hypot(a.x - b.x, a.z - b.z),
      yaw = Math.atan2(a.x - b.x, a.z - b.z),
      p = rampDeck(0, w, length / 2, -length / 2, a.y, b.y);
    return {
      ...p,
      pos: [
        (a.x + b.x) / 2 + Math.sin(yaw) * p.pos[2],
        p.pos[1],
        (a.z + b.z) / 2 + Math.cos(yaw) * p.pos[2],
      ],
      yaw,
    };
  };
  const span = (
    a: [number, number],
    b: [number, number],
    w: number,
    y: number,
  ) => ({
    ...deck(
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      w,
      Math.hypot(a[0] - b[0], a[1] - b[1]) + 0.02,
      y,
    ),
    yaw: Math.atan2(a[0] - b[0], a[1] - b[1]),
  });
  const water = (width: number, length: number) => [
    { x: 0, z: 0, width, length, y: -1.4 },
  ];
  const spiral = ringSlab(0, 0, 9, 12, Math.PI / 2, Math.PI * 2, 96);
  for (let i = 0; i < spiral.vertices.length; i += 3) {
    const station = Math.floor(i / 3 / 4);
    spiral.vertices[i + 1] += (3.6 * station) / 96;
  }
  const spiralBanks = curvedBank(0, 0, 12.2, Math.PI / 2, Math.PI * 2, 64).map(
    (b, i) => ({
      ...b,
      pos: [b.pos[0], 0.45 + (3.6 * (i + 0.5)) / 64, b.pos[2]] as [
        number,
        number,
        number,
      ],
      color: "#a8bfbd",
    }),
  );
  return [
    {
      name: "La cornisa del glaciar",
      subtitle:
        "Ocho metros de bajada. Defiende por las terrazas o corta por una rampa estrecha sin barandas.",
      par: 6,
      routeLength: 52,
      dimensions: { width: 28, length: 46 },
      outerWalls: false,
      start: { x: -7, y: 8.24, z: 18 },
      cup: { x: 9, y: 0, z: -17 },
      greenBounds: { minX: 3.5, maxX: 10.5, minZ: -22, maxZ: -13 },
      ambience: "glacier",
      visual: {
        ground: "#5c947d",
        edge: "#bccbd0",
        background: "#658995",
        accent: "#f1c775",
      },
      terrain: [
        deck(-7, 15, 6, 12, 8),
        slope({ x: -7, y: 8, z: 9 }, { x: -7, y: 4, z: -1 }, 6),
        deck(-3, -2, 14, 6, 4),
        deck(6, -1, 4, 4, 4),
        slope({ x: 7, y: 4, z: -3 }, { x: 7, y: 0, z: -13 }, 6),
        slope({ x: -7, y: 8, z: 18 }, { x: 7, y: 4, z: -2 }, 1.2),
      ],
      water: water(28, 46),
      sand: [
        { x: 7, z: -15, width: 6, length: 1.8, y: 0 },
        { x: 7, z: -1.5, width: 3, length: 3, y: 4 },
      ],
      blocks: [
        bank(-10.2, 8, 15, 0.4, 12),
        bank(-7, 8, 21.2, 6, 0.4),
        bank(-3, 4, -5.2, 14, 0.4),
        bank(10.2, 4, -2, 0.4, 6),
        bank(10.7, 0, -17, 0.4, 9),
        bank(7, 0, -22.2, 7, 0.4),
      ],
      strategy: {
        safe: "Baja por el carril ancho, gira en la terraza y prepara el descenso final.",
        risk: "La diagonal evita la primera bajada y el giro. Golpea con decisión: la arena frena la llegada, pero no hay protección lateral.",
        skill: "Gravedad, distancia y recuperación",
      },
    },
    {
      name: "El faro de las nubes",
      subtitle:
        "Una espiral ascendente de 270° frente a una rampa oblicua. El hoyo está casi cuatro metros sobre el agua.",
      par: 6,
      routeLength: 62,
      dimensions: { width: 30, length: 34 },
      outerWalls: false,
      start: { x: 0, y: 0.24, z: 13 },
      cup: { x: -1.3, y: 3.6, z: 0 },
      greenBounds: { minX: -3, maxX: 3, minZ: -3, maxZ: 3 },
      ambience: "lighthouse",
      solidGreenSides: true,
      visual: {
        ground: "#648d84",
        edge: "#bfc8b8",
        background: "#182f43",
        accent: "#ffca7a",
      },
      floorMeshes: [spiral],
      terrain: [
        deck(0, 12, 5, 5),
        slope({ x: -0.1, y: 0, z: 12 }, { x: -1, y: 3.6, z: 3 }, 1.2),
        deck(6.75, 0, 7.5, 3.6, 3.6),
      ],
      water: water(30, 34),
      blocks: [...spiralBanks.slice(4), bank(0, 0, 14.7, 5, 0.4)],
      strategy: {
        safe: "Gana altura siguiendo el anillo y entra por la pasarela ancha de la derecha.",
        risk: "La rampa oblicua permite un as: exige ángulo, fuerza para subir y freno en el green.",
        skill: "Subida, frenado y altura",
      },
    },
    {
      name: "Bajo las válvulas",
      subtitle:
        "Compuertas y túneles abajo. Dos puentes finos y una bajada arriba. Elige ritmo o precisión.",
      par: 7,
      routeLength: 70,
      dimensions: { width: 30, length: 46 },
      outerWalls: false,
      start: { x: -10, y: 0.24, z: 17 },
      cup: { x: 10, y: 0, z: -17 },
      greenBounds: { minX: 7, maxX: 14, minZ: -22, maxZ: -12 },
      ambience: "aqueduct",
      visual: {
        ground: "#7a8d65",
        edge: "#c0a27a",
        background: "#4a6264",
        accent: "#e9b36c",
      },
      terrain: [
        deck(-10, 8, 5, 24),
        deck(-3, -2, 19, 5),
        deck(4, -7, 5, 14),
        deck(1, -12, 12, 5),
        deck(-3, -15, 5, 10),
        deck(0.25, -18, 13.5, 5),
        slope({ x: -10, y: 0, z: 17 }, { x: 0, y: 3, z: 17 }, 1.5),
        deck(2, 17, 4, 4, 3),
        span([1, 17], [-2, 0], 1.5, 3),
        deck(-2, 0, 3, 4, 3),
        span([-2, 0], [0, -17], 1.5, 3),
        deck(0, -17, 4, 4, 3),
        slope({ x: 0, y: 3, z: -17 }, { x: 7, y: 0, z: -17 }, 1.5),
      ],
      water: water(30, 46),
      rough: [{ x: -3, z: -15, width: 4.8, length: 2, y: 0 }],
      blocks: [
        bank(-12.7, 0, 8, 0.4, 24),
        bank(-10, 0, 20.2, 5, 0.4),
        bank(10, 0, -22.2, 8, 0.4),
        { pos: [-2, 1.3, -4.8], size: [0.7, 2.6, 0.7], color: "#bdbaa5" },
        { pos: [-2, 1.3, 1.2], size: [0.7, 2.6, 0.7], color: "#bdbaa5" },
        {
          pos: [-10, 0.45, 7],
          size: [4.8, 0.9, 0.4],
          moving: true,
          motion: "lift",
          phase: 0,
        },
        {
          pos: [0, 0.45, -2],
          size: [0.4, 0.9, 4.8],
          moving: true,
          motion: "lift",
          phase: 2.1,
        },
        {
          pos: [1, 0.45, -12],
          size: [0.4, 0.9, 4.8],
          moving: true,
          motion: "lift",
          phase: 4.2,
        },
      ],
      strategy: {
        safe: "Cruza por los carriles anchos y espera las compuertas. El puente también es un túnel.",
        risk: "Sube al viaducto, prepara el cambio de dirección y baja junto al green.",
        skill: "Tiempos, equilibrio y rutas superpuestas",
      },
    },
  ];
}
