import type { Block, Course, deck, rampDeck } from "./courses";

// Content only: the existing renderer and authoritative Rapier world consume it.
export function createSkyCourses(build: {
  deck: typeof deck;
  rampDeck: typeof rampDeck;
}): Course[] {
  const { deck, rampDeck } = build;
  const stone = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ): Block => ({ pos: [x, y, z], size: [w, h, d], color: "#c1c4ae" });
  return [
    {
      name: "El claustro suspendido",
      subtitle:
        "Pasarela ancha a la izquierda, diagonal estrecha para recortar. La isla central permite corregir.",
      par: 4,
      dimensions: { width: 18, length: 36 },
      start: { x: -5, y: 0.24, z: 15 },
      cup: { x: 5, y: 0, z: -15 },
      greenBounds: { minX: -9, maxX: 9, minZ: -18, maxZ: -8 },
      terrain: [
        deck(0, 13, 18, 10),
        deck(-5, 0, 3.4, 16),
        {
          ...deck(0, 0, 1.7, Math.hypot(16 / 3, 16) + 0.4),
          yaw: -Math.atan2(10, 30),
        },
        deck(0, 0, 13, 4),
      ],
      water: [{ x: 0, z: 0, width: 18, length: 16, y: -0.3 }],
      sand: [{ x: -5, z: -11, width: 3.2, length: 2.5, y: 0 }],
      blocks: [stone(-0.5, 0.45, -12, 0.7, 0.9, 5)],
    },
    {
      name: "Las puertas del templo",
      subtitle:
        "Subida larga y ancha a la izquierda; rampa corta a la derecha. Cruza el pórtico y prepara la curva.",
      par: 4,
      dimensions: { width: 18, length: 44 },
      start: { x: 5, y: 0.24, z: 19 },
      cup: { x: -5, y: 2.4, z: -19 },
      greenBounds: { minX: -9, maxX: 9, minZ: -22, maxZ: -8 },
      terrain: [
        deck(0, 15, 18, 14),
        rampDeck(-5, 4.5, 8, -8, 0, 2.4),
        rampDeck(5, 3, 8, 0, 0, 2.4),
        deck(5, -4, 3, 8, 2.4),
      ],
      water: [{ x: 0, z: 0, width: 18, length: 16, y: -0.3 }],
      dirt: [{ x: 5, z: -5, width: 2.9, length: 3, y: 2.4 }],
      blocks: [
        stone(3.1, 3.4, -9.5, 0.8, 2, 1),
        stone(6.9, 3.4, -9.5, 0.8, 2, 1),
        stone(5, 4.5, -9.5, 4.6, 0.35, 1),
        stone(0, 2.85, -15, 0.65, 0.9, 6),
        stone(-9.2, 2.85, -15, 0.4, 0.9, 14),
        stone(9.2, 2.85, -15, 0.4, 0.9, 14),
        stone(0, 2.85, -22.2, 18, 0.9, 0.4),
      ],
    },
    {
      name: "El reloj de piedra",
      subtitle:
        "Dos mecanismos sincronizados. Espera el paso central o toma la ruta exterior por césped alto.",
      par: 5,
      dimensions: { width: 22, length: 44 },
      start: { x: -6, y: 0.24, z: 19 },
      cup: { x: 6, y: 0, z: -19 },
      rough: [{ x: -8, z: 0, width: 5, length: 14, y: 0 }],
      sand: [{ x: 7, z: -10, width: 4, length: 3, y: 0 }],
      blocks: [
        stone(-5.5, 0.55, 8, 6, 1.1, 0.65),
        {
          pos: [2, 0.55, 8],
          size: [5, 1.1, 0.5],
          moving: true,
          motion: "slide",
        },
        stone(0, 0.55, 0, 4, 1.1, 7),
        {
          pos: [-2, 0.55, -8],
          size: [5, 1.1, 0.5],
          moving: true,
          motion: "slide",
          phase: Math.PI,
        },
        stone(5.5, 0.55, -8, 6, 1.1, 0.65),
      ],
    },
  ];
}
