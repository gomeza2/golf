# Fase 1 — Editor 3D y construcción avanzada · 0.22.0

La fase se concentra en construir, visualizar, editar y probar canchas. No inicia la fase 2 ni modifica los recorridos oficiales, controles de tiro, físicas, récords o permisos de comunidad.

## Auditoría y decisiones

La base 0.21.0 ya tenía documentos 1/2/3, un plano SVG editable, propiedades numéricas, selección múltiple, historial, biblioteca, exportación y prueba real con Game/Rapier/Scene. La limitación principal era entender y manipular estructuras con alturas desde un plano superior.

Se conservan esas herramientas. La vista 3D utiliza la compilación `compileWorkshop()` y los mismos componentes de superficies, plataformas, copa y obstáculos que el juego. OrbitControls y TransformControls pertenecen a Three.js, que ya era dependencia; no se agrega un motor o paquete de controles paralelo.

La organización del editor queda separada de la cancha jugable. Los grupos y bloqueos no cambian la física ni entran en los hashes o paquetes de sala. Por eso no es necesario modificar los formatos de juego ni el protocolo.

## Construir y observar en tres dimensiones

El taller abre en **Vista 2D**, con el plano como espacio inicial, y permite cambiar en cualquier momento a **Vista 3D** desde el selector de la parte superior. No son dos documentos: ambas vistas editan el mismo diseño, comparten selección, historial, herramientas, propiedades, guardado y prueba. La vista activa ocupa el área central sin obligar a desplazarse entre un plano y una escena apilados.

- **Editar escena:** clic o toque selecciona una pieza. Sus manipuladores permiten mover X/Y/Z, girar sobre Y y escalar X/Z. Seleccionar por sí solo no mueve objetos.
- **Navegar cámara:** en el modo de cámara, arrastrar con el botón izquierdo orbita; botón derecho desplaza y la rueda acerca/aleja. En modo de edición, el botón izquierdo sigue seleccionando y arrastrando; el derecho ya puede desplazar la cámara sin cambiar de modo. En táctil, un dedo selecciona/edita o orbita en modo cámara; dos dedos desplazan y acercan.
- **Movimiento vertical y libre:** los límites de inclinación permiten llegar casi a la vista cenital y girar hasta ver la escena desde abajo. Hay controles separados para orbitar, inclinar, subir/bajar, desplazar y acercar/alejar. Durante Navegar cámara, flechas giran/inclinan, W/A/S/D desplazan, Q/E cambian la altura y +/− ajusta el zoom.
- **Superior, Frontal, Lateral, Perspectiva:** encuadres reales de la cámara. Encuadrar cancha recupera la vista si se pierde el recorrido.
- **Cuadrícula:** pasos de 0,1/0,5/1 m y plano a la altura elegida, con regla de referencia de 0–4 m.
- **Alt + clic:** alterna intersecciones reales para acceder a piezas superpuestas. Aislar selección permite observarlas sin las demás. Objetos y grupos ofrece una lista de acceso directo, también a una pieza individual dentro de un grupo.
- **Shift/Ctrl + clic:** añade o retira piezas de la selección. Una selección de grupo mueve el conjunto; los bloqueos impiden modificar sus miembros bloqueados.
- **Esc**, pérdida de captura o de foco cancela un arrastre. Las vistas, desplazamientos, inclinación y elevación de cámara no modifican el documento.
- Los paneles de herramientas y propiedades tienen desplazamiento independiente en escritorio; en móvil pasan a una disposición de una columna y los controles de cámara se agrupan para evitar botones diminutos.
- El plano 2D ya no queda debajo de la escena 3D: se cambia de vista con un control explícito, evitando una página de edición demasiado larga.

Las plataformas conservan sus giros válidos de 90°. Las demás piezas permiten los giros admitidos por el documento; el manipulador usa pasos de 5°. Las superficies rectangulares intercambian dimensiones al girar en cuartos de vuelta. El escalado oblicuo no puede introducir deformaciones que el formato no representa: usa Ancho/Largo o escalado uniforme. No hay un eje de escala vertical ficticio; las alturas se ajustan moviendo Y o mediante los campos.

El agua conserva su cota física fija de −1,4 m; sus controles permiten posición X/Z, tamaño y giro, sin ofrecer una altura que el formato no representa. Una selección que incluye agua no puede mover ni alinear Y parcialmente.

Los marcadores se seleccionan en la escena y se colocan con sus herramientas, con posición/altura exactas en propiedades. El plano de construcción es explícito: tocar una estructura no cambia automáticamente la altura elegida.

## Estructuras reutilizables

Cada estructura se coloca en la escena o en el plano, suma su altura al plano de construcción y produce piezas normales editables. Las compuestas se agrupan automáticamente. No son decoraciones sin colisión.

| Estructura         | Construcción real                                                                      |
| ------------------ | -------------------------------------------------------------------------------------- |
| Plataforma elevada | Superficie de 6 × 6 m a 2 m de altura relativa                                         |
| Puente con bandas  | Plataforma de 3 × 8 m y dos bandas físicas                                             |
| Túnel transitable  | Suelo, paredes apiladas y cubierta transitable; 1,6 m de altura libre                  |
| Rampa curva        | Cuarto de giro compuesto por ocho rampas rectas conectadas, con ascenso total de 1,2 m |
| Pasarela estrecha  | Paso de 1,4 × 10 m, elevado y sin bandas                                               |

Se conservan todas las plataformas, rampas, paredes, terrenos y mecanismos anteriores. La curva es una construcción **por tramos**, no una nueva superficie paramétrica. Las costuras tienen soporte físico comprobado; no se representa una curva lisa con una colisión recta invisible.

