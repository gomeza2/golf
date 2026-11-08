# Evolución del club — golpe normal

## Entrega 0.21.0 — Recursos que cambian la decisión

Fases de variedad/taller: giro completo, puerta elevable y tierra reutilizan mecanismos/superficies físicos del motor. Documento 3 de activación explícita, barrido completo validado, ejemplos con rutas reales y mapa vivo; se conservan las identidades anteriores. Comunidad admite nuevos recursos con permisos, revisiones y filtros reales. Protocolo 17, física 1/2, reglas 7 y guardados 1/2.

La preparación de esquema opcional y el diagnóstico permiten configurar una alternativa gratuita en Render sin Shell; [FREE-COMMUNITY-SETUP.md](FREE-COMMUNITY-SETUP.md) requiere cuentas reales del propietario, todavía no conectadas. [WORKSHOP-RESOURCES.md](WORKSHOP-RESOURCES.md) registra verificación y pendientes.

## Entrega 0.20.0 — Elección de física para taller y comunidad

La edición actual se puede adoptar mediante una conversión explícita y reversible. Documento 1 conserva identidad y física; documento 2 registra física 2. Editor, almacenamiento, exportación, prueba, comunidad y servidor comparten la elección. El cliente verifica que la física de la sala coincide con el documento autenticado por hash. Revisiones anteriores permanecen inmutables y enlazables. Protocolo 16, esquema de base 1, guardados 1/2 y reglas 7.

Se añaden pruebas de hash legado, conversión, límites, permisos, versiones de base, búsqueda, drives reales, reconexión y revancha. [WORKSHOP-PHYSICS.md](WORKSHOP-PHYSICS.md) detalla el resultado y las verificaciones; continúan pendientes sesiones humanas y rendimiento en dispositivos físicos.

## Entrega 0.19.0 — Tierras bravas y física de aterrizajes

Fases 1–2: potencia progresiva superior al 75 %, golpe normal sin elevación inicial y rebote de aterrizaje según terreno. Fases 5–8: tres campos extensos de huella abierta con rutas alternativas, salto sobre agua, descenso de ocho metros, compuerta y tres caminos. Guardados en vuelo, honores y puntuación de rondas completas comprobados mediante el motor real.

Compatibilidad explícita: física 2/guardado 2 para rondas oficiales nuevas; física original para partidas previas, desafíos c1 y taller formato 1. Récords originales conservados y consultables, sin mezclarlos con marcas nuevas. Protocolo 15 y reglas de puntuación 7. No hay nuevas dependencias ni infraestructura simulada. [PHYSICS-AND-WILDLANDS.md](PHYSICS-AND-WILDLANDS.md) detalla la entrega y las pruebas.

Pendiente: evaluación humana de diversión y riesgo, rendimiento en teléfonos físicos y adopción explícita de física nueva en un futuro documento del taller 2. Comunidad pública requiere servicios reales configurados.

**Estado actual 0.21.0:** 34 hoyos físicos, trece selecciones (Al Filo tiene dos perfiles), escuela, taller, comunidad configurable y servidor público Render. La entrega actual amplía recursos físicos del taller y prepara la activación gratuita de comunidad, conservando los documentos, guardados y marcas originales. Los apartados anteriores conservan el estado histórico de cada entrega; sus pendientes de hosting fueron resueltos en 0.7.0. La auditoría y el plan vigente están en [ROADMAP.md](ROADMAP.md).

Esta versión sigue el plan solicitado. Cada bloque depende de las comprobaciones del anterior; no se declara completado el refinamiento continuo ni un despliegue online inexistente.

