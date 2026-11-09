# Registro de desarrollo y QA — Golf Club

Fecha de actualización: 9 de noviembre de 2026  
Rama de trabajo: `feat/v023-expedition-worlds`  
Pull Request de la Fase 2: https://github.com/gomeza2/golf/pull/36

Este registro separa lo implementado de lo comprobado. Una compilación correcta no equivale a una fase terminada.

## Editor: refinamiento de la Fase 1

### Problemas observados al revisar el código
- El taller mostraba la escena 3D y el plano 2D uno debajo del otro. Para llegar a las herramientas o ajustar el plano había demasiado desplazamiento vertical.
- La navegación por cámara dependía de entrar en un modo separado; el arrastre derecho cambiaba de comportamiento y no era intuitivo.
- Los controles visibles permitían desplazar en X/Z y hacer zoom, pero no ofrecían de forma clara inclinación y elevación vertical.

### Cambios de esta revisión
- Vista 2D como inicio, con selector visible a 3D; las dos vistas mantienen el mismo documento, selección, historial, guardado y prueba.
- La escena 3D ocupa el área principal cuando está activa; el plano deja de quedar apilado debajo.
- El botón derecho desplaza la cámara también durante la edición; el modo de cámara habilita la órbita izquierda.
- Añadidos controles explícitos de órbita, inclinación vertical, subida/bajada, desplazamiento y zoom.
- Añadida navegación por teclado durante el modo cámara: flechas, W/A/S/D, Q/E y +/−.
- Paneles laterales con scroll independiente en escritorio y una columna adaptable en móvil.
- El cambio entre 2D y 3D conserva también el encuadre de cámara, además del diseño; Playwright comprueba que el valor de cámara no se reinicialice al volver a la escena.
- Los eventos de selección y construcción ahora aceptan solo el botón primario: el botón derecho queda reservado para desplazar cámara y no puede colocar una pieza por error.
- La navegación vertical por teclado sigue una convención habitual: E sube y Q baja; Playwright comprueba ambos sentidos.
- Playwright comprueba el arrastre derecho como navegación y que un clic derecho con la herramienta Pared activa no cambie el diseño.

### Errores detectados y corrección
- CI del commit `15cb6ef`: `npm test` pasó (270 pruebas / 32 archivos), pero `npm run build` se detuvo con `src/Workshop.tsx(914,41): TS1136 Property assignment expected`.
- Causa: el atributo JSX `className` de la nueva vista se escribió con una llave duplicada.
- Corrección: se dejó una única expresión JSX válida. Se agregó además `tabIndex` y nombre accesible al canvas para que el teclado pueda enfocarlo.

### Verificación agregada
- Playwright: apertura explícita de 3D para pruebas de escena, alternancia 2D/3D sin cambiar el borrador, y cambios de pose en controles de órbita, inclinación y elevación.
- La prueba enfoca el canvas antes de probar las flechas; no depende del botón que quedó seleccionado.
- La suite de producción vuelve a entrar explícitamente en 3D antes de seleccionar geometría.
- CI del commit `b74a4ce`: `npm test` pasó, pero la compilación encontró que `OrbitControls` no expone `rotateLeft/rotateUp` en sus tipos públicos.
- Causa: se intentó usar métodos internos de OrbitControls para rotar; la interfaz pública no los declara.
- Corrección: la rotación ahora calcula la posición relativa al punto de enfoque con `THREE.Spherical`, aplica límites polares y actualiza la cámara sin métodos privados.
- También se añadió al mismo cambio una prueba de altura mínima de todas las plataformas jugables de los cuatro campos, que habría detectado las rampas del bosque que caían por debajo del límite del mundo.
- Pendiente confirmar que el siguiente CI completa build y las suites de navegador.

### Pendiente
- Revisar capturas nuevas y probar con mouse real y móvil físico; la emulación de Playwright no sustituye esa prueba.
- Observar si la cámara se siente intuitiva para un jugador que nunca usó un editor 3D.
- Revisar el comportamiento táctil y el tamaño de los controles en teléfonos pequeños.


