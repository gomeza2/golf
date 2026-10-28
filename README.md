# Club del Último Golpe — Minigolf competitivo

Versión jugable de minigolf 3D competitivo, en español. React + TypeScript + Three.js/React Three Fiber; físicas Rapier; servidor Node + Socket.IO con simulación autoritativa. Geometría procedural y fuentes incluidas: no necesita cuentas, modelos remotos, claves ni base de datos.

## Jugar desde GitHub Pages

URL del proyecto: **https://gomeza2.github.io/golf/**. La publicación la realiza el workflow **Publish playable game** al actualizar `main`; su estado y la comprobación final de la URL están en GitHub Actions. La primera publicación debe terminar correctamente antes de que desaparezca un 404 anterior.

Pages sirve el juego local completo para 1–8 personas y los tres recorridos. No ejecuta Node ni las salas: si no hay un servidor público configurado, el botón online aparece desactivado con una explicación. Para habilitarlo, despliega el servidor y configura la variable de repositorio `VITE_SERVER_URL` con su URL HTTPS; permite `https://gomeza2.github.io` en `CLIENT_ORIGIN` del servidor y vuelve a ejecutar la publicación. Los códigos de sala no funcionan como sesiones online hasta que ese servidor esté disponible.

El workflow compila con la ruta `/golf/`, comprueba en Chromium que todos los assets cargan y se puede golpear, publica `dist/` y repite la prueba contra la URL desplegada. Publica sobre el sitio Pages existente desde `main`, con `pages: write` e `id-token: write`; no necesita modificar sus ajustes administrativos. Como recomienda GitHub, seleccionar **Settings → Pages → Source: GitHub Actions** evita que además se ejecute el publicador Jekyll heredado. Si un fork todavía no tiene Pages habilitado, su propietario debe activarlo una vez en **Settings → Pages → Source: GitHub Actions**.

## Presentación y cámara

El juego se llama **Club del Último Golpe**. La URL del repositorio se conserva para no romper enlaces.

- La pantalla inicial aparece antes de cargar React/Three/Rapier. El manifiesto de compilación enumera los archivos y sus tamaños; la barra muestra los bytes realmente recibidos hasta el 90%. El resto corresponde a la inicialización de Rapier y al primer fotograma 3D con las fuentes preparadas. No se rellena con un temporizador.
- Si la red se atasca se muestra un aviso; si falla una descarga o el arranque, aparece una acción para reintentar. La preparación tiene un límite de dos minutos para no quedar esperando indefinidamente.
- Durante la partida se utiliza todo el viewport, con cámara en tercera persona detrás de la pelota activa. Sigue su posición completa y mantiene la dirección del golpe durante el movimiento para evitar giros bruscos en los rebotes.
- Al pasar el turno, la cámara conserva brevemente el final del golpe y se desplaza al siguiente jugador. Se muestra su nombre y se bloquea el golpe durante esa transición. En local también se pausa el reloj durante la presentación; online el servidor mantiene su tiempo autoritativo.
- **Ver campo** conserva la vista general. **Mapa** despliega una vista cenital con paredes, obstáculos móviles y pelotas reales. **Pantalla completa** utiliza la API del navegador si está disponible; al salir de la partida se abandona también ese modo.

## Instalar y jugar

Requiere **Node 22.12+**, npm y un navegador con WebGL 2 (Chrome, Firefox, Edge o Safari moderno con aceleración gráfica).

```sh
npm ci
cp .env.example .env
npm run dev
```

Abre **http://localhost:5173**. Vite reenvía `/socket.io` al servidor en el puerto 3001. `npm run dev` ejecuta ambos procesos con recarga. Comandos separados: `npm run dev:client` y `npm run dev:server`. Si cambias `PORT` durante desarrollo, actualiza también el destino del proxy en `vite.config.ts`.

### En el mismo dispositivo

1. Pulsa **Jugar en este dispositivo**; introduce de 1 a 8 nombres.
2. Elige **Club del atardecer** o **Jardín lunar** y comienza el recorrido. La cámara se colocará detrás de la pelota del jugador que tiene el turno. Apunta tocando/haciendo clic en el campo o con el deslizador de ángulo.
3. Ajusta la potencia y pulsa **GOLPEAR**. Flechas izquierda/derecha ajustan el ángulo; arriba/abajo, la fuerza; espacio lanza cuando el foco no está en un control.
4. Pasa el dispositivo al jugador indicado cuando la pelota se detenga.
5. Al completar cada hoyo consulta la tabla y pulsa **Siguiente hoyo**; al terminar, juega una revancha o pulsa **Elegir otro recorrido**.

