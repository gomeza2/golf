# Mini Golf Battle — Club del atardecer

Primera versión jugable de minigolf 3D competitivo, en español. React + TypeScript + Three.js/React Three Fiber; físicas Rapier; servidor Node + Socket.IO con simulación autoritativa. Geometría procedural y fuentes incluidas: no necesita cuentas, modelos remotos, claves ni base de datos.

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
2. Comienza el recorrido. Apunta tocando/haciendo clic en el campo o con el deslizador de ángulo.
3. Ajusta la potencia y pulsa **GOLPEAR**. Flechas izquierda/derecha ajustan el ángulo; arriba/abajo, la fuerza; espacio lanza cuando el foco no está en un control.
4. Pasa el dispositivo al jugador indicado cuando la pelota se detenga.
5. Al completar cada hoyo consulta la tabla y pulsa **Siguiente hoyo**; al terminar, juega una revancha.

La partida local no usa el servidor: sigue funcionando si este se apaga. Necesita haber cargado la aplicación; esta versión no incluye instalación PWA ni caché para una primera visita sin red.

### Online real

1. Abre **Jugar online**, escribe tu nombre y crea una sala.
2. Copia la invitación pulsando el código o comparte sus seis caracteres.
3. Desde otro navegador/dispositivo abre el enlace, pulsa **Jugar online**, introduce un nombre y entra con el código prellenado.
4. Todos pulsan **Estoy listo**. El anfitrión inicia cuando hay al menos dos jugadores conectados y preparados.
5. El servidor calcula cada trayectoria y puntuación, y envía estados 20 veces por segundo. Los navegadores solo envían dirección y potencia: los golpes fuera de turno, simultáneos, malformados o fuera de rango se rechazan.
6. El anfitrión avanza entre hoyos o inicia la revancha. Si se desconecta, el rol pasa a otro participante conectado.

Para probar en una misma máquina usa dos ventanas de incógnito o perfiles distintos. La sesión se conserva en `sessionStorage`, separada por pestaña. Tras un corte de red, Socket.IO intenta reconectar diez veces; **Recuperar mi sesión** en el menú online permite volver a intentarlo después de recargar. Los tokens de recuperación se entregan solo a su propietario y no aparecen en los estados públicos. No compartas tokens.

**El servidor está implementado y probado con clientes locales reales; no se ha desplegado ni verificado un servicio público en Internet.** Un enlace a `localhost` no permite que un amigo remoto entre. Para Internet despliega según la sección siguiente. En una LAN puedes usar la IP privada del ordenador servidor, permitiendo antes ese origen con `CLIENT_ORIGIN` y abriendo el puerto en el firewall.

## Recorrido y reglas

| Hoyo              | Diseño                                                            | Par |
| ----------------- | ----------------------------------------------------------------- | --- |
| Jardín de rebotes | Dos muros cruzados y pasos alternos; control de ángulos y rebotes | 3   |
| La torre dorada   | Rampa física, plataforma elevada y muro que divide la llegada     | 4   |
| El péndulo        | Barrera giratoria con collider cinemático y rutas laterales       | 4   |

- Un golpe por turno; cada pelota conserva su posición. Las pelotas rivales son fantasmas para evitar bloqueos.
- Menos golpes acumulados gana. Desempate por mayor número de hoyos en uno; si persiste, victoria compartida.
- Para embocar hay que pasar cerca del centro a velocidad moderada y a la altura del hoyo.
- Máximo **12 golpes por hoyo**. Alcanzar el límite termina ese hoyo con 12; el resultado distingue el límite mediante el mensaje de partida.
- **45 segundos por turno**. Si expiran, se suma un golpe y se pasa al siguiente jugador, también cuando alguien está desconectado. Así una sesión abandonada puede terminar sin bloquear al resto.
- Fuera de límites: vuelve al punto anterior al golpe con un golpe adicional. La simulación limita cada movimiento a 18 segundos como protección contra bloqueos.
- La fricción, resistencia, gravedad, CCD y restitución se calculan en Rapier. El cliente interpola posiciones para suavizar los estados de red.
- Vista del campo o seguimiento suave de pelota. Cámara adaptada al ancho de pantalla. No se lanza al mover la cámara: el golpe tiene un botón separado.
- Ajustes: volumen persistente, silencio e instrucciones de ratón, teclado y tacto. Sonidos sintetizados con Web Audio.

## Verificar

```sh
npm test
npm run build
# Una vez, si no hay Chromium del sistema:
npx playwright install chromium
npm run test:e2e
```

`npm test`: nueve pruebas de validación de golpes, rebotes, ascenso de rampa, embocadas y recorrido completo, recuperación fuera de campo, desconexiones/límite de golpes, clasificación y obstáculo móvil. Una prueba de recorrido completo juega desde las salidas, sin recolocar pelotas, y emboca los tres hoyos en 5, 1 y 4 golpes. Además, las pruebas aisladas de detección de hoyo colocan explícitamente las pelotas junto al objetivo para verificar esa regla.

`npm run test:e2e`: tres pruebas con Chromium real: golpe y cambio de turno local con comprobación de pantalla móvil; dos clientes Socket.IO con rechazo fuera de turno y recuperación de sesión; dos contextos de navegador creando y jugando una sala. Arranca automáticamente cliente y servidor. Usa `/usr/bin/chromium` si existe; si no, el Chromium instalado por Playwright. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite elegir otro ejecutable. Las capturas de revisión se guardan en `work/`, fuera del control de versiones.

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

Para separar cliente y servidor, configura `VITE_SERVER_URL=https://servidor.tudominio.com` **antes de compilar** y `CLIENT_ORIGIN=https://cliente.tudominio.com` en el servidor. `CLIENT_ORIGIN` admite varios orígenes exactos separados por coma. No contiene rutas ni barras finales. Las variables del cliente son públicas; no pongas secretos en `VITE_*`. Node carga `.env` en desarrollo y producción; Vite carga sus variables al iniciar/compilar.

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
- `src/audio.ts`, `src/style.css`: audio y presentación adaptable.
- `server/index.ts`: salas, invitaciones, sesiones, validación de mensajes y servidor HTTP.
- `tests/`: reglas y pruebas reales de navegador/red.

## Alcance de esta versión

Incluye un circuito de tres hoyos y su revancha. La identidad Battle se apoya en rutas de riesgo, rebotes y ventanas del obstáculo; **no incluye habilidades ni modificadores**. Tampoco incluye selector entre varios mundos, cámara orbital libre, espectadores, salas públicas, expulsión del lobby, persistencia de salas o cuentas. La torre tiene rampa y desnivel; no se han implementado túneles, agua, arena especial, plataformas móviles ni saltos independientes. Son extensiones futuras del núcleo, no botones simulados.

El rendimiento está limitado a un solo hoyo visible, DPR máximo 1.6, geometría sencilla, sombras de 1024 y una pelota física activa. Faltan pruebas manuales en dispositivos iOS/Android físicos y pruebas de carga de muchas salas. Los sonidos actuales cubren golpe, cambios de turno y embocada; no hay muestras específicas de cada rebote. La primera versión prioriza la partida completa y las salas reales.

La compilación avisa de los chunks grandes de Three.js y Rapier: el motor de físicas incluye su WASM. Están separados para caché; el servidor comprime los assets con gzip (aproximadamente 1.2 MB de JavaScript comprimido en total). Conviene mantener compresión y caché al desplegar.