**Laboratorio en altura** está disponible junto a los ejemplos anteriores. Reúne rampa, puente, túnel de dos niveles, puerta, tierra y curva con conexiones al camino principal. La ruta de la pasarela/túnel se completó con tres golpes reales, sin penalizaciones. Las cubiertas pueden generar avisos de suelo separado porque también son superficies: no se presentan como errores concluyentes.

## Flujo de edición

- Deshacer/rehacer restaura geometría, grupos y bloqueos en la misma operación de historial. Un arrastre genera un paso al terminar, sin guardar cada fotograma.
- Copiar/Pegar y Ctrl/Cmd+C/V crean IDs independientes. Ctrl/Cmd+D duplica. No interceptan la edición de texto.
- Alinear centros X/Z y alturas permite ajustar conjuntos, conservando el desnivel de las rampas.
- Los grupos se pueden seleccionar, nombrar y desagrupar. Los bloqueos se conservan y requieren desbloquear antes de mover, girar, escalar o borrar.
- Eliminar suelo, rampas, grupos o partes agrupadas pide confirmación; cancelar conserva el documento y el historial.
- Los límites se aplican a toda la operación. Una escala, copia o movimiento inválido no transforma parcialmente el conjunto.
- La vista 3D dibuja bajo demanda, libera controles/geometrías/texturas al salir y conserva la cámara al regresar de la prueba física.
- En móvil hay accesos entre escena, construcción y selección. Ampliar editor utiliza pantalla completa del navegador cuando está disponible; no es un botón simulado.

## Guardado, archivos y compatibilidad

**Guardar diseño** conserva también la organización en la biblioteca. El borrador jugable anterior sigue en su clave compatible. Una clave separada guarda la organización asociada al documento exacto; si está desactualizada, no se aplica a otra creación.

- **Exportar archivo:** `.golf.json`, el mismo documento jugable 1/2/3, hasta 60 KB.
- **Exportar proyecto editable:** `.golf.project.json`, archivo de proyecto versión 1 con documento y organización, hasta 80 KB. Se necesita este contenedor para trasladar grupos/bloqueos sin cambiar los formatos publicados.
- **Importar diseño:** acepta ambos. Un proyecto no puede saltarse el límite del documento, admitir referencias de grupo inválidas o cambiar la edición física.
- Un fallo de almacenamiento se muestra y ofrece exportar. Si falla solo el guardado de organización, el documento jugable ya guardado se conserva; la organización antigua no se aplica a un documento distinto. No se promete que las cuotas del navegador sean ilimitadas.
- Las creaciones publicadas siguen usando únicamente el documento jugable, con sus permisos, presupuesto, revisiones inmutables y hash. Los datos de edición no se usan para aceptar puntuaciones o geometrías no validadas.

**Sin cambios:** protocolo 17, reglas 7, documentos jugables 1/2/3, ediciones físicas 1/2, guardados de rondas 1/2, 34 hoyos oficiales, 13 selecciones, 38 prácticas, modos, controles, escuela y récords. La biblioteca anterior sigue siendo legible. No se exige base ni cuenta para editar/probar/jugar una cancha privada.

## Probar y diagnosticar

Probar en 3D usa el mismo Game, Rapier, copa abierta, superficies y mecanismos del juego. Volver al diseño conserva geometría, organización y cámara. Los resultados de prueba no reemplazan partidas oficiales ni récords.

Los avisos de suelo consideran varias alturas en cada celda, para no confundir un túnel con el techo. También comprueban superficies sin soporte, continuidad aproximada, poco espacio bajo cubiertas y pasos estrechos entre paredes. Los límites, pendientes, posiciones de obstáculos y copa conservan las validaciones existentes.

Son comprobaciones aproximadas: no resuelven todos los tiros, saltos o posibles atascos. Una isla puede ser intencional y un túnel ancho puede requerir probar sus entradas. El diagnóstico no certifica que todos los diseños sean jugables.

## Verificación

Las pruebas cubren transformaciones rígidas, giro/escalado, precisión, historial completo, bloqueos, archivos, guardado fallido y biblioteca anterior. Se comprueban las estructuras compiladas, el soporte Rapier de cada tramo y costura de la curva, alturas libres y la ruta física del laboratorio.

Playwright selecciona intersecciones reales, arrastra manipuladores nativos, cambia las vistas, orbita/pellizca por eventos táctiles, construye una estructura sobre la escena, copia y bloquea piezas, confirma/cancela borrado y reabre proyectos. Completa el laboratorio con golpes reales y revisa capturas en escritorio y móvil. La prueba de producción bajo `/golf/` repite selección, manipulador, guardado y partida física.

Los resultados y enlaces de CI/publicación se registran en la entrega de GitHub. La automatización no reemplaza evaluar comodidad con personas, teléfonos físicos y circuitos grandes durante sesiones largas.

## Archivos principales y cierre de fase

- `Workshop3D.tsx`, `WorkshopGizmo.tsx`: escena, cámara, selección y manipuladores.
- `WorkshopPlan.tsx`, `WorkshopNumeric.tsx`, `WorkshopOrganization.tsx`: plano preservado, propiedades y organización.
- `workshopProject.ts`, `workshopProjectStorage.ts`: metadatos, archivo editable, historial y guardado.
- `workshopTransform3D.ts`, `workshopStructures.ts`, `workshopDiagnostics.ts`: operaciones, estructuras y avisos con geometría compartida.
- `workshopBlueprints.ts`: laboratorio y ejemplos anteriores.
- `tests/editor-3d.test.ts`, `tests/e2e/editor3d.spec.ts`, `tests/pages/published.spec.ts`: reglas, recorridos visuales e integración.

La siguiente fase queda **sin iniciar**. Este documento deja el editor y sus límites registrados para planificarla cuando el usuario la indique.