La partida local no usa el servidor: sigue funcionando si este se apaga. Necesita haber cargado la aplicación; esta versión no incluye instalación PWA ni caché para una primera visita sin red.

### Online real

1. Abre **Jugar online**, escribe tu nombre, elige el recorrido y crea una sala.
2. Copia la invitación pulsando el código o comparte sus seis caracteres.
3. Desde otro navegador/dispositivo abre el enlace, pulsa **Jugar online**, introduce un nombre y entra con el código prellenado.
4. Todos pulsan **Estoy listo**. El anfitrión inicia cuando hay al menos dos jugadores conectados y preparados.
5. El servidor calcula cada trayectoria y puntuación, y envía estados 20 veces por segundo. Los navegadores solo envían dirección y potencia: los golpes fuera de turno, simultáneos, malformados o fuera de rango se rechazan.
6. El anfitrión avanza entre hoyos o inicia la revancha. Al terminar puede volver a la sala para cambiar de recorrido sin cambiar el código. Si se desconecta, el rol pasa a otro participante conectado; si todos perdieron la conexión, el primero que recupera una sesión toma el rol.

El anfitrión puede cambiar de recorrido en el lobby: todos deben marcarse preparados otra vez. Puede quitar invitados desconectados para liberar plazas. Al iniciar se excluyen los desconectados; sus sesiones ya no pueden incorporarse a esa partida. **Salir de la sala** libera inmediatamente la plaza y revoca la sesión. **Salir** durante el juego cuenta como retiro: 12 golpes en el hoyo no terminado y en los siguientes, sin más turnos para esa persona. Los retirados aparecen al final de la clasificación. Un corte de red temporal conserva la sesión y las reglas de tiempo, permitiendo recuperarla.

Para probar en una misma máquina usa dos ventanas de incógnito o perfiles distintos. La sesión se conserva en `sessionStorage`, separada por pestaña. Tras un corte de red, Socket.IO intenta reconectar diez veces; **Recuperar mi sesión** en el menú online permite volver a intentarlo después de recargar. Los tokens de recuperación se entregan solo a su propietario y no aparecen en los estados públicos. No compartas tokens.

**El servidor de partidas está implementado y probado con clientes reales, pero no hay un backend público configurado para la edición de Pages.** Un enlace a `localhost` no permite que un amigo remoto entre. Para Internet despliega según la sección siguiente. En una LAN puedes usar la IP privada del ordenador servidor, permitiendo antes ese origen con `CLIENT_ORIGIN` y abriendo el puerto en el firewall.

## Recorridos y reglas

Tres recorridos de tres hoyos: Club del atardecer y Jardín lunar tienen par 11; Gran Parque tiene par 15 y canchas de 16 × 36 metros, frente a las originales de 12 × 24. Las bandas, rampas y obstáculos se definen una sola vez: el render y Rapier comparten dimensiones, rotaciones y movimiento. No hay paredes físicas invisibles más altas que las visibles.

| Recorrido          | Hoyo              | Diseño                                             | Par |
| ------------------ | ----------------- | -------------------------------------------------- | --- |
| Club del atardecer | Jardín de rebotes | Dos muros cruzados y pasos alternos                | 3   |
| Club del atardecer | La torre dorada   | Rampa y plataforma elevada con acceso dividido     | 4   |
| Club del atardecer | El péndulo        | Barrera giratoria y rutas laterales                | 4   |
| Jardín lunar       | Las diagonales    | Bandas oblicuas para cambiar los ángulos de rebote | 4   |
| Jardín lunar       | Doble compuerta   | Dos barreras que se deslizan en fases opuestas     | 3   |
| Jardín lunar       | Mirador lunar     | Banda diagonal antes de subir al objetivo elevado  | 4   |
| Gran Parque | La gran serpiente | Tres bandas alternadas, rutas laterales y tiros largos | 5 |
| Gran Parque | El corredor del viento | Compuertas opuestas con desvíos diagonales | 5 |
| Gran Parque | La última carambola | Bandas diagonales y péndulo antes del green | 5 |

