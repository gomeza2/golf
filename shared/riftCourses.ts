import type {
  Block,
  Course,
  FloorMesh,
  deck,
  rampDeck,
  curvedBank,
  V3,
} from "./courses";
// Closed sector slab: the renderer and Rapier use these exact triangles.
export function ringSlab(
  cx: number,
  cz: number,
  inner: number,
  outer: number,
  from: number,
  to: number,
  segments = 48,
): FloorMesh {
  const vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = from + ((to - from) * i) / segments;
    for (const [r, y] of [
      [outer, 0],
      [inner, 0],
      [outer, -0.4],
      [inner, -0.4],
    ])
      vertices.push(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 4,
      b = a + 4;
    indices.push(
      a,
      a + 1,
      b,
      a + 1,
      b + 1,
      b,
      a + 2,
      b + 2,
      a + 3,
      a + 3,
      b + 2,
      b + 3,
      a,
      b,
      a + 2,
      a + 2,
      b,
      b + 2,
      a + 1,
      a + 3,
      b + 1,
      a + 3,
      b + 3,
      b + 1,
    );
  }
  const end = segments * 4;
  indices.push(
    0,
    2,
    1,
    1,
    2,
    3,
    end,
    end + 1,
    end + 2,
    end + 1,
    end + 3,
    end + 2,
  );
  return { vertices, indices };
}
export function createRiftCourses(build: {
  deck: typeof deck;
  rampDeck: typeof rampDeck;
  curvedBank: typeof curvedBank;
}): Course[] {
  const { deck, rampDeck, curvedBank } = build;
  const bank = (x: number, z: number, w: number, d: number, y = 0): Block => ({
    pos: [x, y + 0.45, z],
    size: [w, 0.9, d],
    bevel: 0.04,
    color: "#c9b18a",
  });
  const span = (
    a: [number, number],
    b: [number, number],
    width: number,
  ): Block => ({
    ...deck(
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      width,
      Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.02,
    ),
    yaw: Math.atan2(a[0] - b[0], a[1] - b[1]),
    color: "#95aa75",
  });
  const slope = (from: V3, to: V3, width: number): Block => {
    const length = Math.hypot(from.x - to.x, from.z - to.z),
      yaw = Math.atan2(from.x - to.x, from.z - to.z),
      b = rampDeck(0, width, length / 2, -length / 2, from.y, to.y);
    return {
      ...b,
      pos: [
        (from.x + to.x) / 2 + Math.sin(yaw) * b.pos[2],
        b.pos[1],
        (from.z + to.z) / 2 + Math.cos(yaw) * b.pos[2],
      ],
      yaw,
      color: "#95aa75",
    };
  };
  const water = (width: number, length: number) => [
    { x: 0, z: 0, width, length, y: -1.4 },
  ];
  return [
    {
      name: "La horquilla del vértigo",
      routeLength: 82,
      par: 5,
      subtitle:
        "La U tiene barandas. El puente fino recorta dos curvas, pero un mal ángulo acaba en el agua.",
      dimensions: { width: 26, length: 44 },
      outerWalls: false,
      start: { x: -8, y: 0.24, z: 17 },
      cup: { x: 8, y: 0, z: 17 },
      greenBounds: { minX: 4.5, maxX: 11.5, minZ: 13, maxZ: 21 },
      terrain: [
        deck(-8, 1, 6, 40),
        deck(0, -16, 22, 6),
        deck(8, -1.5, 6, 29),
        { ...deck(0, 12, 16, 1.15), color: "#95aa75" },
      ],
      water: water(26, 44),
      blocks: [
        bank(-11.2, 1, 0.4, 40),
        bank(11.2, 1, 0.4, 40),
        bank(0, -19.2, 22, 0.4),
        bank(-8, 21.2, 6, 0.4),
        bank(8, 21.2, 6, 0.4),
        bank(-4.8, -1, 0.4, 22),
        bank(4.8, -1.5, 0.4, 25),
      ],
      strategy: {
        safe: "Recorre la U y usa las bandas para preparar cada curva.",
        risk: "Accede al puente desde el lateral y cruza su ancho de 1,15 m.",
        skill: "Ángulo y posición de salida",
      },
    },
    {
      name: "El hilo de la aguja",
      routeLength: 72,
      par: 6,
      subtitle:
        "Un zigzag ancho contra una diagonal sin bordes. La isla central es tu única pausa segura en el atajo.",
      dimensions: { width: 26, length: 40 },
      outerWalls: false,
      start: { x: -8, y: 0.24, z: 15 },
      cup: { x: 6, y: 0, z: -15 },
      greenBounds: { minX: 2.5, maxX: 9.5, minZ: -19, maxZ: -11 },
      terrain: [
        deck(-8, 10, 5, 16),
        deck(-0.5, 5, 20, 5),
        deck(7, 0, 5, 15),
        deck(0, -5, 19, 5),
        deck(-7, -10, 5, 15),
        deck(-3.5, -15, 12, 5),
        span([-8, 15], [4.133333, -11], 1.15),
        deck(-1, 0, 3.8, 3.8),
      ],
      water: water(26, 40),
      rough: [{ x: 7, z: 1, width: 4.8, length: 3, y: 0 }],
      sand: [{ x: -7, z: -10, width: 4.8, length: 2.5, y: 0 }],
      blocks: [
        bank(-10.7, 10, 0.4, 16),
        bank(9.7, 0, 0.4, 15),
        bank(-9.7, -10, 0.4, 15),
        bank(6, -19.2, 7, 0.4),
      ],
      strategy: {
        safe: "Zigzaguea por las pasarelas anchas y prepara cada cruce.",
        risk: "Encadena la diagonal con una parada en la isla pequeña.",
        skill: "Distancia y frenado",
      },
    },
    {
      name: "La órbita rota",
      routeLength: 66,
      par: 5,
      subtitle:
        "Una vuelta por el anillo o un as por el radio: la compuerta deja una ventana corta. El exceso de fuerza sale del green.",
      dimensions: { width: 32, length: 34 },
      outerWalls: false,
      start: { x: 0, y: 0.24, z: 11.5 },
      cup: { x: 0, y: 0, z: 0 },
      greenBounds: { minX: -3.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 },
      floorMeshes: [ringSlab(0, 0, 9, 14, -Math.PI, Math.PI / 2)],
      terrain: [deck(-7.5, 0, 8, 3.4), deck(0, 7.5, 1.15, 8)],
      water: water(32, 34),
      blocks: [
        ...curvedBank(0, 0, 14.2, -Math.PI, Math.PI / 2, 40),
        ...curvedBank(0, 0, 8.8, -Math.PI + 0.24, Math.PI / 2 - 0.24, 30),
        {
          pos: [0, 0.45, 6.4],
          size: [3.2, 0.9, 0.4],
          moving: true,
          motion: "slide",
          color: "#e9ae76",
        },
      ],
      strategy: {
        safe: "Sigue el anillo y entra al green por el radio ancho de la izquierda.",
        risk: "El radio de salida permite un as con fuerza y ventana precisas.",
        skill: "Ritmo y control de llegada",
      },
    },
    {
      name: "El balcón partido",
      routeLength: 47,
      par: 5,
      subtitle:
        "Tres metros de bajada: rampa ancha y curva abajo, o diagonal estrecha sin barandas. La gravedad también cuenta.",
      dimensions: { width: 26, length: 44 },
      outerWalls: false,
      start: { x: -7, y: 3.24, z: 17 },
      cup: { x: 8, y: 0, z: -16 },
      greenBounds: { minX: 4.5, maxX: 11.5, minZ: -20, maxZ: -10 },
      terrain: [
        deck(-7, 17, 8, 8, 3),
        rampDeck(-7, 5.5, 13, -3, 3, 0),
        deck(-7, -8.5, 5.5, 11),
        deck(-1.25, -14, 11.5, 4),
        slope({ x: -4, y: 3, z: 13 }, { x: 5, y: 0, z: -9 }, 1.6),
        deck(7, -8, 7, 4),
      ],
      water: water(26, 44),
      sand: [{ x: -7, z: -9, width: 5.3, length: 3, y: 0 }],
      blocks: [
        bank(-11.2, 17, 0.4, 8, 3),
        bank(-7, 21.2, 8, 0.4, 3),
        bank(-9.95, -8.5, 0.4, 11),
        bank(-1.25, -16.2, 11.5, 0.4),
        bank(11.7, -15, 0.4, 10),
        bank(8, -20.2, 7, 0.4),
      ],
      strategy: {
        safe: "Baja por la rampa ancha, frena en arena y gira al green.",
        risk: "Prepara el ángulo de la diagonal y domina su aceleración.",
        skill: "Pendiente y riesgo de salida",
      },
    },
  ];
}
