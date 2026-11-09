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
- Se agregó una prueba de altura física mínima/máxima para todas las plataformas de los cuatro campos.
- Se agregó una prueba de ambos extremos de cada rampa para comprobar que encuentre soporte de una plataforma o el green.
- Se amplió la decoración instanciada con una segunda capa diferenciada por ambiente y una comprobación de navegador para asegurar que la capa esté presente en los cuatro escenarios.

### Pendientes de verdad
1. Rondas físicas completas en los cuatro hoyos y validación separada de ruta segura/atajo.
2. Tiros de prueba en transiciones y superficies limítrofes.
3. Ajuste de obstáculos, aterrizajes y accesibilidad de cada plataforma.
4. Landmarks únicos diseñados por hoyo, revisión de capturas y ajuste de luz/materiales.
5. Medición de rendimiento en teléfonos reales.
6. CI verde del último commit y corrección de todo fallo reproducible.

## Reglas para las próximas revisiones

- No marcar una fase como completa solo por compilar.
- Conservar una lista de fallos con: archivo, síntoma, causa, corrección y prueba que lo cubre.
- Si un test falla, leer su log y artefacto antes de cambiar el código.
- No resolver tests inestables solo ampliando timeouts sin entender primero el motivo.
- No borrar contenido anterior para acelerar una nueva función.
- No fusionar el PR ni desplegarlo sin verificar el estado final del CI y revisar el diff.
- No comenzar la fase siguiente por inercia: terminar primero la que está en curso y registrar lo que no se puede verificar aquí.
