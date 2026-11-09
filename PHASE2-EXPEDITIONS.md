# Fase 2 — Grandes travesías y superficies

Entrega de fase: **0.23.0**. Rama de trabajo: `feat/v023-expedition-worlds`.

## Qué se agrega

El circuito nuevo **Grandes travesías** contiene cuatro campos largos. Se añade después de las selecciones anteriores y no se inserta en las vueltas oficiales existentes.

| Campo | Recorrido previsto | Huella | Ambiente y decisión |
|---|---:|---:|---|
| La ruta de los arrayanes | 156 m | 80 × 160 m | Bosque, laguna, zigzag de plataformas y puente angosto de madera |
| Dunas de cobre | 196 m | 96 × 176 m | Terrazas de arena, oasis, subida a roca y diagonal estrecha |
| Archipiélago azul | 176 m | 100 × 176 m | Islas sobre agua, pasarelas de madera y muelle transversal |
| La cresta del cóndor | 243 m | 112 × 192 m | Cuatro alturas, terrazas rocosas y atajo de cornisa |

Las longitudes de catálogo se estiman sumando la línea central de cada plataforma, transición y salida hacia la copa (redondeadas al metro). Las huellas jugables se describen en `shared/frontierCourses.ts`. Las plataformas, transiciones inclinadas, obstáculos y zonas de agua son datos `Course` normales: no hay una ruta decorativa separada de la física. El mismo compilador de geometría alimenta la escena y el mundo Rapier.

Los nuevos campos tienen plataformas amplias de recuperación y atajos sensiblemente más angostos. Las mediciones `routeLength` son valores de recorrido previstos para el catálogo; no son distancias calculadas automáticamente por un planificador.

## Superficies y físicas

Se mantienen los materiales históricos y se agregan `stone`, `wood` y `wet`. La clasificación toma la altura de la zona además de la posición X/Z para no aplicar el material de una isla a una plataforma que pasa por arriba o por abajo.

| Superficie | Resistencia al rodamiento | Fricción de contacto (física 2) | Restitución al aterrizar (física 2) |
|---|---:|---:|---:|
| Grass | 0.016 | 0.020 | 0.32 |
| Rough | 0.040 | 0.020 (sin cambio) | 0.18 |
| Dirt | 0.055 | 0.020 (sin cambio) | 0.40 |
| Sand | 0.085 | 0.020 (sin cambio) | 0.08 |
| Stone | 0.012 | 0.025 | 0.22 |
| Wood | 0.024 | 0.050 | 0.18 |
| Wet | 0.010 | 0.012 | 0.06 |

Las superficies anteriores conservan el coeficiente de contacto histórico de 0.020; solo piedra, madera y humedad introducen nuevos coeficientes. Rapier combina el material de la pelota con el del collider del suelo. La edición física 1 conserva el comportamiento de contacto histórico. La edición 2 selecciona la fricción por material y conserva el frenado tangencial por resistencia al rodamiento.

Los materiales de piedra, madera y humedad se dibujan con texturas procedurales. El agua continúa siendo una zona de penalización real, no una superficie sólida. Las superficies de madera y piedra son piezas de suelo físicas y se pintan con el mismo centro, tamaño y altura usados por la simulación.

## Ambientes y rendimiento

`src/AdventureScenery.tsx` incorpora variantes instanciadas para bosque, desierto, costa y montaña. La cantidad de elementos depende del nivel de detalle. Se reutilizan geometrías y materiales y se mantienen las opciones de calidad automática, ahorro y alta existentes. No se incorporan modelos externos ni descargas de recursos durante la partida.

## Compatibilidad

- Las 13 selecciones anteriores y los circuitos originales permanecen en su orden.
- Las vueltas oficiales de 9 y 18 hoyos siguen teniendo 9 y 18 hoyos.
- Los 4 campos nuevos se agregan al final de `uniqueCourses` y `practiceLayouts`, para no desplazar índices de prácticas o récords antiguos.
- No cambian los formatos de guardado, reglas de puntuación ni documentos del taller.
- El protocolo online pasa de 17 a **18** porque el servidor debe reconocer el nuevo identificador `expeditions`. Cliente y servidor deben desplegarse juntos.

## Pruebas incluidas

- `tests/frontier.test.ts`: catálogo y dimensiones, compatibilidad de las vueltas anteriores, zonas y coeficientes de los siete materiales, geometría finita, soporte físico de salida, abertura de copa y un tiro real de tee por cada campo.
- `tests/e2e/expeditions.spec.ts`: selección del circuito, carga de escena del bosque, encuadre general dentro del viewport y un golpe real en escritorio y móvil.
- CI ejecuta `npm test`, `npm run build`, `npm run test:e2e` y `npm run test:pages`.

## Verificación pendiente y límites conocidos

Las pruebas automatizadas cubren la construcción Rapier de cada campo y un tiro físico por hoyo, además de la primera experiencia de navegador en escritorio y móvil. **No certifican automáticamente que toda estrategia de principio a fin sea óptima ni sustituyen una ronda humana completa en cada ruta segura y atajo.** Antes de considerar todos los hoyos equilibrados, conviene recorrerlos manualmente con tiros normales y probar especialmente las diagonales estrechas y los cambios de altura.

El CI de GitHub debe pasar en el Pull Request antes de integrar la fase en `main`. La publicación del juego y la compatibilidad del servidor online se comprueban después del despliegue conjunto.