| Fase             | Trabajo concreto                                                                                                                                                                                 | Verificación / estado                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1. Tiro          | Un solo golpe; lanzamiento vertical 0; velocidad máxima 20; guía de 1,2–2,4 m, sin soluciones ni predicción                                                                                      | Pruebas de velocidad y guía + compilación completadas                                             |
| 2. Física        | Corrección de aristas internas del green; aterrizajes por superficie y rodamiento sin rebote; bandas 0,52; resistencia tangencial sobre pendientes; límite de energía transferida por obstáculos | 10 comprobaciones iniciales de caída, banda, parada, suelo, puente, agua y arena pasaron          |
| 3. Controles     | Clásico, Retroceso y Precisión comparten la misma función de golpe normal                                                                                                                        | Casos de navegador de carga, liberación y cancelación                                             |
| 4. Configuración | Preferencia antes de iniciar; esquema fijado en la ronda; online usa Clásico; un jugador predeterminado                                                                                          | Casos de bloqueo, preferencias y online                                                           |
| 5. Recorrido     | Conservar 18 hoyos distintos; incorporar vuelta de 9                                                                                                                                             | Partidas completas desde salida con la física nueva                                               |
| 6. Terrenos      | Césped, rough, tierra, arena, pendientes, agua y bandas curvas con colisión                                                                                                                      | Comparación de resistencia y rutas reales                                                         |
| 7. Experiencia   | Flecha corta, seguimiento y feedback de impactos; sin arco ni trayectoria resuelta                                                                                                               | Capturas escritorio/móvil y casos de entrada                                                      |
| 8. Partidas      | Par, suma, honores del hoyo anterior, empates, límites identificables, reinicios y rondas de 9/18                                                                                                | Reglas y partidos de principio a fin                                                              |
| 9. Menús         | Catálogo único, nombres persistentes, panel compacto, turno lateral y controles previos                                                                                                          | Navegación y comienzo real                                                                        |
| 10. Progresión   | Récords personales por recorrido/control y objetivos de rondas válidas                                                                                                                           | Datos corruptos, persistencia y rechazo de rondas incompletas                                     |
| 11. Pulido       | Un hoyo visible, geometría procedural, cámara y carga con recuperación                                                                                                                           | Compilación y sitio de producción                                                                 |
| 12. Equilibrio   | Probar potencias, terrenos, controles y todos los hoyos sin golpe elevado                                                                                                                        | Batería final de reglas, navegador y producción                                                   |
| 13. Continuidad  | Repetir pruebas y ajustar a partir de partidas reales                                                                                                                                            | Continua: pendientes sesiones manuales prolongadas en teléfonos físicos y medidas de muchas salas |

Los datos personales se guardan solo para partidas locales de un jugador, en un espacio de reglas separado de versiones anteriores. Una ronda con retiro, hoyo al límite o puntuación inválida no genera récord ni objetivos. El servidor online permanece disponible en el código, pero necesita hosting persistente para ofrecer salas públicas por Internet.

## Comprobaciones de esta entrega

- Compilación TypeScript, cliente Vite y servidor Node completada; también con base `/golf/` y modo estático.
- 122 pruebas de reglas, física, recuperación, calidad y competición: rondas reales de 18 (90 golpes) y 9 (33 golpes), sin penalizaciones ni recolocación, además de terrenos, copa, controles y récords.
- 37 casos de navegador: escritorio, tacto, tres controles, bloqueo del esquema, sockets reales, permisos y reconexión. La prueba de una vuelta solo observa la posición real del minimapa para corregir aproximaciones: no exige resultados idénticos frente a obstáculos que siguen moviéndose entre tiros.
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

## Versión 0.7.0 — cerrar la partida con amigos

- Fases 3, 8–10: ambos formatos funcionan en salas reales. El anfitrión selecciona reglas antes de comenzar y cambiar el formato reinicia preparados; el servidor rechaza al invitado y el cambio durante la ronda. La revancha mantiene el formato. El control online sigue Clásico.
- Fases 7–10: podio multijugador y reconocimientos de ases, hoyos bajo par y vuelta limpia, calculados con los resultados completos. Los empates comparten puesto y reconocimiento; los retiros no reciben premios.
- Fases 8, 11–12: desconexión con plazo de 90 segundos, configurable. Al vencer, retiro y revocación de token evitan que la partida quede esperando al desconectado. Lobby y resultados ya terminados no son retirados por esta política.
- Fase 11: servidor Render Free preparado con origen Pages, nombre actual y reconexión configurada. La dirección queda en conexión avanzada para que los amigos solo tengan que poner nombre, crear/unirse y jugar.
- Fase 12: 122 pruebas unitarias y 37 de navegador, más cuatro de producción. Se prueban puntos físicos entre clientes, ambos navegadores viendo las mismas puntuaciones, permisos y preparados, reconexión, retiro caducado y podio/reconocimientos. El comando test:online también se prueba con el servidor Node compilado; solo una URL externa real permite declarar verificación por Internet.
- Compatibilidad: protocolo de red 8 separado de reglas v7. Se actualizan cliente/servidor juntos; los guardados y marcas locales no se invalidan. Física, potencia, circuitos y tres controles conservados.
- Pendiente externo para completar Internet: crear y activar el servicio en una cuenta de hosting y verificar su URL. El propietario fue informado de la opción Free y sus límites; los amigos no necesitan cuenta. La publicación podrá probar automáticamente esa URL antes de activar el online predeterminado de Pages.