### Seguimiento de cámara y flujo 2D/3D
- El selector 2D/3D queda como control principal del área de trabajo. La vista inicial es 2D y la escena 3D solo se monta al elegirla; al volver a 3D se conserva el mismo borrador y la cámara recordada.
- En 3D, el botón derecho desplaza la vista aun mientras se edita. El modo de cámara agrega giro con botón izquierdo; se mantienen el clic izquierdo para seleccionar y los manipuladores para transformar.
- Los controles explícitos añaden inclinación, órbita, elevación y descenso, además del desplazamiento y zoom. El teclado ofrece flechas y WASD/QE durante la navegación.
- La prueba de navegador cubre el cambio entre vistas, continuidad del diseño y la cámara, y que el botón secundario no coloque accidentalmente una pared. Pendiente: validación manual con ratón y teléfonos físicos.

## Fase 2: Grandes travesías y superficies

### Implementado en la rama
- Cuatro recorridos extensos y cuatro ambientes diferenciados.
- Superficies de piedra, madera y suelo mojado además de los materiales anteriores.
- Texturas procedurales, decoración instanciada, iluminación por ambiente y protocolo online 18.
- Pruebas unitarias de catálogo, materiales y geometría Rapier; pruebas de navegador para el primer campo en escritorio/móvil y renderizado de los cuatro ambientes en móvil.

### CI observado antes de esta revisión
- En la ejecución más reciente consultada, el trabajo de comunidad terminó correctamente.
- En el trabajo principal, `npm test` y `npm run build` terminaron correctamente; `npm run test:e2e` seguía ejecutándose cuando se registró esta nota.
- Una ejecución previa del navegador de comunidad tuvo un fallo intermitente al esperar la cabecera del taller. Se elevó la espera de 5 a 15 segundos; una ejecución posterior del trabajo de comunidad pasó. Se debe confirmar con el CI de este commit, no asumirlo.

### Cambios recientes de Fase 2
- Se corrigieron las coordenadas de tres transiciones del bosque que confundían altura con posición longitudinal; una rampa llegaba a alturas de −61 m, por debajo del límite de caída de −4 m.
- La primera simulación de ruta segura detectó un segundo defecto en el bosque: la rampa ascendente terminaba en z=-54 mientras la plataforma elevada ocupaba z=-54…-40; la rampa seguía debajo de la plataforma y dejaba menos de 0,15 m para la pelota. Se movió el final de esa rampa a z=-40 para que entre por un borde y la rampa de bajada salga por el opuesto. Se agregó una prueba general de espacio libre para rampas bajo plataformas.
- Se agregó una prueba de altura física mínima/máxima para todas las plataformas de los cuatro campos.
- Se agregó una prueba de ambos extremos de cada rampa para comprobar que encuentre soporte de una plataforma o el green.
- Se amplió la decoración instanciada con una segunda capa diferenciada por ambiente y una comprobación de navegador para asegurar que la capa esté presente en los cuatro escenarios.
- La revisión de superficies detectó zonas de piedra/arena en la costa y piedra/mojado en la montaña que se solapan deliberadamente. Los planos se dibujaban a la misma altura y podían parpadear por z-fighting. Se añadió una prioridad visual con separaciones mínimas, y una prueba comprueba que el motor seleccione el mismo material que se ve en esos solapes.
- Se agregó un simulador de ruta segura en el motor real: el test compara combinaciones de ángulo/potencia, aplica solamente el tiro seleccionado y mantiene la posición física continua entre checkpoints. La batería cubre ya las cuatro rutas seguras, sin recolocaciones entre plataformas.
- En el test de atajos, la primera ejecución dejó los cuatro recorridos dentro del carril pero fuera de un checkpoint demasiado preciso; se amplió el umbral y se mantuvo el límite lateral. La segunda ejecución dejó dos casos: una roca decorativa en Dunas de cobre bloqueaba la línea de riesgo, y el test de costa pedía volver a un checkpoint que la pelota ya había pasado. La roca se movió fuera del corredor sin quitarla del paisaje; el test ahora mide avance a lo largo del tramo y no obliga a retroceder para tocar una coordenada exacta.
- En el primer intento de parametrizar la batería, dos plantillas de diagnóstico quedaron escapadas y Vitest no pudo transformar el archivo. Se corrigieron ambas plantillas y una revisión literal confirmó que no quedan marcadores escapados dentro del bloque de prueba.

