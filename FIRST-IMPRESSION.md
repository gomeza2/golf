# Primera impresión — auditoría y renovación 0.17.0

## Alcance y método

Se revisó la v0.16.0 (`main` ccb4e49) en una copia aislada antes de modificar la entrada. Se inspeccionaron catálogo, arranque, escuela, controles, escenas, cámara, efectos, audio, guardado y partidas. Chromium/Playwright con WebGL por software, escritorio 1440×900 y móvil emulado 390×844, contextos nuevos. Capturas antes/después y recorrido nuevo en `work/`; las pruebas reproducibles están en `tests/e2e/welcome.spec.ts` y `school.spec.ts`.

Los tiempos de esta máquina de desarrollo no representan teléfonos físicos ni retención. La carga inicial estable observada fue aproximadamente 4,6 s en escritorio y 2,4 s en el segundo contexto móvil, con cachés del servidor ya calientes. No se compara ese build de producción con Vite para prometer una mejora de rendimiento.

## Hallazgos críticos

| Momento / área       | Problema observado                                                                                                                                                                                                                | Decisión                                                                                                                                                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portada              | El titular tenía personalidad, pero la explicación enumeraba versiones, cantidades y geometrías. Promociones de novedades y taller desplazaban la preparación y el online.                                                        | Dos acciones principales visibles desde la primera pantalla; catálogo y herramientas completos debajo.                                                                                                                                                                                                                              |
| Primeros 30 segundos | «Jugar Al Filo» llevaba a preparación y después a una U de 82 m, par 5, agua y un puente estrecho. La complejidad llegaba antes de dominar un tiro.                                                                               | «Jugar ahora» entra directamente a la escuela real sin configuración intermedia; no sobrescribe una partida recuperable.                                                                                                                                                                                                            |
| Primeros 2 minutos   | La escuela ya comprobaba físicamente fuerza, banda y copa, pero estaba enterrada entre opciones. Su explicación era principalmente texto.                                                                                         | Reutilizar sus objetivos y persistencia, añadir dibujos del reto, tres pasos legibles y feedback específico. Se mantiene opcional y con reintento/cierre.                                                                                                                                                                           |
| Primer hoyo          | Jardín de rebotes permite aprender posición y bandas; Torre y Péndulo añaden altura y tiempo. Al Filo exige decisiones avanzadas, apropiadas después.                                                                             | La ruta inicial usa Jardín para aprender, luego ofrece directamente una vuelta real de tres hoyos de Club del atardecer. No se duplican campos ni se altera su geometría para aparentar novedad.                                                                                                                                    |
| Gráficos             | Hay volumen, césped procedural, materiales diferenciados, iluminación, sombras, agua y decoración. La portada tapaba gran parte de la escena con bloques. El estilo sigue siendo geométrico y la calidad depende del dispositivo. | Reservar espacio a la escena 3D existente en escritorio y reforzar identidad verde/crema/dorado. Conservar calidad adaptable y respetar movimiento reducido; no añadir costes 3D para el menú.                                                                                                                                      |
| Interfaz             | Varias entradas competían con la acción principal; la guía móvil podía invadir el objetivo.                                                                                                                                       | Jerarquía nueva, online destacado, enlace al catálogo y guía móvil compacta. Guardado ofrece continuación con pausa, sin reiniciar la ronda.                                                                                                                                                                                        |
| Sonido y respuesta   | Golpe y rebote compartían tonos largos y parecidos. Ya existían partículas, cámara suave y celebración por resultado.                                                                                                             | Contacto más breve con transitorio filtrado, rebote corto, salpicadura texturada y liberación de nodos Web Audio. Destello breve del panel al moverse la pelota, transición de logro y celebración existente conservada.                                                                                                            |
| Progresión           | Terminar la escuela devolvía al catálogo sin un próximo objetivo inmediato.                                                                                                                                                       | Tras embocar, «Jugar mi primera vuelta» lleva a una ronda puntuable de tres hoyos. Se corrigió además una superposición real: la tabla de práctica podía tapar la graduación de la escuela; ahora solo esta guía presenta el cierre mientras esté activa. Se conservan retos, entrenamiento, medallas, récords y recorridos largos. |