## Versión 0.8.0 — Ruinas del Cielo

- Fases de contenido y mundo: tres trazados nuevos definidos en `shared/skyCourses.ts`, consumidos por la misma geometría del motor y del render. Par 4/4/5; pasarela segura, puente diagonal, rampas continuas, pórtico físico y mecanismos con ruta exterior. Vuelta real sin penalizaciones de 3/3/4; diagonal real de dos golpes frente a tres por la ruta segura.
- Fases visuales y rendimiento: ambientación instanciada que sustituye los árboles anteriores, materiales procedurales, bandera y partículas. Detalle adaptativo 4/8/14, sin efectos opcionales en Ahorro; una sola llamada para reflejos superficiales por zona de agua.
- Compatibilidad: 21 hoyos anteriores intactos en sus mismas posiciones, vueltas de 9/18 conservadas, sin cambios a potencia/fricción/rebotes/turnos. Reglas v7, formato de guardado 1 y claves de marcas intactos. La red pasa a protocolo 9 por el catálogo nuevo.
- Validación física: ronda segura completa, atajo, penalización única por fallo, uniones de las dos rampas, hueco físico del pórtico y recuperación idéntica fotograma a fotograma. Navegador móvil: cambio real de detalle, atajo con Eagle y recuperación. Dos clientes del servidor reciben los mismos resultados del recorrido nuevo.
- Plan vigente en ROADMAP.md. Continúan pendientes teléfonos físicos, sesiones humanas prolongadas/carga, desafíos periódicos, torneos de varias rondas y editor; no se sustituyen por simulaciones locales presentadas como servicios compartidos.

## Versión 0.9.0 — cámara y Escuela del Club

- Encuadre por límites y proyección en perspectiva, incluyendo altura y espacios del HUD. Orientación vertical con más longitud visible, ajuste al rotar y disposición de controles de pantalla horizontal baja. Giro/inclinación/zoom y seguimiento anteriores conservados.
- Vista inicial de cada hoyo local: 2,6 s con reloj detenido, omisión inmediata y ajuste persistente. No aparece durante un golpe iniciado ni introduce pausas en red.
- Tres ejercicios de práctica con comprobaciones físicas: bola completa dentro del aro tras un golpe, rebote real y entrada en copa sin penalización/límite. Reintentos y feedback, preparación sin reloj y progreso por control. No se altera velocidad, fricción, paredes ni puntuaciones.
- Metadato opcional de guía en guardado formato 1, recuperación del ejercicio/control y descarte independiente del metadato inválido. Preferencias y claves v7 existentes conservadas. La escuela no genera marcas de rondas completas ni resultados globales.
- 134 pruebas unitarias; batería de 44 casos de navegador y cinco de producción. La prueba pública adicional comprueba versión actual y una aproximación real. Capturas vertical, horizontal, escritorio y guía táctil.
- Siguiente entrega: desafíos deterministas compartibles con resultados personales separados; primero extraer la conexión/lobby para no concentrar más funciones en `main.tsx`. Teléfonos físicos, carga prolongada, editor y copas de varias rondas permanecen pendientes.

- QA de 0.9.0: la comprobación de roster del anfitrión espera hasta 15 s a que aparezca realmente el invitado, manteniendo las condiciones de preparación. La CI conserva trazas/capturas de sus salas locales si falla; la comprobación pública conserva capturas/contexto y desactiva trazas de red.

## Entrega 0.10.0 — retos repetibles y conexión separada

Se implementan desafíos diarios y copas semanales individuales sobre los recorridos existentes, con objetivos y medallas calculados tras completar la vuelta. Calendario UTC, identificadores c1 y pools congelados mantienen los enlaces estables. Los desafíos se comparten por enlace, con resultados personales locales separados; no hay clasificación mundial ni copas online nuevas.

La recuperación conserva el identificador del intento sin alterar el formato 1 del guardado. Metadatos incorrectos del reto se ignoran independientemente, conservando la partida. Repetir crea un intento nuevo. El control Clásico queda fijado sin cambiar la preferencia de las rondas normales. Los registros conservan mejor puntuación y máxima medalla por separado; se limitan a 120 retos y 32 intentos recientes para deduplicación.

La conexión Socket.IO se mueve a `onlineConnection.ts`: validación de sesión/protocolo, acciones solo tras admisión, recuperación, ping reconocido, salida y limpieza. No se modifica el servidor ni el contrato de protocolo 9. La siguiente fase puede incorporar una copa entre amigos sobre esta base sin añadir otra implementación de conexión.

