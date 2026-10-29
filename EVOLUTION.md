# Evolución del club — golpe normal

Esta versión sigue el plan solicitado. Cada bloque depende de las comprobaciones del anterior; no se declara completado el refinamiento continuo ni un despliegue online inexistente.

| Fase             | Trabajo concreto                                                                                                                                                      | Verificación / estado                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1. Tiro          | Un solo golpe; lanzamiento vertical 0; velocidad máxima 15,8; guía de 1,2–2,4 m, sin soluciones ni predicción                                                         | Pruebas de velocidad y guía + compilación completadas                                             |
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
- 73 pruebas de reglas y física: rondas reales de 18 (90 golpes) y 9 (33 golpes), sin penalizaciones ni recolocación, además de terrenos, copa, controles y récords.
- 22 casos de navegador: escritorio, tacto, tres controles, bloqueo del esquema, sockets reales, permisos y reconexión. La prueba de una vuelta solo observa la posición real del minimapa para corregir aproximaciones: no exige resultados idénticos frente a obstáculos que siguen moviéndose entre tiros.
- 4 casos de producción: carga bajo `/golf/`, archivos y WebGL, golpe y cambio de turno reales, descarga interrumpida y script bloqueado con recuperación visible.
- Capturas revisadas en escritorio y móvil emulado. Faltan sesiones prolongadas en teléfonos físicos y mediciones de salas concurrentes.

No se añadieron hoyos duplicados para inflar el catálogo: se conservan los 18 distintos existentes y se añade una selección de 9. Los récords y objetivos personales sí se incorporan en esta entrega; no se presenta un sistema de torneos persistentes online como terminado.

## Entrega de pistas, copa y exploración

- Fases 1–2: suplemento de potencia superior al 80 %, continuidad exacta de la rampa, esquinas con gráficos/colisión redondeados, eliminación de rendijas laterales accidentales. Se conserva el golpe normal y la corrección de aristas internas.
- Fases 5–7: jardín oblicuo con arena, torre con banda curva y rampas continuas, péndulo sin bolsillos estrechos. Copa gris con bandera centrada y mástil físico; guía más legible, césped más suave y laterales de soporte del green.
- Fases 7 y 11: modo Mirar con giro/inclinación/zoom limitados, arrastre táctil o ratón y botones. Se bloquea el tiro durante la exploración y se conserva el apuntado al volver.
- Fases 8 y 12: rutas completas recalibradas; 59 pruebas de reglas/física/cámara, 17 de navegador y 4 de producción. Se incluyen cuadrículas de soporte de suelo en los seis primeros hoyos, ausencia de rendijas de menos de 0,9 m en bandas transversales alineadas y comprobación del mástil centrado.
- Fase 13: referencias y decisiones en [RESEARCH.md](RESEARCH.md). Continúan pendientes las sesiones humanas prolongadas y la publicación de un servidor online persistente.

## Entrega de entrenamiento y pausa

- Fases 8 y 10: entrenamiento individual de cualquier hoyo del recorrido elegido, con salida real, golpe normal, límite de golpes y embocado físico. Repetición y paso al siguiente hoyo sin cambiar el control.
- Fase 10: medallas Oro/Plata/Bronce por resultado respecto al par, mejor marca e intentos válidos por hoyo/control. Las apariciones del mismo hoyo comparten marca. Datos independientes de las rondas completas; los intentos administrativos por límite y los retiros no generan récord ni medalla.
- Fases 7–9 y 11: pausa local que congela reloj y simulación, incluso durante un golpe. Mirar, ajustes y segundo plano también suspenden la simulación local. Escape y Tab permiten manejar la pausa con teclado. El online conserva el reloj del servidor y rechaza los comandos de pausa/práctica.
- Fases 8 y 9: resultados relativos al par de los hoyos completados, columna correcta del hoyo entrenado y selector integrado en el catálogo, sin duplicar los recorridos.
- Fase 12: 68 pruebas de reglas/física/guardado y 20 de navegador; se comprueban los 18 puntos de salida, una práctica embocada realmente, persistencia, rechazo de marcas inválidas, elección del hoyo 18 en móvil y congelación del reloj y la pelota. La prueba de segundo plano simula el evento de visibilidad del navegador. Se mantienen las cuatro comprobaciones de producción.
- Pendientes: guardado y recuperación de una ronda local en curso tras recargar, más sesiones humanas prolongadas, torneos persistentes y hosting público del servidor online. La pausa actual conserva una sesión abierta y no se presenta como recuperación después de cerrar la página.

## Versión 0.2.0 — Hoyo en Uno · Golf Club

- Fases 1–3 y 12: escala de potencia calibrada con rodamiento real del motor. Distancias de referencia aproximadamente proporcionales entre 20–100 %, tramo fino suave por debajo del 20 %, máximo 15,8 y elevación inicial cero. Las rutas de prueba se trasladan a los nuevos porcentajes manteniendo sus velocidades físicas y vuelven a completar los 18/9 hoyos sin penalizaciones. La guía conserva el límite de 2,4 m y gana punta plana y contraste.
- Fases 7–8: turnos de 30 segundos, aviso visual al quedar ocho y feedback de resultados de golf: birdie, eagle, albatros, par, bogey y hoyo en uno prioritario. El evento se emite en el motor al caer físicamente la pelota; los golpes contabilizados no cambian por la celebración.
- Fases 9 y 11: nueva identidad Hoyo en Uno · Golf Club en carga, cabecera, errores y título; versión visible tomada de package.json y registro en CHANGELOG. El sonido respeta el volumen y los avisos breves respetan movimiento reducido.
- Fase 12: 73 pruebas de reglas/física y 22 casos de navegador, más cuatro de producción. Se mide físicamente el cambio 50→60→70 %, la expiración de los 30 segundos y un Eagle real de dos golpes en la torre. Se conservan pausa, entrenamiento, turnos, salas y controles anteriores.
- Datos: protocolo y reglas v6; marcas completas y prácticas separadas de las claves anteriores sin eliminarlas. Pendientes de fase 13 conservados: recuperación de rondas locales en curso al recargar, sesiones humanas prolongadas y hosting público del servidor online.
