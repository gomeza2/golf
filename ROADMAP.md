# Evolución total del club

## Auditoría de partida — main 05a4ce7, versión 0.7.0

Se revisaron las definiciones y geometrías, Rapier y reglas de partido, entradas y tres controles, cámara y efectos, guardado/recuperación, récords, lobby y servidor Socket.IO, configuración Render/Pages y pruebas.

| Área existente | Resultado y decisión |
| --- | --- |
| React/TypeScript/R3F | Separación útil entre motor e interfaz. `main.tsx` concentra conexión y navegación; extraerlas antes de añadir más modos. Conservar el catálogo único. |
| Física | Rapier a 60 Hz, golpe normal horizontal, superficies compartidas, copa abierta, recuperación y energía limitada. No recalibrar distancias sin una regresión física completa. |
| Contenido | 21 hoyos únicos, ocho selecciones, vueltas de 9/18 y tres ases comprobados. Ampliar al final de las listas para conservar las claves de práctica. |
| Juego | Local 1–8, online 2–8, golpes y Stableford, honores, entrenamiento y tres controles. No duplicar salas ni competición. |
| Datos locales | Snapshot Rapier, reglas v7, formato 1, récords/prácticas separados. Mantener claves y geometrías antiguas. |
| Online público | Render y Pages ya configurados; la publicación de 0.7.0 pasó dos pruebas públicas contra Render y la comprobación de Pages. No confundir este resultado con disponibilidad permanente o una prueba de carga. |
| Renderizado | Calidad automática y suspensión en segundo plano existentes. Árboles individuales y muchas piezas pequeñas de reflejos son candidatos a agrupar. La nueva decoración sustituye a la anterior. |
| Validación | 122 pruebas de reglas, 37 de navegador y cuatro de producción previas. Casos de controles, tacto, rondas completas, reconexión y guardado ya existentes. |

## Entrega 0.8.0 — mundos con decisiones

Implementado: **Ruinas del Cielo**, tres hoyos nuevos y 24 en total, nueve recorridos. Ruta amplia frente a puente diagonal que permite ahorrar un golpe; dos rampas a un templo con pórtico físico; reloj de piedra con mecanismos y desvío por rough. Misma fuente de geometría para representación y colisiones. Vuelta segura real de 3/3/4 golpes; atajo inicial real de dos.

Ambientación instanciada fuera de los límites jugables, variantes de jardín/luna/ruinas, bandera de tela animada, texturas de superficies y partículas de impacto. Ahorro conserva lectura del terreno con cuatro decoraciones, sin partículas/bandera animada/reflejos pequeños. Alta usa 14, automática 4/8/14. Las animaciones nuevas de bandera y partículas respetan movimiento reducido. No se modifica la trayectoria para producir un efecto visual.

Compatibilidad: se conservan los 21 hoyos, ocho selecciones, turnos, controles, guardados y récords. Reglas v7 y formato 1 intactos; protocolo de red 9 para impedir conectar un catálogo nuevo con un servidor antiguo. Los despliegues/reinicios de Render siguen perdiendo las salas en memoria.

La verificación de publicación incluye ahora tres pruebas públicas: dos anteriores y una con dos clientes que completan el nuevo puente y reciben la misma puntuación del servidor. Un fallo impide publicar Pages.

## Próximas entregas, en orden

1. **Cámara y entrada al juego.** Encuadre de vista general según relación de aspecto, introducción breve y omisible al hoyo, tutorial interactivo de tiro sin enseñar una solución. Validación: teclado, tacto, tres controles, transición sin disparos accidentales y mediciones en teléfonos físicos.
2. **Desafíos del club.** Selecciones diarias/semanales deterministas de contenido comprobado, objetivos completos y resultados personales separados. Compartir el mismo desafío por enlace. No presentar datos locales como un ranking compartido; sin recompensas que alteren la física.
3. **Copas entre amigos.** Series de rondas dentro de la sala, acumulación autoritativa, revancha y resultados de la serie recuperables durante una desconexión. Definir abandono y empates antes de incorporar interfaz. Persistencia entre reinicios requerirá almacenamiento central real.
4. **Taller de hoyos.** Aprovechar `Course`, `Block`, `Zone`, `geometry()` y `blockPose()`. Primero documento versionado/validado y prueba con el mismo Rapier; después colocar, mover, girar, deshacer y configurar salida/copa. Guardar/exportar/importar creaciones locales explícitas; los circuitos compartidos online deberán ser validados por el servidor. No aceptar snapshots físicos enviados por jugadores. Galería comunitaria y enlaces duraderos necesitan almacenamiento y moderación, aún no implementados.
5. **Mundos y progresión.** Ciudad en miniatura, industria, cascadas y movimientos nuevos con colisiones compartidas; medallas, historial y cosméticos sin ventajas. Incorporar cada mundo solo después de completar sus rutas reales.

No hay botones anticipados para funciones pendientes. Cada entrega exige compilación, reglas, ronda física, navegador, producción, revisión visual y prueba pública cuando afecta al online. Antes de escalar: teléfonos iOS/Android físicos, sesiones humanas largas y carga de varias salas. El número de llamadas de dibujo reducido no equivale a una mejora de FPS ya medida en esos equipos.