Pendientes: copas de varias partidas en salas, persistencia central, editor completo y mediciones prolongadas en hardware móvil físico. El balance de golpe normal permanece intacto.

## Entrega 0.11.0 — copas entre amigos

Se añaden dos planes de copa online de dos/tres vueltas, acumulación autoritativa por golpes o puntos, actas por vuelta inmutables, honores de salida, desempate por ases y victoria compartida. Selección y preparación se integran en la sala existente; se mantienen invitación, reconexión, anfitrión, turnos y todos los modos anteriores. Un retirado conserva únicamente sus resultados reales, sin puntuaciones futuras inventadas; la copa puede continuar con un participante. Al cerrar la copa las salidas no reescriben el podio. Revancha y vuelta a preparación funcionan en la misma sala.

La cesión de hoyo requiere confirmación y validación del turno con pelota detenida. Registra 12 golpes y límite; es útil para rondas entre amigos y no concede récord ni medalla. La simulación no cambia: reglas v7 y snapshots formato 1; el protocolo online pasa a 10. Los snapshots locales ignoran metadatos de copa reservados al servidor. No se borra ninguna preferencia, marca anterior ni pista.

Reglas/actas: `shared/cups.ts`; ciclo de vida y reemplazo seguro de mundos Rapier: `server/cups.ts`; lobby, marcador y resultados: `src/CupPanels.tsx`. Las pruebas nuevas cubren física real, cesión, series completas, puntuación, idempotencia, retiros, guardados, revancha y sesiones reales. La publicación exige también una copa completa real contra el servidor público. Pendientes: persistencia de salas/actas entre reinicios y taller de hoyos.

## Entrega 0.12.0 — canchas con riesgo real

Fases 5–6: cuatro huellas distintas sobre agua, sin perímetro rectangular global: horquilla, serpiente/diagonal, órbita de 270° y balcones. Rutas amplias de 82/72/66/47 m y atajos de riesgo comprobados. Dos perfiles de copas obligan a recalcular aproximaciones; no sustituyen ni duplican los 24 hoyos anteriores.

Fases 2, 7 y 11: malla de suelo cerrada compartida entre colisión, render y mapa, cuaternión compartido para rampas diagonales, soporte visual del suelo real y mapa con decisiones. Se conserva golpe normal, potencia, cámara y controles; sin predicción resuelta ni impulso vertical.

Fases 8–10: nueva selección principal persistente, récords de ronda/práctica separados por perfil conservando índices antiguos, y Copa Al Filo de dos vueltas en las salas autoritativas existentes. Protocolo 11, reglas v7/formato 1.

Fase 12: rondas amplias y arriesgadas completas en ambos perfiles sin recolocar pelota; caída real al agua, compuerta, raycasts del anillo, alineación de rampa, snapshot a mitad de tiro y registros. Ronda de navegador de 14 golpes y duelo online real de 3 frente a 5 en el primer hoyo; prueba del puente también en producción. El detalle del resultado final se informa con la entrega y GitHub Actions.

Fase 13: equilibrio humano con amigos, teléfonos físicos, cargas de muchas salas y taller de hoyos continúan pendientes. Las salas no sobreviven reinicios.

Cierre de regresión de 0.12.0: 173 pruebas de reglas/física y 53 de navegador pasaron localmente; GitHub Actions repitió ambas y completó siete casos de producción bajo `/golf/`. La revisión visual detectó parpadeo en cruces coplanares: se corrige solo la prioridad de profundidad de las superficies nuevas, sin mover mallas ni colisiones; se repite la ronda nueva y la comprobación de producción después del ajuste. La prueba pública espera la versión desplegada para tolerar la propagación de Pages.

## Entrega 0.13.0 — creatividad con el mismo motor

Fases 5–6 y taller: documento versionado y validado, plano editable, plataformas/rampas/barreras/compuertas/superficies, salida y copa, tamaños, alturas y rotaciones. Recorte real del green, validación previa y prueba 3D con el mismo motor y escena. La validación no garantiza que todas las rutas sean jugables.

Fases 9–11: acceso desde catálogo, editor adaptable, ratón/tacto, propiedades, deshacer/rehacer, borrador y biblioteca local separados, importación/exportación `.golf.json`, errores de archivo y almacenamiento visibles. Sin datos ficticios ni enlace/galería inexistentes.

