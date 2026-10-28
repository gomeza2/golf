# Evolución del club — golpe normal

Esta versión sigue el plan solicitado. Cada bloque depende de las comprobaciones del anterior; no se declara completado el refinamiento continuo ni un despliegue online inexistente.

| Fase             | Trabajo concreto                                                                                                                                                      | Verificación / estado                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1. Tiro          | Un solo golpe; lanzamiento vertical 0; velocidad máxima 14; guía de 1,2–2,4 m, sin soluciones ni predicción                                                           | Pruebas de velocidad y guía + compilación completadas                                             |
| 2. Física        | Corrección de aristas internas del green; césped absorbe impactos; bandas 0,52; resistencia tangencial sobre pendientes; límite de energía transferida por obstáculos | 10 comprobaciones iniciales de caída, banda, parada, suelo, puente, agua y arena pasaron          |
| 3. Controles     | Clásico, Retroceso y Precisión comparten la misma función de golpe normal                                                                                             | Casos de navegador de carga, liberación y cancelación                                             |
| 4. Configuración | Preferencia antes de iniciar; esquema fijado en la ronda; online usa Clásico; un jugador predeterminado                                                               | Casos de bloqueo, preferencias y online                                                           |
| 5. Recorrido     | Conservar 18 hoyos distintos; incorporar vuelta de 9                                                                                                                  | Partidas completas desde salida con la física nueva                                               |
| 6. Terrenos      | Césped, rough, tierra, arena, pendientes, agua y bandas curvas con colisión                                                                                           | Comparación de resistencia y rutas reales                                                         |
| 7. Experiencia   | Flecha corta, seguimiento y feedback de impactos; sin arco ni trayectoria resuelta                                                                                    | Capturas escritorio/móvil y casos de entrada                                                      |
| 8. Partidas      | Par, suma, honores del hoyo anterior, empates, límites identificables, reinicios y rondas de 9/18                                                                     | Reglas y partidos de principio a fin                                                              |
| 9. Menús         | Catálogo único, nombres persistentes, panel compacto, turno lateral y controles previos                                                                               | Navegación y comienzo real                                                                        |
| 10. Progresión   | Récords personales por recorrido/control y objetivos de rondas válidas                                                                                                | Datos corruptos, persistencia y rechazo de rondas incompletas                                     |
| 11. Pulido       | Un hoyo visible, geometría procedural, cámara y carga con recuperación                                                                                                | Compilación y sitio de producción                                                                 |
| 12. Equilibrio   | Probar potencias, terrenos, controles y todos los hoyos sin golpe elevado                                                                                             | Batería final de reglas, navegador y producción                                                   |
| 13. Continuidad  | Repetir pruebas y ajustar a partir de partidas reales                                                                                                                 | Continua: pendientes sesiones manuales prolongadas en teléfonos físicos y medidas de muchas salas |

Los datos personales se guardan solo para partidas locales de un jugador, en un espacio de reglas separado de versiones anteriores. Una ronda con retiro, hoyo al límite o puntuación inválida no genera récord ni objetivos. El servidor online permanece disponible en el código, pero necesita hosting persistente para ofrecer salas públicas por Internet.

## Comprobaciones de esta entrega

- Compilación TypeScript, cliente Vite y servidor Node completada; también con base `/golf/` y modo estático.
- 52 pruebas de reglas y física: rondas reales de 18 (99 golpes) y 9 (38 golpes), sin penalizaciones ni recolocación, además de terrenos, copa, controles y récords.
- 15 casos de navegador: escritorio, tacto, tres controles, bloqueo del esquema, sockets reales, permisos y reconexión. La prueba de una vuelta solo observa la posición real del minimapa para corregir aproximaciones: no exige resultados idénticos frente a obstáculos que siguen moviéndose entre tiros.
- 4 casos de producción: carga bajo `/golf/`, archivos y WebGL, golpe y cambio de turno reales, descarga interrumpida y script bloqueado con recuperación visible.
- Capturas revisadas en escritorio y móvil emulado. Faltan sesiones prolongadas en teléfonos físicos y mediciones de salas concurrentes.

No se añadieron hoyos duplicados para inflar el catálogo: se conservan los 18 distintos existentes y se añade una selección de 9. Los récords y objetivos personales sí se incorporan en esta entrega; no se presenta un sistema de torneos persistentes online como terminado.