## Qué cambia y qué se conserva

- La entrada rápida usa el mismo Game, Rapier, controles bloqueados por sesión y validación de objetivos. Un golpe fallido no concede progreso.
- La primera aproximación empieza con potencia suave (16 %), modificable; no hay autoembocado, trayectoria predictiva ni fuerza especial para principiantes.
- La escuela conserva sus tres controles, progreso por esquema, guardado y aislamiento respecto de récords oficiales. Cerrar la guía sigue siendo posible.
- Online destacado abre la preparación real de salas existentes; no simula conexión ni jugadores. Su disponibilidad sigue dependiendo de un servidor.
- Permanecen los 31 hoyos, doce selecciones, vueltas de 9/18, partidas locales, puntos, desafíos, editor y salas de creaciones.
- Se conserva el trabajo de comunidad PostgreSQL/OIDC de esta entrega. La ausencia de servicios de producción se muestra explícitamente; ver COMMUNITY.md.

## Verificación automatizada y límites

Las pruebas nuevas recorren escritorio y móvil: arranque real, acciones visibles, un intento fallido, reintento, los tres ejercicios completados mediante física, primera vuelta, dos hoyos terminados, llegada al tercero y recarga/reanudación sin perder estado. Capturan portada, guía, graduación y resultados. Se verifica acceso a preparación online. Las pruebas táctiles anteriores ejercitan arrastre real; el nuevo recorrido usa sliders y clics para poder repetir los golpes.

También se ejecutan regresiones de reglas, controles, física, taller, guardados, arranque, rondas y salas, más PostgreSQL/publicación/permisos/revisiones/moderación. El caso anterior de pausa/ajustes usa ahora un tiro nuevo para cada comprobación: no exige que una pelota ya detenida siga moviéndose.

**Esto no demuestra que sea divertido.** Faltan sesiones con personas sin experiencia: tiempo sin ayuda hasta su primer golpe, comprensión de la potencia y de que la flecha no predice distancia, abandonos/reintentos en la copa, ganas de jugar otro hoyo, claridad de invitaciones y satisfacción de audio. Faltan teléfonos físicos de gama baja, altavoces/auriculares y redes móviles. No se inventan métricas ni se incorpora telemetría personal.

## Siguiente fase

Probar con 5–8 jugadores nuevos y un grupo de amigos, observar sin indicar potencias/ángulos y registrar problemas concretos. Ajustar escuela/cámara/dificultad según esos resultados antes de crear más contenido. Medir carga y calidad en teléfonos físicos. Activar comunidad únicamente con PostgreSQL persistente, identidad y moderación realmente configurados; luego ensayar carga y operación con copias de seguridad.

## Registro de esta entrega

- Compilación TypeScript/Vite/servidor: correcta.
- Reglas, física y datos: 210 pruebas aprobadas.
- Bienvenida, escuela y disponibilidad real: 6 casos Playwright aprobados, con dos primeros hoyos en escritorio y móvil y arrastre táctil real en la escuela.
- PostgreSQL y API/autorización: 17 pruebas aprobadas.
- Comunidad y salas: 4 casos Playwright aprobados, incluido el flujo completo de publicación/revisión/versiones y dos participantes reales.
- Reinicio adicional del contenedor PostgreSQL de pruebas: documento/revisión/checksum idénticos tras reiniciar, con volumen persistente. No se usó una base de producción.
- Regresión completa y publicación pública: consultar los jobs de GitHub Actions de esta entrega; no sustituir su resultado por estos ensayos locales.

La entrada rápida conserva el progreso por control: propone el primer ejercicio pendiente y, una vez completada la escuela, inicia directamente la vuelta de tres hoyos. Las partidas recuperables tienen prioridad.