Fases 8 y 12: sandbox personalizado sin penalización por reloj, con golpe normal y límite de golpes; resultados excluidos de récords, desafíos y recuperación oficial. Ocho pruebas específicas de validación/copa/física/snapshot/historial/almacenamiento/reloj. Tres de navegador de edición/guardado/exportación, embocado real conservando el guardado oficial y móvil. Conservados todos los recorridos, controles, modos y protocolo 11/reglas v7/formato 1.

Pendientes: cooperación/multijugador de creaciones, validación de contenido por servidor, galería/enlaces duraderos, inspección 3D avanzada, selección múltiple y sesiones en hardware físico. Las salas y copas oficiales siguen en memoria.

Cierre de validación de 0.13.0: 181 pruebas de reglas/física y 56 de navegador pasaron localmente; GitHub Actions repitió ambas y completó ocho de producción. La revisión del formulario detectó que normalizar el nombre en cada tecla impedía escribir espacios con naturalidad: ahora se confirma al salir del campo o pulsar Enter, se comprueba escritura carácter por carácter y se conserva el rechazo de nombres vacíos. Después del ajuste se repiten los tres casos del taller y la compilación/producción.

## Entrega 0.14.0 — herramientas, inspección y diagnóstico

Fases 5–7 y taller: selección múltiple, transformaciones rígidas de grupos, alineación/copia/eliminación, cuadrícula y atajos; inspección con la cámara existente y tiro bloqueado. Transformaciones puras antes de aplicarlas al historial; no se deforma un grupo al llegar a un límite.

Fases 9–11: controles de selección táctil, importador nativo con foco/fondo inactivo/Escape y errores de archivo; componentes de importación/selección separados. Mantiene documento v1 y todos los datos/módulos anteriores.

Fase 12: ocho pruebas específicas de grupos, rotaciones, zonas, límites, historial y diagnósticos. Avisos de suelo desconectado/superficies sin apoyo, aproximados y sin bloquear saltos. Navegador comprueba transformaciones reales del documento, deshacer, copias, foco, gesto táctil sobre la cámara y embocado posterior sin alterar puntería. La producción repite cámara/bloqueo y copa real.

Pendiente siguiente: validación y contrato de contenido compartido por servidor antes de admitir una cancha creada en salas privadas. Sin galería, enlaces duraderos, persistencia central ni garantías de jugabilidad automática. Continúan pendientes pruebas humanas en hardware físico y carga concurrente.

La revisión visual de 0.14.0 detectó que el panel de inspección móvil tapaba parte del campo. El taller mide cabecera/controles con ResizeObserver y pasa márgenes explícitos a la cámara compartida; los márgenes oficiales predeterminados no cambian. Se prueba la proyección contra el espacio disponible y la posición real del campo WebGL respecto de los paneles. Total de reglas/física/cámara: 190 casos.

## Entrega 0.15.0 — canchas altas y decisiones diferentes

Fases 5–7: Cumbres y Mareas, tres canchas con desniveles/agua/riesgo, espiral inclinada y cruce de alturas con puentes/túnel. Compuertas verticales deterministas, colisión real y señal de paso compartida por motor/escena/mapa. Ambientes de glaciar/faro/acueducto con recursos procedurales acotados.

Fases 2, 8 y 12: rutas amplias y atajos completos con el mismo golpe normal; se corrigieron uniones de rampa/plataforma y se mantuvieron las copas abiertas. La arena reduce una bajada válida de casi 18 s a unos 4,6 s, sin cambiar las físicas generales de los campos anteriores. Pruebas de altura, suelo inclinado, puertas, snapshot y tiempo de asentado. Claves de práctica antiguas/banderas cruzadas intactas; las nuevas se añaden al final.

Fases 9–11: acceso nuevo desde el catálogo, entrenamiento y online, mapas con estado de puertas, calidad adaptable y faro que respeta movimiento reducido. Protocolo 12; reglas v7/guardado 1.

Fase siguiente preparada en COMMUNITY.md: validar y sincronizar una creación en sala privada antes de comunidad con persistencia/autoría/revisiones. Publicación central, galería y revisión específica de Retroceso/Precisión siguen pendientes, además de pruebas humanas en dispositivos físicos y carga concurrente.

Validación local de 0.15.0: 199 pruebas de reglas/física/cámara, incluida la colisión de los laterales visibles del green elevado. Se conservan las rutas amplias y el as oblicuo después de ese ajuste. La entrega exige además ronda completa en navegador, prueba móvil, duelo real con dos sockets y compilación de producción bajo `/golf/`.

## Entrega 0.16.0 — creación compartida en sala privada

