import type { Block, Course, V3 } from "./courses";
type Build = Pick<typeof import("./courses"), "deck" | "rampDeck">;

/** Large open footprints: every road, lip and landing is actual shared geometry. */
export function createWildCourses({ deck, rampDeck }: Build): Course[] {
  const span = (a: V3, b: V3, width: number): Block => {
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
    };
  };
  const road = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    width: number,
    y = 0,
  ) => span({ x: ax, y, z: az }, { x: bx, y, z: bz }, width);
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
    color: "#c4b99c",
  });
  const water = (width: number, length: number) => [
    { x: 0, z: 0, width, length, y: -1.4 },
  ];
  return [
    {
      name: "El salto de la presa",
      par: 6,
      routeLength: 94,
      subtitle:
        "Un rodeo ancho de 94 m o una rampa oblicua sobre el agua. El aterrizaje también cuenta.",
      dimensions: { width: 44, length: 80 },
      outerWalls: false,
      start: { x: -13, y: 0.24, z: 32 },
      cup: { x: 13, y: 0, z: -34 },
      greenBounds: { minX: 9, maxX: 17, minZ: -39, maxZ: -28 },
      ambience: "aqueduct",
      visual: {
        ground: "#438c78",
        edge: "#cbbd9b",
        background: "#426e7f",
        accent: "#ffd28a",
      },
      terrain: [
        deck(-13, 7, 8, 62),
        deck(0, -24, 34, 8),
        span({ x: -13, y: 0, z: 18 }, { x: -7, y: 2.5, z: 6 }, 2.4),
        deck(2, -9.5, 14, 21),
      ],
      water: water(44, 80),
      sand: [{ x: 3, z: -15, width: 6, length: 2.5, y: 0 }],
      rough: [{ x: -13, z: -11, width: 7.8, length: 3, y: 0 }],
      blocks: [
        bank(-17.2, 0, 7, 0.4, 62),
        bank(-13, 0, 38.2, 8, 0.4),
        bank(-4, 0, -28.2, 26, 0.4),
        bank(17.2, 0, -24, 0.4, 8),
        bank(9.2, 0, -12, 0.4, 12),
        bank(17.2, 0, -34, 0.4, 10),
      ],
      strategy: {
        safe: "Sigue el carril izquierdo y gira por el fondo. Hay espacio para dosificar, pero la distancia exige varios golpes.",
        risk: "Prepara la diagonal antes de la rampa. Vuela hasta la isla y frena en arena; quedarte corto cuesta un golpe y el regreso.",
        skill: "Potencia alta, vuelo y rebote de aterrizaje",
      },
    },
    {
      name: "La escalera del trueno",
      par: 8,
      routeLength: 160,
      subtitle:
        "Tres pisos y dos travesías de 32 m. Salta al piso de abajo o defiende por las rampas anchas.",
      dimensions: { width: 48, length: 80 },
      outerWalls: false,
      start: { x: -16, y: 8.24, z: 28 },
      cup: { x: 16, y: 0, z: -34 },
      greenBounds: { minX: 12, maxX: 20, minZ: -39, maxZ: -28 },
      ambience: "glacier",
      visual: {
        ground: "#527e77",
        edge: "#b7bab2",
        background: "#374e65",
        accent: "#ffcc7c",
      },
      terrain: [
        deck(-16, 18, 8, 28, 8),
        deck(0, 8, 40, 8, 8),
        span({ x: 16, y: 8, z: 4 }, { x: 16, y: 4, z: -4 }, 8),
        deck(0, -8, 40, 8, 4),
        span({ x: -16, y: 4, z: -12 }, { x: -16, y: 0, z: -20 }, 8),
        deck(0, -24, 40, 8),
      ],
      water: water(48, 80),
      sand: [{ x: -16, z: -8, width: 7.5, length: 3, y: 4 }],
      dirt: [{ x: 2, z: -24, width: 3, length: 7.5, y: 0 }],
      blocks: [
        bank(-16, 8, 32.2, 8, 0.4),
        bank(-20.2, 8, 18, 0.4, 28),
        bank(4, 8, 12.2, 32, 0.4),
        bank(20.2, 8, 8, 0.4, 8),
        bank(4, 4, -12.2, 32, 0.4),
        bank(-20.2, 4, -8, 0.4, 8),
        bank(20.2, 4, -8, 0.4, 8),
        bank(-4, 0, -28.2, 32, 0.4),
        bank(20.2, 0, -34, 0.4, 12),
      ],
      strategy: {
        safe: "Recorre las plataformas en S: derecha arriba, izquierda en el piso intermedio y derecha abajo. Guarda fuerza para las travesías largas.",
        risk: "Desde el extremo izquierdo superior puedes caer al piso intermedio. Un tiro excesivo rebota y se pasa; la arena ayuda a contener la llegada.",
        skill: "Distancias largas y aterrizajes desde cuatro metros",
      },
    },
    {
      name: "El delta bifurcado",
      par: 7,
      routeLength: 90,
      subtitle:
        "Tres rutas: esclusa y tierra, viaducto elevado o una espina de puentes sin protección.",
      dimensions: { width: 50, length: 88 },
      outerWalls: false,
      start: { x: 0, y: 0.24, z: 34 },
      cup: { x: 0, y: 0, z: -35 },
      greenBounds: { minX: -5, maxX: 5, minZ: -42, maxZ: -28 },
      ambience: "lighthouse",
      visual: {
        ground: "#588568",
        edge: "#b7a27d",
        background: "#234658",
        accent: "#ffd397",
      },
      terrain: [
        deck(0, 34, 8, 12),
        deck(0, -26, 10, 4),
        road(0, 28, -16, 18, 7),
        road(-16, 18, -16, -18, 7),
        road(-16, -18, 0, -26, 7),
        span({ x: 0, y: 0, z: 28 }, { x: 16, y: 3, z: 18 }, 4.5),
        road(16, 18, 16, -16, 4.5, 3),
        span({ x: 16, y: 3, z: -16 }, { x: 0, y: 0, z: -26 }, 4.5),
        road(0, 28, -2, 12, 1.8),
        deck(-2, 12, 4, 4),
        road(-2, 12, 2, -2, 1.8),
        deck(2, -2, 4, 4),
        road(2, -2, -2, -16, 1.8),
        deck(-2, -16, 4, 4),
        road(-2, -16, 0, -26, 1.8),
      ],
      water: water(50, 88),
      dirt: [{ x: -16, z: -5, width: 6.9, length: 5, y: 0 }],
      rough: [{ x: 16, z: -10, width: 4.4, length: 3, y: 3 }],
      blocks: [
        bank(0, 0, 40.2, 8, 0.4),
        bank(-19.7, 0, 0, 0.4, 36),
        {
          pos: [-16, 0.45, 8],
          size: [6.8, 0.9, 0.45],
          moving: true,
          motion: "lift",
          phase: 0.8,
          color: "#ddb784",
        },
        {
          pos: [0, 0.55, 5],
          size: [4, 1.1, 0.35],
          moving: true,
          phase: 1.5,
          color: "#d8b974",
        },
      ],
      strategy: {
        safe: "El carril izquierdo es ancho: espera la esclusa y prepara otro golpe después del tramo de tierra. El viaducto derecho evita ambos, pero hay que subir y frenar arriba.",
        risk: "La espina central acorta la distancia. Colócate en cada isla y cruza el mecanismo a tiempo: los puentes no tienen barandas.",
        skill: "Tres rutas, terreno y mecanismos visibles",
      },
    },
  ];
}
