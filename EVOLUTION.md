# Evolución del club — golpe normal

Esta versión sigue el plan solicitado. Cada bloque depende de las comprobaciones del anterior; no se declara completado el refinamiento continuo ni un despliegue online inexistente.

| Fase             | Trabajo concreto                                                                                                                                                      | Verificación / estado                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1. Tiro          | Un solo golpe; lanzamiento vertical 0; velocidad máxima 16,2; guía de 1,2–2,4 m, sin soluciones ni predicción                                                         | Pruebas de velocidad y guía + compilación completadas                                             |
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
- 112 pruebas de reglas, física, recuperación, calidad y competición: rondas reales de 18 (90 golpes) y 9 (33 golpes), sin penalizaciones ni recolocación, además de terrenos, copa, controles y récords.
- 34 casos de navegador: escritorio, tacto, tres controles, bloqueo del esquema, sockets reales, permisos y reconexión. La prueba de una vuelta solo observa la posición real del minimapa para corregir aproximaciones: no exige resultados idénticos frente a obstáculos que siguen moviéndose entre tiros.
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

## Versión 0.3.0 — pistas con riesgo y recompensa

- Fases 5–6: 21 hoyos únicos en total. Se conservan los recorridos de 9/18 y se añade Club del As, con tres trazados nuevos: puente diagonal/agua con ruta alternativa, carambola por banda y compuerta/arena.
- Fases 1–3: máximo 16,2 (+2,5 % respecto a 0.2.0) y medición de 25,91 m en la pista plana de referencia. Se mantiene la escala gradual, el lanzamiento vertical cero, la guía corta y la misma física en los tres controles.
- Fases 7–10: los tres hoyos nuevos tienen un as real comprobado; el segundo golpea la banda y el tercero requiere la apertura de la compuerta. Ronda completa comprobada sin penalizaciones y recuperación mediante la pasarela tras un fallo al agua. Los mapas representan correctamente los puentes girados.
- Fase 12: 82 pruebas de reglas/física y 24 de navegador, además de las cuatro de producción. Dos ases se verifican también a través de la interfaz real, uno en móvil. Las variaciones cercanas de ángulo/potencia no reciben una captura automática. Las rutas anteriores de 18/9 siguen siendo válidas con los nuevos porcentajes.
- Reglas/protocolo y marcas v7. La versión visible procede de package.json (0.3.0); historial en CHANGELOG. La dificultad se apoya en trazado, fuerza y tiempo, con rutas de recuperación, sin modificar puntuaciones para simular victorias.
- Fase 13 pendiente: sesiones prolongadas con jugadores humanos y teléfonos físicos, recuperación persistente de rondas locales y hosting público del servidor online.

## Versión 0.4.0 — continuar una vuelta larga

- Fases 8–9 y 11: guardado automático de una ronda o práctica local. El catálogo muestra el recorrido, jugadores, hoyo y control guardados y permite reanudar en pausa. Salir al club conserva el progreso; comenzar otra partida local sustituye el único guardado en curso.
- Fases 2, 7–8 y 12: snapshot de Rapier con velocidades, contactos, compuertas y reloj. Recupera el golpe en marcha y la caída física en la copa; conserva el punto anterior para una única penalización al agua. No concede un nuevo golpe ni reinicia la potencia.
- Fases 4 y 10: se conserva el esquema original de la ronda, aunque cambie la preferencia para la próxima. Las marcas completas y de práctica permanecen separadas; terminar borra la recuperación para no volver a contabilizar una práctica completada.
- Fases 11–12: checksum de la simulación, validación de reglas/formato/estado, límites de tamaño y avisos de datos dañados o cuota bloqueada. Recuperación exclusivamente local; el servidor no recibe estos archivos. El protocolo y las marcas siguen en reglas v7, al no cambiar la física.
- Verificación: diez pruebas nuevas del guardado (92 en total), cinco casos nuevos de navegador (29 en total) y las cuatro comprobaciones de producción. Comparación fotograma a fotograma de una simulación recuperada, una ronda física completa, agua, copa, datos dañados, control fijo, móvil y conservación de marcas sin duplicados.
- Coste observado en este entorno de desarrollo: aproximadamente 60–62 KB por guardado en las pistas 1, 10 y 18, con cadencia máxima periódica de una vez por segundo más transiciones y eventos de salida. Es una comprobación de tamaño/coste en desarrollo, no un benchmark de teléfonos físicos.
- Limitaciones: un solo guardado por navegador/origen (compartido entre pestañas), sin PWA y con posible pérdida del último intervalo si se fuerza el cierre antes de ejecutar los eventos de salida. Continúan pendientes el alojamiento público online y las sesiones prolongadas en teléfonos físicos.