Fases 3, 8–12 y taller: documento validado/compilado y limitado por servidor, revisión SHA-256 y acuse antes de preparar o golpear. Contenido por entrada/reconexión, sin reenviar geometría en estados de movimiento. Un hoyo privado con reloj de 30 s, límite de golpes, puntos/par del diseño, resultados, desconexiones y revancha. Sala fija; formato elegible antes de iniciar, copas/cambio de diseño bloqueados.

El cliente resuelve la geometría validada para escena/mapa/cámara/HUD y clasificación; los snapshots de red la excluyen. Guardados oficiales rechazan metadatos/geometría privados y no se guardan récords privados como oficiales. Se conserva el sandbox sin reloj y el contenido/mecánicas oficiales. Documento 1, guardado 1 y reglas 7; protocolo 13.

Pruebas cubren coste, formato, SHA, recepción/fallo de contenido, par/puntos, reloj/sandbox y aislamiento de guardados; sockets reales comprueban permisos, recepción, reconexión, embocados y revancha. Dos navegadores incluyen móvil y recarga, con el mismo diseño y sin marcas oficiales. La producción comprueba el traspaso taller/preparación y borrador. Pendientes: publicación/galería persistente, autoría/moderación, ensayos humanos y carga concurrente.

Revisión visual de 0.16.0: el HUD de creaciones muestra la distancia recta salida–copa, etiquetada, en lugar del tamaño genérico del mapa; el soporte del green usa prioridad de profundidad para reducir superficies coplanares. La creación pendiente se limpia al volver al modo oficial. Validación local: 207 casos de reglas/física/datos, siete de taller y salas y repetición visual del duelo móvil tras el ajuste.

## Entrega 0.17.0 — creaciones públicas, versiones y moderación

La base de salas del taller evoluciona con persistencia PostgreSQL y revisiones inmutables. Identidad OIDC con PKCE en navegador y JWT/JWKS en servidor; la autoría y los permisos no proceden de nombres o roles enviados por el cliente. Publicación pendiente y revisión explícita; galería anónima, búsqueda/filtros/planos, página por creación y revisión. Denuncias únicas por cuenta/revisión, cola y decisiones auditadas.

Se reutilizan documento v1, validación/presupuesto, compilación, Game/Rapier/Scene y salas. Las referencias públicas se resuelven en el servidor; una revisión retirada no admite nuevas salas, y las ya admitidas conservan su mundo. Se resuelven carreras de entrada y desconexión durante consulta. Juego individual público separado de récords oficiales. El taller preserva el borrador anterior al editar una versión y permite continuar tras recargar.

Migración manual, indicadores reales de disponibilidad, lectura pública sin identidad y publicación desactivada si falta base/identidad/moderación. Configuración/credenciales no se inventan; la infraestructura pública necesita provisionarse por el propietario. Protocolo 14, reglas 7, guardado 1 y documento 1. Pruebas independientes con PostgreSQL, firmas RSA, flujo OIDC PKCE y navegadores, además de la regresión existente.

Pendientes: activación de servicios de producción, pruebas humanas y de carga, respaldos operativos, colecciones comunitarias multihoyo y revisión de Retroceso/Precisión. La validación geométrica no se presenta como prueba de que todas las rutas se puedan completar.

## Renovación de primera impresión — 0.17.0

Auditoría de v0.16 en escritorio y móvil: el catálogo y los anuncios ocultaban el online y la entrada principal elegía una pista de 82 m antes de enseñar. Se priorizan entrada rápida a la escuela existente, invitación online visible y continuación a una vuelta de tres hoyos. Guía visual compacta, fuerza inicial suave, feedback de contacto y reparación de la superposición entre tabla de práctica y graduación. Se mantienen campos, modos, datos y comunidad en desarrollo. FIRST-IMPRESSION.md registra método, hallazgos, pruebas reproducibles y evaluación humana pendiente.

## Entrega 0.18.0 — controles y putts cortos

Se revisan Retroceso y Precisión conservando la física y sus curvas normales. La zona muerta de 12 px impedía acceder a potencias inferiores a 6,7 % en Retroceso; una sensibilidad fina opcional permite 3–35 % sin aumentar la fuerza máxima. Los ajustes ocultos por CSS se vuelven accesibles al expandir, y la lectura separa referencia y suelta. Precisión usa marcas temporales de entrada y cancela ante pérdida de captura. CONTROLS.md documenta comportamiento, compatibilidad, pruebas y evaluación humana pendiente.