- Un golpe por turno; cada pelota conserva su posición. Las pelotas rivales son fantasmas para evitar bloqueos.
- Menos golpes acumulados gana. Desempate por mayor número de hoyos en uno; si persiste, victoria compartida.
- El hoyo es una abertura circular real de un metro de diámetro y 0,85 m de profundidad. El césped triangulado, el borde, las paredes y el fondo comparten geometría física y visual. La gravedad hace caer la pelota; un golpe rápido puede cruzar el hueco. La puntuación se confirma después de caer bajo el borde y se conserva medio segundo de seguimiento antes de cambiar el turno. No se teletransporta la pelota al aproximarse.
- Máximo **12 golpes por hoyo**. Alcanzar el límite termina ese hoyo con 12; el resultado distingue el límite mediante el mensaje de partida.
- **45 segundos por turno**. Si expiran, se suma un golpe y se pasa al siguiente jugador, también cuando alguien está desconectado. Así una sesión abandonada puede terminar sin bloquear al resto.
- Fuera de límites: vuelve al punto anterior al golpe con un golpe adicional. La simulación limita cada movimiento a 18 segundos como protección contra bloqueos.
- La fricción, resistencia, gravedad, CCD y restitución se calculan en Rapier. El cliente interpola posiciones para suavizar los estados de red.
- Vista del campo o seguimiento suave en tercera persona de la pelota activa. Cámara adaptada al ancho de pantalla. No se lanza al mover la cámara: el golpe tiene un botón separado.
- Ajustes: volumen persistente, silencio e instrucciones de ratón, teclado y tacto. Sonidos sintetizados con Web Audio.

## Verificar

```sh
npm test
npm run build
# Una vez, si no hay Chromium del sistema:
npx playwright install chromium
npm run test:e2e
```

`npm test`: 24 pruebas de física, reglas, recuperación y cámara. Se completan los nueve hoyos desde las salidas, sin recolocar la pelota: 5/1/3 golpes en el club, 2/2/2 en el jardín lunar y 3/2/2 en Gran Parque. Se comprueba la caída real dentro del hoyo y que un golpe rápido puede pasar de largo. Además hay pruebas aisladas de detección de hoyo, pérdida de pelota, retiro, turnos futuros, selección de circuito, preparación, empates y almacenamiento corrupto/bloqueado.

`npm run test:e2e`: seis pruebas con Chromium y sockets reales. Cubren juego local, reconexión, selección de circuito sincronizada entre navegadores, retiro del anfitrión durante un golpe, salida/expulsión de invitados desconectados, revocación de sesiones, recuperación del anfitrión tras desconectarse todos, capacidad de ocho clientes (rechazo del noveno) y controles táctiles con datos de sesión corruptos. También comprueban la cámara del siguiente jugador, el cambio entre seguimiento y vista general, el minimapa y la entrada/salida de pantalla completa cuando el navegador la permite. Arranca automáticamente cliente y servidor. Usa `/usr/bin/chromium` si existe; si no, el Chromium instalado por Playwright. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite elegir otro ejecutable. Las capturas de revisión se guardan en `work/`, fuera del control de versiones.

`PAGES_BASE_PATH=/golf/ VITE_STATIC_HOST=true npm run build` seguido de `npm run test:pages` comprueba la edición estática publicada, bajo el prefijo real y sin fallback de rutas. Sus cuatro pruebas detectan 404 de scripts/fuentes, errores de JavaScript y fallos del golpe; bloquean una descarga para comprobar que la barra espera bytes reales y prueban la recuperación ante fallos del motor o del script inicial. Contra la URL pública solo se ejecuta la partida real; las tres inyecciones de fallo/espera se reservan al servidor de pruebas. `PUBLIC_GAME_URL` permite repetir esta comprobación contra la URL ya desplegada.

`npm run build`: comprobación TypeScript, cliente en `dist/` y servidor en `dist-server/`. La CI ejecuta los tres comandos. WebGL con renderizado por software permite automatizar estas comprobaciones; no sustituye pruebas de rendimiento en teléfonos físicos.

## Producción: cliente y servidor en un proceso

```sh
npm ci
npm run build
# Ajusta .env antes de arrancar:
# PORT=3001
# CLIENT_ORIGIN=https://golf.tudominio.com
npm start
```

Node sirve `dist/`, `/health` y Socket.IO. Publica detrás de un proxy con HTTPS y soporte para WebSocket y HTTP long polling. Configura el proxy para reenviar todos los paths al puerto 3001; permite conexiones de más de 60 segundos y upgrades WebSocket. `GET /health` devuelve `{"ok":true}`. El proceso debe permanecer activo: un hosting exclusivamente estático no ejecuta las salas.

