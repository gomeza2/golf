import type { Block, Course, V3 } from "./courses";

type Build = Pick<typeof import("./courses"), "deck" | "rampDeck">;

function span(
  rampDeck: Build["rampDeck"],
  a: V3,
  b: V3,
  width: number,
): Block {
  const length = Math.hypot(a.x - b.x, a.z - b.z);
  const yaw = Math.atan2(a.x - b.x, a.z - b.z);
  const ramp = rampDeck(0, width, length / 2, -length / 2, a.y, b.y);
  return {
    ...ramp,
    yaw,
    pos: [
      (a.x + b.x) / 2 + Math.sin(yaw) * ramp.pos[2],
      ramp.pos[1],
      (a.z + b.z) / 2 + Math.cos(yaw) * ramp.pos[2],
    ],
    bevel: 0.025,
  };
}

function spans(
  rampDeck: Build["rampDeck"],
  points: V3[],
  width: number,
): Block[] {
  return points.slice(1).map((point, index) =>
    span(rampDeck, points[index], point, width),
  );
}

function rock(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color = "#8b8878",
): Block {
  return {
    pos: [x, y + height / 2, z],
    size: [width, height, depth],
    color,
    bevel: 0.08,
  };
}

const ocean = (width: number, length: number, y = -1.4) => [
  { x: 0, z: 0, width, length, y },
];

/**
 * Four long-form courses. All playable decks and transitions are ordinary
 * Course geometry, so the renderer, editor preview and authoritative Rapier
 * simulation consume the same surfaces and coordinates.
 */