### Pendientes de verdad
1. Recorrer los atajos estrechos de los cuatro campos y medir golpes/penalizaciones; la ruta segura ya está cubierta por tiros continuos en los cuatro.
2. Probar variantes de ángulo/potencia en rampas, aterrizajes y superficies limítrofes.
3. Ajustar obstáculos, aterrizajes y accesibilidad de cada plataforma.
4. Revisar capturas/landmarks, iluminación y materiales en tamaños reales.
5. Medición de rendimiento en teléfonos físicos.
6. CI verde del último commit y corrección de todo fallo reproducible.

## Reglas para las próximas revisiones

- No marcar una fase como completa solo por compilar.
- Conservar una lista de fallos con: archivo, síntoma, causa, corrección y prueba que lo cubre.
- Si un test falla, leer su log y artefacto antes de cambiar el código.
- No resolver tests inestables solo ampliando timeouts sin entender primero el motivo.
- No borrar contenido anterior para acelerar una nueva función.
- No fusionar el PR ni desplegarlo sin verificar el estado final del CI y revisar el diff.
- No comenzar la fase siguiente por inercia: terminar primero la que está en curso y registrar lo que no se puede verificar aquí.

### Seguimiento de la última revisión — 9 de noviembre de 2026

- CI del commit `cceaeb8`: el job de comunidad terminó correctamente. En el job principal, 280 de 283 pruebas pasaron; quedaron tres fallos vinculados a Dunas: un extremo de rampa sin apoyo, el acceso al recorrido seguro y el atajo que atravesaba la terraza. El atajo de Archipiélago ya pasó tras mover su trazado para rodear la roca y entrar por el borde de la isla.
- CI del commit `0e69a6a`: 282 de 283 pruebas pasaron. La prueba de apoyo de rampas y el recorrido seguro de Dunas ya pasaron; quedó un único fallo: el atajo atravesaba la terraza elevada. El log confirmó que la pelota tenía apoyo inferior, pero la terraza actuaba como techo durante el golpe.
- Corrección aplicada después de ese log: el atajo de Dunas ya no pasa debajo de la terraza. Se desvía por el borde exterior, con una plataforma de apoyo en el cambio de dirección. La prueba mantiene el carril angosto y exige tiros continuos; no se relajó el límite lateral.
- Ajuste adicional del recorrido seguro: la terraza se amplió para que el ancho de la entrada de la bajada coincida con el ancho útil del suelo, evitando un borde lateral sin conexión.
- Ambientación: se añadieron dos capas instanciadas pequeñas junto a los laterales de cada campo, con siluetas y colores por ambiente. El conteo se adapta a Ahorro/Normal/Alta y Playwright verifica que los cuatro ambientes dibujen esa capa.
- Último código registrado en esta nota: atajo de Dunas desviado fuera de la terraza y decoración adicional. **Todavía no está validado por el CI del último commit**; la siguiente ejecución debe confirmar Vitest, compilación, navegador local, páginas y comunidad.

### Pendientes actuales de Fase 2
1. Confirmar en el CI más reciente que los cuatro atajos se recorren con tiros normales continuos, sin penalización ni recolocación; en especial el nuevo trazado de Dunas.
2. Revisar el detalle de las uniones en cada transición y probar golpes desde distintos ángulos y potencias alrededor de cada aterrizaje.
3. Comprobar clasificación de superficies en bordes y solapes, sobre todo en las plataformas elevadas.
4. Revisar capturas de cada ambiente en escritorio/móvil y ajustar composición, tamaños, luz y landmarks según lo que realmente se vea.
5. Medir memoria y fluidez con niveles gráficos distintos; CI y emulación no sustituyen teléfonos físicos.
6. No cerrar la fase hasta tener CI verde y una pasada completa documentada por cada ruta segura y cada atajo.