## Versión 0.5.0 — calidad y fluidez

- Fases 7 y 11: perfiles Automática/Ahorro/Alta en ajustes, con preferencia persistente. Se puede modificar durante una ronda sin alterar el control de tiro, la partida ni la física.
- Fase 11: resolución y sombras escalonadas con observación de fotogramas reales. La automática espera al arranque, exige lentitud sostenida para bajar y una estabilidad más larga para subir; hay espera entre cambios. Los intervalos de segundo plano se descartan.
- Fase 11: se detiene el bucle de dibujo en pestañas ocultas. Se reutilizan geometría y listas estáticas por hoyo. El encuadre de sombras se adapta al tamaño del campo; Alta permite DPR 2 y sombras 2048.
- Fase 12: siete pruebas nuevas del presupuesto visual (99 en total), tres casos nuevos de navegador (32 en total) y cuatro de producción. Se comprueban buffers reales de móvil, persistencia, conservación de reloj/pelota/golpes al cambiar calidad y detención/reanudación de llamadas reales a WebGL. La prueba pública incluye Ahorro y recuperación de la preferencia.
- Reglas y protocolo v7 conservados: los guardados de 0.4.0 y las marcas siguen siendo compatibles. No se modifican geometrías físicas, potencia, golpes ni puntuaciones.
- Límites: reducir píxeles y sombras no equivale a una medida de mejora de FPS en teléfonos físicos. Continúan pendientes esas sesiones prolongadas y el alojamiento público del servidor online.

## Versión 0.6.0 — competir por puntos

- Fases 8–10: Duelo por puntos local (Stableford) para 2–8 personas. Premia los hoyos bien jugados y permite recuperarse de un hoyo malo. Menos golpes sigue como predeterminado y modalidad individual; se conservan las físicas y el tiro normal.
- Fases 4 y 9: elección previa en la preparación, bloqueo durante la ronda y conservación en la revancha. Si se quita el segundo jugador se vuelve a golpes. Online sigue clásico y el servidor ignora intentos del cliente de cambiarlo a puntos.
- Fases 7–8: solo se otorgan puntos al completar un hoyo; el marcador diferencia puntos y golpes. Los honores conservan el orden por golpes del hoyo anterior. Hay empate por ases y victoria compartida si persiste. Avisos de puntos en la embocada y fila de par por hoyo en la tarjeta.
- Fases 8 y 11: el guardado conserva formato, puntuación y turno. Los guardados clásicos anteriores siguen siendo compatibles; el duelo no registra marcas individuales de golpes ni medallas de entrenamiento. Reglas/protocolo v7 mantenidos al conservar la física.
- Fase 12: trece comprobaciones nuevas (112 en total), dos casos nuevos de navegador (34 en total) y cuatro de producción. Vuelta completa con tiros reales de dos jugadores, recuperación y resultado 12–6 sin penalizaciones/recolocaciones; empates, límites, valores inválidos, honores, aislamiento de récords, embocadas reales en móvil y rechazo del intento de cambiar el online a puntos. La prueba pública juega y recupera un duelo.
- Pendientes: alojamiento público del servidor online, llevar el formato por puntos a online con su validación y sesiones prolongadas en teléfonos físicos. No se presenta el duelo local como un torneo online persistente.