Para separar cliente y servidor, configura `VITE_SERVER_URL=https://servidor.tudominio.com` **antes de compilar** y `CLIENT_ORIGIN=https://cliente.tudominio.com` en el servidor. `CLIENT_ORIGIN` admite varios orígenes exactos separados por coma. No contiene rutas ni barras finales. Las variables del cliente son públicas; no pongas secretos en `VITE_*`. Node carga `.env` en desarrollo y producción (reinicia el servidor al cambiarlo); Vite carga sus variables al iniciar/compilar.

### Variables

| Variable          | Uso                                       | Predeterminado          |
| ----------------- | ----------------------------------------- | ----------------------- |
| `PORT`            | Puerto del servidor                       | `3001`                  |
| `CLIENT_ORIGIN`   | Orígenes de navegador admitidos           | `http://localhost:5173` |
| `VITE_SERVER_URL` | Dirección Socket.IO; vacío = mismo origen | vacío                   |
| `MAX_PLAYERS`     | Capacidad online, limitada a 2–8          | `8`                     |

Las salas y sesiones son **efímeras y residen en memoria**; un reinicio del servidor las pierde. Las salas vacías caducan después de 15 minutos. No hay cuentas ni récords competitivos persistentes. Un límite de 200 salas y de mensajes por conexión protege esta primera versión, pero no reemplaza un proxy con límites de conexiones en un despliegue abierto. Usa una única réplica; varias instancias requieren direccionamiento estable por sala, almacenamiento/descubrimiento de salas y pruebas de carga antes de escalar. No hay despliegue automático desde la CI.

## Organización

- `shared/courses.ts`: definiciones reutilizables de hoyos, geometría, salidas y objetivos.
- `shared/game.ts`: reglas, clasificación, turnos y simulación Rapier común a local/servidor.
- `src/Scene.tsx`: representación 3D, cámara, materiales, obstáculos y pelotas interpoladas.
- `src/main.tsx`: flujos de inicio, conexión online, sesión local y controles.
- `src/GamePanels.tsx`: lobby, HUD de partida y resultados.
- `src/boot.ts`, `index.html` y el manifiesto generado por Vite: carga inicial por bytes y preparación real.
- `src/AppErrorBoundary.tsx`: recuperación ante errores de arranque.
- `src/camera.ts`, `src/useTurnPresentation.ts`, `src/useFullscreen.ts`, `src/HoleMap.tsx`: cámara, cambios de jugador, pantalla completa y minimapa.
- `.github/workflows/pages.yml`, `scripts/serve-pages.mjs`, `tests/pages/`: publicación y comprobación del juego compilado en su ruta pública.
- `src/CircuitPicker.tsx`: selección de recorrido compartida por los menús y el lobby.
- `src/storage.ts`: preferencias y sesiones tolerantes a datos corruptos o almacenamiento bloqueado.
- `src/audio.ts`, `src/style.css`: audio y presentación adaptable.
- `server/index.ts`: salas, invitaciones, sesiones, validación de mensajes y servidor HTTP.
- `tests/`: reglas y pruebas reales de navegador/red.

## Alcance de esta versión

Incluye tres recorridos de tres hoyos, selección local/online y revancha. La identidad Battle se apoya en rutas de riesgo, rebotes y ventanas de los obstáculos; **no incluye habilidades ni modificadores**. No hay cámara orbital libre, espectadores, salas públicas, persistencia de salas ni cuentas. El anfitrión puede quitar invitados desconectados del lobby; no puede expulsar rivales conectados en mitad de una partida. Se implementan rampas y barreras giratorias y deslizantes, pero todavía no túneles, agua, arena especial, plataformas móviles para transportar pelotas ni saltos independientes.

El rendimiento está limitado a un solo hoyo visible, DPR máximo 1.6, geometría sencilla, sombras de 1024 y una pelota física activa. Faltan pruebas manuales en dispositivos iOS/Android físicos y pruebas de carga de muchas salas. Los sonidos actuales cubren golpe, cambios de turno y embocada; no hay muestras específicas de cada rebote. La primera versión prioriza la partida completa y las salas reales.

La compilación avisa de los chunks grandes de Three.js y Rapier: el motor de físicas incluye su WASM. Están separados para caché; el servidor comprime los assets con gzip (aproximadamente 1.2 MB de JavaScript comprimido en total). Conviene mantener compresión y caché al desplegar.