export function createFrontierCourses({ deck, rampDeck }: Build): Course[] {
  return [
    {
      name: "La ruta de los arrayanes",
      subtitle:
        "Un recorrido de bosque en zigzag, con un puente de madera y un atajo elevado sobre la laguna.",
      par: 8,
      routeLength: 156,
      dimensions: { width: 80, length: 160 },
      outerWalls: false,
      start: { x: -27, y: 0.24, z: 67 },
      cup: { x: 26, y: 0, z: -68 },
      greenBounds: { minX: 17, maxX: 35, minZ: -78, maxZ: -59 },
      ambience: "forest",
      visual: {
        ground: "#547d55",
        edge: "#8b7657",
        background: "#183d36",
        accent: "#e8c47d",
      },
      terrain: [
        deck(-27, 61, 18, 20),
        span(rampDeck, { x: -27, y: 0, z: 51 }, { x: -8, y: 2, z: 31 }, 7.5),
        deck(-8, 25, 18, 14, 2),
        span(rampDeck, { x: -8, y: 2, z: 18 }, { x: 18, y: 0, z: -18 }, 7),
        deck(18, -11, 18, 14),
        span(rampDeck, { x: 18, y: 0, z: -18 }, { x: 24, y: 3, z: -40 }, 6.5),
        deck(24, -47, 18, 14, 3),
        span(rampDeck, { x: 24, y: 3, z: -54 }, { x: 26, y: 0, z: -61 }, 7),
        // A deliberately narrow wooden shortcut joins the first and third islands.
        span(rampDeck, { x: -18, y: 0, z: 51 }, { x: 15, y: 0, z: -7 }, 1.8),
      ],
      water: [
        { x: 4, z: -1, width: 25, length: 17, y: -1.5 },
        { x: -27, z: -21, width: 15, length: 12, y: -1.5 },
      ],
      rough: [{ x: -27, z: 61, width: 7, length: 10, y: 0 }],
      wood: [{ x: -8, z: 25, width: 13, length: 5, y: 2 }],
      wet: [{ x: 18, z: -11, width: 5, length: 7, y: 0 }],
      stone: [{ x: 24, z: -47, width: 5, length: 9, y: 3 }],
      blocks: [
        rock(-15, 0, 59, 2.1, 1.4, 2.4, "#756b52"),
        rock(-1.5, 2, 25, 1.8, 1.3, 2.2, "#766e57"),
        {
          pos: [20, 0.55, -12],
          size: [5.5, 1.1, 0.45],
          moving: true,
          motion: "slide",
          phase: 0.7,
          color: "#c59b66",
        },
        rock(31, 3, -46, 2, 1.8, 2.2, "#817c68"),
      ],
      strategy: {
        safe: "Sigue las plataformas anchas en zigzag y usa la laguna como referencia para preparar cada cambio de dirección.",
        risk: "El puente angosto de madera recorta gran parte del rodeo, pero exige frenar y mantenerse centrado.",
        skill: "Lectura de alturas, control del golpe y elección de ruta",
      },
    },
    {
      name: "Dunas de cobre",
      subtitle:
        "Sube por las terrazas de arena, cruza el oasis y elige entre el camino ancho o la cornisa estrecha del borde norte.",
      par: 9,
      routeLength: 196,
      dimensions: { width: 96, length: 176 },
      outerWalls: false,
      start: { x: -34, y: 0.24, z: 70 },
      cup: { x: 32, y: 0, z: -76 },
      greenBounds: { minX: 21, maxX: 43, minZ: -87, maxZ: -66 },
      ambience: "desert",
      visual: {
        ground: "#b18a55",
        edge: "#806044",
        background: "#604331",
        accent: "#f1c17b",
      },
      terrain: [
        deck(-34, 65, 20, 18),
        span(rampDeck, { x: -34, y: 0, z: 56 }, { x: -10, y: 4, z: 36 }, 8),
        deck(-10, 29, 26, 14, 4),
        // A broad entry keeps the full terrace connected to the safe descent.
        span(rampDeck, { x: -2, y: 4, z: 22 }, { x: 18, y: 7, z: 4 }, 9),
        deck(18, -1, 20, 16, 7),
        span(rampDeck, { x: 18, y: 7, z: -9 }, { x: 1, y: 3, z: -31 }, 7),
        deck(1, -38, 22, 14, 3),
        span(rampDeck, { x: 1, y: 3, z: -45 }, { x: 30, y: 0, z: -60 }, 8),
        deck(30, -65, 22, 12),
        // Small, supported landing pads break the narrow shortcut into
        // manageable shots while keeping the main route below it where needed.
        deck(-40, 42, 2.8, 2.8, 0),
        deck(-18, 42, 2.8, 2.8, 0),
        deck(5, 42, 2.8, 2.8, 0),
        // Mid-ramp rest gives the first high climb a precise, supported stop.
        deck(8, 30, 3.2, 3.2, 1.5),
        // Landing pads overlap the ramp ends by more than the ball radius.
        deck(10, 18, 4, 4.8, 3),
        // Turn platforms begin at the end of the preceding ramp instead of
        // sitting above the approach. The next ramp climbs away from them.
        { ...deck(18, 18, 4, 4.8, 4), yaw: Math.PI / 2 },
        deck(22, 10, 3.4, 4, 6),
        // The raised diagonal climbs over the terraces and joins the final
        // platform at its eastern edge.
        ...spans(
          rampDeck,
          [
            { x: -40, y: 0, z: 56 },
            { x: -40, y: 0, z: 42 },
            { x: -18, y: 0, z: 42 },
            { x: 5, y: 0, z: 42 },
            { x: 8, y: 1.5, z: 30 },
            { x: 10, y: 3, z: 18 },
            { x: 16, y: 4, z: 18 },
            { x: 22, y: 6, z: 12 },
            { x: 25, y: 7, z: 5 },
          ],
          1.7,
        ),
      ],
      water: [{ x: 1, z: -37, width: 38, length: 18, y: -1.5 }],
      sand: [
        { x: -34, z: 65, width: 15, length: 13, y: 0 },
        { x: -10, z: 29, width: 17, length: 8, y: 4 },
      ],
      stone: [{ x: 18, z: -1, width: 11, length: 10, y: 7 }],
      dirt: [{ x: 1, z: -38, width: 12, length: 7, y: 3 }],
      wet: [{ x: 36, z: -65, width: 5, length: 4, y: 0 }],
      wood: [{ x: 25, z: -65, width: 7, length: 4, y: 0 }],
      blocks: [
        rock(-22, 0, 68, 3.4, 2.8, 4, "#96724d"),
        rock(5, 4, 30, 3.8, 2.5, 3, "#a17a4e"),
        rock(25, 7, -2, 2.4, 2.2, 3, "#79634d"),
        {
          pos: [10, 7.5, -7],
          size: [5, 1.1, 0.5],
          moving: true,
          motion: "spin",
          phase: 1.1,
          color: "#d5a35e",
        },
      ],
      strategy: {
        safe: "Avanza por las terrazas escalonadas. La arena frena los tiros largos, pero cada subida necesita preparación.",
        risk: "La cornisa exterior evita varios giros, con puentes angostos y descansos pequeños antes de la subida final.",
        skill: "Potencia, desnivel y aterrizajes sobre arena y roca",
      },
    },
    {
      name: "Archipiélago azul",
      subtitle:
        "Cuatro islas conectadas por pasarelas de madera, con agua real debajo y un atajo estrecho entre las rocas.",
      par: 8,
      routeLength: 176,
      dimensions: { width: 100, length: 176 },
      outerWalls: false,
      start: { x: -36, y: 0.24, z: 70 },
      cup: { x: 34, y: 0, z: -76 },
      greenBounds: { minX: 22, maxX: 46, minZ: -88, maxZ: -65 },
      ambience: "coast",
      visual: {
        ground: "#4f9a82",
        edge: "#c8b18b",
        background: "#123f55",
        accent: "#f3d18e",
      },
      terrain: [
        deck(-36, 65, 20, 18),
        span(rampDeck, { x: -36, y: 0, z: 56 }, { x: -9, y: 0, z: 34 }, 6.5),
        deck(-9, 28, 18, 16),
        span(rampDeck, { x: -9, y: 0, z: 20 }, { x: 18, y: 1, z: -2 }, 5.5),
        deck(18, -9, 20, 16, 1),
        span(rampDeck, { x: 18, y: 1, z: -17 }, { x: 32, y: 0, z: -42 }, 7),
        deck(32, -49, 22, 14),
        span(rampDeck, { x: 32, y: 0, z: -56 }, { x: 34, y: 0, z: -65 }, 8),
        // Narrow landings split the exposed pier into shots that can be
        // controlled on the real water crossing.
        deck(-8, 18, 3.2, 3.2),
        deck(-4, 4, 3.2, 3.2),
        deck(1, -10, 3.2, 3.2),
        deck(9, -22, 3.2, 3.2),
        // The pier stays west of the final safe-route ramp and joins the
        // island at its open western edge.
        ...spans(
          rampDeck,
          [
            { x: -27, y: 0, z: 56 },
            { x: -12, y: 0, z: 32 },
            { x: -8, y: 0, z: 18 },
            { x: -4, y: 0, z: 4 },
            { x: 1, y: 0, z: -10 },
            { x: 9, y: 0, z: -22 },
            { x: 15, y: 0, z: -30 },
            { x: 24, y: 0, z: -42 },
          ],
          1.6,
        ),
      ],
      water: ocean(100, 176, -1.6),
      sand: [
        { x: -36, z: 65, width: 12, length: 16, y: 0 },
        { x: 32, z: -49, width: 13, length: 7, y: 0 },
      ],
      wood: [
        { x: -9, z: 28, width: 14, length: 5, y: 0 },
        { x: 12, z: -9, width: 6, length: 5, y: 1 },
      ],
      stone: [{ x: 32, z: -49, width: 6, length: 10, y: 0 }],
      wet: [{ x: 23, z: -9, width: 5, length: 9, y: 1 }],
      blocks: [
        rock(-17, 0, 34, 3, 2.4, 3.5, "#71877f"),
        rock(7, 0, 7, 2.5, 1.8, 2.5, "#7b9188"),
        rock(42, 0, -48, 3.2, 2.6, 4, "#70847d"),
        {
          pos: [18, 1.55, -10],
          size: [5.5, 1.1, 0.45],
          moving: true,
          motion: "slide",
          phase: 2,
          color: "#e2b878",
        },
      ],
      strategy: {
        safe: "Sigue las pasarelas anchas de isla en isla; cada aterrizaje tiene una zona amplia para corregir.",
        risk: "El muelle transversal acorta el recorrido, pero es mucho más angosto y no ofrece espacio para un golpe desviado.",
        skill: "Precisión sobre el agua y control del rodamiento en madera mojada",
      },
    },
    {
      name: "La cresta del cóndor",
      subtitle:
        "Una travesía de montaña en cuatro niveles, con puentes de piedra, una cornisa de madera y una diagonal de altura.",
      par: 9,
      routeLength: 243,
      dimensions: { width: 112, length: 192 },
      outerWalls: false,
      start: { x: -42, y: 12.24, z: 82 },
      cup: { x: 40, y: 0, z: -86 },
      greenBounds: { minX: 27, maxX: 53, minZ: -97, maxZ: -75 },
      ambience: "mountain",
      visual: {
        ground: "#71836e",
        edge: "#b7ad98",
        background: "#304b55",
        accent: "#f0c88c",
      },
      terrain: [
        deck(-42, 78, 22, 16, 12),
        span(rampDeck, { x: -42, y: 12, z: 70 }, { x: -10, y: 8, z: 49 }, 8),
        deck(-10, 42, 22, 14, 8),
        span(rampDeck, { x: -10, y: 8, z: 35 }, { x: 30, y: 5, z: 13 }, 7),
        deck(30, 6, 22, 18, 5),
        span(rampDeck, { x: 30, y: 5, z: -3 }, { x: 0, y: 2, z: -28 }, 8),
        deck(0, -35, 22, 14, 2),
        span(rampDeck, { x: 0, y: 2, z: -42 }, { x: 38, y: 0, z: -68 }, 8),
        deck(38, -75, 24, 14),
        // The exposed ridge shortcut skips two bends but is intentionally narrow.
        span(rampDeck, { x: -34, y: 12, z: 70 }, { x: 27, y: 5, z: 8 }, 1.6),
      ],
      water: [{ x: -1, z: -18, width: 35, length: 20, y: -3.5 }],
      stone: [
        { x: -42, z: 78, width: 15, length: 10, y: 12 },
        { x: 30, z: 6, width: 16, length: 12, y: 5 },
        { x: 0, z: -35, width: 12, length: 7, y: 2 },
      ],
      wood: [{ x: -10, z: 42, width: 12, length: 5, y: 8 }],
      wet: [{ x: 0, z: -35, width: 5, length: 5, y: 2 }],
      dirt: [{ x: 38, z: -75, width: 8, length: 5, y: 0 }],
      blocks: [
        rock(-50, 12, 79, 3, 4.5, 5, "#72796f"),
        rock(-1, 8, 42, 3.4, 3, 3, "#8a8e82"),
        rock(41, 5, 6, 3, 3.8, 4, "#737c72"),
        rock(-11, 2, -35, 2.7, 2.2, 3, "#8b8e82"),
        {
          pos: [30, 5.55, 4],
          size: [6, 1.1, 0.45],
          moving: true,
          motion: "lift",
          phase: 1.3,
          color: "#d2b386",
        },
      ],
      strategy: {
        safe: "Baja en zigzag por las cuatro terrazas. Los cambios de altura son largos, pero las plataformas ofrecen espacio para recuperar.",
        risk: "La cresta diagonal evita dos curvas y varios golpes; la pasarela es estrecha y termina en una zona expuesta.",
        skill: "Lectura de desniveles, control de aterrizaje y precisión",
      },
    },
  ];
}
