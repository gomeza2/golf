# Club del Último Golpe — Minigolf competitivo

Versión jugable de minigolf 3D competitivo, en español. React + TypeScript + Three.js/React Three Fiber; físicas Rapier; servidor Node + Socket.IO con simulación autoritativa. Geometría procedural y fuentes incluidas: no necesita cuentas, modelos remotos, claves ni base de datos.

## Jugar desde GitHub Pages

URL del proyecto: **https://gomeza2.github.io/golf/**. La publicación la realiza el workflow **Publish playable game** al actualizar `main`; su estado y la comprobación final de la URL están en GitHub Actions. La primera publicación debe terminar correctamente antes de que desaparezca un 404 anterior.

Pages sirve el juego local completo para 1–8 personas y las siete opciones de recorrido. No ejecuta Node ni las salas: si no hay un servidor público configurado, el botón online aparece desactivado con una explicación y una acción **Conectar un servidor**. Puedes escribir una URL HTTPS en el menú online sin recompilar. La URL se recuerda localmente y las invitaciones incluyen `server=` (nunca el token de recuperación). También puedes configurar `VITE_SERVER_URL` en GitHub y volver a publicar. Permite `https://gomeza2.github.io` en `CLIENT_ORIGIN` del servidor. Los códigos de sala no funcionan como sesiones online hasta que ese servidor esté disponible.

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

1. En el catálogo inicial elige recorrido y control de tiro. El modo local comienza con un jugador; puedes añadir hasta siete amigos. **Desafío Maestro** añade cinco hoyos largos; **Vuelta completa** reúne los 18 hoyos en una sola partida.
2. Pulsa **Jugar en este dispositivo**, introduce de 1 a 8 nombres y comienza. La cámara se coloca detrás de la pelota activa.
3. Antes de iniciar, elige uno de los tres controles del **mismo golpe normal**:
   - **Clásico** (predeterminado): flecha corta, deslizador de potencia y **GOLPEAR**. Arrastrar ajusta; soltar no dispara.
   - **Retroceso**: mantén en el campo, tira hacia atrás y suelta. Menos de 12 px cancela; solo el primer dedo controla el gesto.
   - **Precisión**: mantén y suelta en el instante elegido; fuerza y ángulo oscilan sin azar. Un toque inferior a 150 ms cancela.
     El control queda **fijo durante toda la ronda**, incluidas las pantallas entre hoyos y la revancha. Para cambiarlo vuelve a la preparación. Se guarda la preferencia local; el online siempre utiliza Clásico sin borrar esa preferencia. Escape, pérdida de foco, cambio de turno y cancelación táctil no gastan un golpe. Solo existe golpe normal: no hay selector ni API de golpe elevado.

4. Pasa el dispositivo al jugador indicado cuando la pelota se detenga.
5. Al completar cada hoyo consulta la tabla y pulsa **Siguiente hoyo**; al terminar, juega una revancha o pulsa **Elegir otro recorrido**.

La partida local no usa el servidor: sigue funcionando si este se apaga. Necesita haber cargado la aplicación; esta versión no incluye instalación PWA ni caché para una primera visita sin red.

### Online real

1. Abre **Jugar online**, escribe tu nombre, elige el recorrido y crea una sala.
2. Copia la invitación pulsando el código o comparte sus seis caracteres. Si usas un servidor externo, el enlace también lo identifica. La sala muestra la latencia medida por confirmaciones reales del servidor.
3. Desde otro navegador/dispositivo abre el enlace, pulsa **Jugar online**, introduce un nombre y entra con el código prellenado.
4. Todos pulsan **Estoy listo**. El anfitrión inicia cuando hay al menos dos jugadores conectados y preparados.
5. El servidor calcula cada trayectoria y puntuación, y envía estados 20 veces por segundo. Los navegadores solo envían dirección, potencia y tipo de golpe: los golpes fuera de turno, simultáneos, malformados o fuera de rango se rechazan.
6. El anfitrión avanza entre hoyos o inicia la revancha. Al terminar puede volver a la sala para cambiar de recorrido sin cambiar el código. Si se desconecta, el rol pasa a otro participante conectado; si todos perdieron la conexión, el primero que recupera una sesión toma el rol.

El anfitrión puede cambiar de recorrido en el lobby: todos deben marcarse preparados otra vez. Puede quitar invitados desconectados para liberar plazas. Al iniciar se excluyen los desconectados; sus sesiones ya no pueden incorporarse a esa partida. **Salir de la sala** libera inmediatamente la plaza y revoca la sesión. **Salir** durante el juego cuenta como retiro: 12 golpes en el hoyo no terminado y en los siguientes, sin más turnos para esa persona. Los retirados aparecen al final de la clasificación. Un corte de red temporal conserva la sesión y las reglas de tiempo, permitiendo recuperarla.

Para probar en una misma máquina usa dos ventanas de incógnito o perfiles distintos. La sesión se conserva en `sessionStorage`, separada por pestaña. Tras un corte de red, Socket.IO intenta reconectar diez veces; **Recuperar mi sesión** en el menú online permite volver a intentarlo después de recargar. Los tokens de recuperación se entregan solo a su propietario y no aparecen en los estados públicos. No compartas tokens.

**El servidor de partidas está implementado y probado con clientes reales, pero no hay un backend público configurado para la edición de Pages.** Un enlace a `localhost` no permite que un amigo remoto entre. Para Internet despliega según la sección siguiente. En una LAN puedes usar la IP privada del ordenador servidor, permitiendo antes ese origen con `CLIENT_ORIGIN` y abriendo el puerto en el firewall.

## Recorridos y reglas

**18 hoyos distintos y siete opciones de recorrido**. Club del atardecer y Jardín lunar tienen tres hoyos/par 11; Gran Parque, tres/par 15; Riviera Salvaje, cuatro/par 26; Desafío Maestro, cinco/par 31. **Vuelta completa** enlaza esos 18 hoyos en una única partida y clasificación (par 94). Las canchas crecen desde 12 × 24 m hasta 22 × 72 m. **Vuelta de 9** ofrece los primeros nueve hoyos, con par 37 y puntuación independiente. El catálogo no cuenta dos veces esos hoyos. Las bandas, rampas y obstáculos se definen una sola vez: el render y Rapier comparten dimensiones, rotaciones y movimiento. No hay paredes físicas invisibles más altas que las visibles.

| Recorrido          | Hoyo                   | Diseño                                                  | Par |
| ------------------ | ---------------------- | ------------------------------------------------------- | --- |
| Club del atardecer | Jardín de rebotes      | Dos muros cruzados y pasos alternos                     | 3   |
| Club del atardecer | La torre dorada        | Rampa y plataforma elevada con acceso dividido          | 4   |
| Club del atardecer | El péndulo             | Barrera giratoria y rutas laterales                     | 4   |
| Jardín lunar       | Las diagonales         | Bandas oblicuas para cambiar los ángulos de rebote      | 4   |
| Jardín lunar       | Doble compuerta        | Dos barreras que se deslizan en fases opuestas          | 3   |
| Jardín lunar       | Mirador lunar          | Banda diagonal antes de subir al objetivo elevado       | 4   |
| Gran Parque        | La gran serpiente      | Tres bandas alternadas, rutas laterales y tiros largos  | 5   |
| Gran Parque        | El corredor del viento | Compuertas opuestas con desvíos diagonales              | 5   |
| Gran Parque        | La última carambola    | Bandas diagonales y péndulo antes del green             | 5   |
| Riviera Salvaje    | Las dos orillas        | 48 m, puente seguro o salto de rampa sobre el canal     | 6   |
| Riviera Salvaje    | El acueducto           | 54 m, rampa a 3,6 m y puente estrecho con compuerta     | 6   |
| Riviera Salvaje    | Archipiélago           | 60 m, islas conectadas en S, arena y péndulo            | 7   |
| Riviera Salvaje    | La presa final         | 60 m, cresta, bajada lateral o salto sobre el embalse   | 7   |
| Desafío Maestro    | La costura             | 48 m, diagonales y arena de aproximación                | 5   |
| Desafío Maestro    | El ocho                | 54 m, bandas alternadas y péndulo                       | 6   |
| Desafío Maestro    | La terraza             | 60 m, subida y green elevado                            | 6   |
| Desafío Maestro    | Dos canales            | 66 m, puente izquierdo y puente derecho unidos por isla | 7   |
| Desafío Maestro    | El último aliento      | 72 m, colocación, arena y obstáculo giratorio           | 7   |

- Un golpe por turno; cada pelota conserva su posición. Las pelotas rivales son fantasmas para evitar bloqueos.
- Menos golpes acumulados gana. Desempate por mayor número de hoyos en uno; si persiste, victoria compartida.
- El hoyo es una abertura circular real de un metro de diámetro y 0,85 m de profundidad. El césped triangulado, el borde, las paredes y el fondo comparten geometría física y visual. La gravedad hace caer la pelota; un golpe rápido puede cruzar el hueco. La puntuación se confirma después de caer bajo el borde y se conserva medio segundo de seguimiento antes de cambiar el turno. No se teletransporta la pelota al aproximarse.
- Máximo **12 golpes por hoyo**. Alcanzar el límite termina ese hoyo con 12; el resultado distingue el límite mediante el mensaje de partida.
- **45 segundos por turno**. Si expiran, se suma un golpe y se pasa al siguiente jugador, también cuando alguien está desconectado. Así una sesión abandonada puede terminar sin bloquear al resto.
- **Agua**: al tocarla, se suma un golpe y se vuelve al punto anterior. Pasar por encima en el aire o sobre un puente no penaliza. Las zonas tienen geometría seca real: no existe suelo invisible bajo el agua.
- **Superficies**: césped, césped alto (rough), tierra y arena aplican resistencias crecientes de 0,016 / 0,04 / 0,055 / 0,085 por paso. La resistencia se aplica a la velocidad tangente al suelo, también en pendientes, y no a superficies que estén por debajo de un puente. Las bandas curvas visibles usan segmentos con colisión compartida con el motor.
- Fuera de límites: vuelve al punto anterior al golpe con un golpe adicional. La simulación limita cada movimiento a 18 segundos como protección contra bloqueos.
- El motor comparte pasos fijos de 60 Hz y acumula intervalos variables, tanto en cliente como en servidor. Limita la recuperación tras pausas largas a 250 ms para evitar bloqueos. Una pelota esperando sobre una rampa conserva su posición hasta el golpe; la resistencia solo se aplica cuando hay suelo debajo.
- La elasticidad se separa por material: **césped y rampas 0; bandas 0,52; copa 0,08; pelota 0**, con combinación máxima. El suelo absorbe el aterrizaje; las bandas reflejan con pérdida de energía. No se usa elasticidad de pared en el suelo. Se comprueba con caídas, rebotes medidos y tiros cortos que paran en menos de tres segundos.
- El golpe normal tiene **velocidad máxima 15,2**, velocidad vertical inicial **0** y una guía de **1,2–2,4 m**. No se dibujan arcos, posiciones finales ni rebotes previstos. Las rampas y colisiones pueden elevar naturalmente la pelota; un límite de velocidad total 18 evita transferencias desmedidas de obstáculos móviles.
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

`npm test`: 59 pruebas de reglas, física, recorridos, superficies, controles, guardado y cámara. Se completan las rondas de 18 y 9 hoyos desde sus salidas con el golpe normal, sin recolocar la pelota ni recurrir a penalizaciones. También se comprueban lanzamiento vertical cero, potencia máxima, guía corta, aterrizajes, pérdida de energía, pendientes, cuatro superficies, banda curva, copa, límites y validez de los récords. Las rutas se recalibraron para la velocidad reducida y la corrección de aristas internas del green. También se prueban salida por honores, empates y retiros.

`npm run test:e2e`: 17 casos con Chromium y sockets reales: controles de escritorio/tacto, cancelación y multidedo, preferencia antes de iniciar y bloqueo de cambios durante la ronda, modo online forzado a Clásico, panel compacto, indicador lateral, nombres persistentes, rechazo de golpes elevados, permisos/reconexión/capacidad de salas, cámara y partida solo completa con récord persistente tras recargar. Arranca automáticamente cliente y servidor. Usa `/usr/bin/chromium` si existe o el navegador de Playwright; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite elegirlo. Las capturas se guardan en `work/`.

`PAGES_BASE_PATH=/golf/ VITE_STATIC_HOST=true npm run build` seguido de `npm run test:pages` comprueba la compilación estática para publicar, bajo el prefijo real y sin fallback de rutas. Sus cuatro pruebas detectan 404 de scripts/fuentes, errores de JavaScript y fallos del golpe; bloquean una descarga para comprobar que la barra espera bytes reales y prueban la recuperación ante fallos del motor o del script inicial. Contra la URL pública solo se ejecuta la partida real; las tres inyecciones de fallo/espera se reservan al servidor de pruebas. `PUBLIC_GAME_URL` permite repetir esta comprobación contra la URL ya desplegada.

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

Node sirve `dist/`, `/health` y Socket.IO. Publica detrás de un proxy con HTTPS y soporte para WebSocket y HTTP long polling. Configura el proxy para reenviar todos los paths al puerto 3001; permite conexiones de más de 60 segundos y upgrades WebSocket. `GET /health` devuelve estado, protocolo (5), número de salas y capacidad. El cliente rechaza servidores de protocolos anteriores para evitar reglas incompatibles. El proceso debe permanecer activo: un hosting exclusivamente estático no ejecuta las salas.

Para separar cliente y servidor, configura `VITE_SERVER_URL=https://servidor.tudominio.com` **antes de compilar** y `CLIENT_ORIGIN=https://cliente.tudominio.com` en el servidor. `CLIENT_ORIGIN` admite varios orígenes exactos separados por coma. No contiene rutas ni barras finales. Las variables del cliente son públicas; no pongas secretos en `VITE_*`. Node carga `.env` en desarrollo y producción (reinicia el servidor al cambiarlo); Vite carga sus variables al iniciar/compilar.

### Variables

| Variable          | Uso                                       | Predeterminado          |
| ----------------- | ----------------------------------------- | ----------------------- |
| `PORT`            | Puerto del servidor                       | `3001`                  |
| `CLIENT_ORIGIN`   | Orígenes de navegador admitidos           | `http://localhost:5173` |
| `VITE_SERVER_URL` | Dirección Socket.IO; vacío = mismo origen | vacío                   |
| `MAX_PLAYERS`     | Capacidad online, limitada a 2–8          | `8`                     |

Las salas y sesiones son **efímeras y residen en memoria**; un reinicio del servidor las pierde. Las salas vacías caducan después de 15 minutos. No hay cuentas ni récords online persistentes. Los récords personales del modo solo se guardan en el navegador. Un límite de 200 salas y de mensajes por conexión protege esta primera versión, pero no reemplaza un proxy con límites de conexiones en un despliegue abierto. Usa una única réplica; varias instancias requieren direccionamiento estable por sala, almacenamiento/descubrimiento de salas y pruebas de carga antes de escalar. La CI publica el cliente de Pages; el backend requiere un servicio persistente externo.

## Organización

- `shared/courses.ts`: definiciones reutilizables de hoyos, geometría, salidas y objetivos.
- `src/ClubCatalog.tsx`, `src/ShotModePicker.tsx`: catálogo inicial conjunto de recorridos, controles y partida.
- `src/shotControls.ts`, `src/useShotControls.ts`: gestos, potencia de arrastre, oscilación de Precisión y cancelación segura.
- `shared/shot.ts`, `shared/timing.ts`: velocidades de golpe, guía corta de dirección y temporización física.
- `src/CourseEffects.tsx`: césped procedural, agua animada y efectos de impactos.
- `src/serverUrl.ts`: validación de orígenes y conexiones externas.
- `Dockerfile`, `render.yaml`: despliegue del servidor y del cliente juntos.
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

Incluye siete opciones de recorrido (18 hoyos distintos, con vuelta completa), selección local/online y revancha. La identidad Battle se apoya en rutas de riesgo, rebotes y ventanas de los obstáculos; **no incluye habilidades ni modificadores**. No hay cámara orbital libre, espectadores, salas públicas, persistencia de salas ni cuentas. El anfitrión puede quitar invitados desconectados del lobby; no puede expulsar rivales conectados en mitad de una partida. Se implementan rampas y barreras giratorias y deslizantes, además de agua con penalización, arena, puentes y saltos producidos por el terreno. Faltan túneles y plataformas que transporten pelotas.

El rendimiento está limitado a un solo hoyo visible, DPR máximo 1.6, geometría sencilla, sombras de 1024 y una pelota física activa. Faltan pruebas manuales en dispositivos iOS/Android físicos y pruebas de carga de muchas salas. Hay sonidos sintetizados de golpe, rebote, agua, cambios de turno y embocada, con anillos de impacto. El césped utiliza una textura procedural local y el agua una animación ligera. La primera versión prioriza la partida completa y las salas reales.

La compilación avisa de los chunks grandes de Three.js y Rapier: el motor de físicas incluye su WASM. Están separados para caché; el servidor comprime los assets con gzip (aproximadamente 1.2 MB de JavaScript comprimido en total). Conviene mantener compresión y caché al desplegar.

## Despliegue del online por Internet

El servidor está implementado y las salas se prueban con clientes reales. **Este repositorio no incluye una cuenta de hosting ni un servidor público ya contratado/configurado.** Pages no ejecuta Node.

### Render (configuración preparada)

1. Crea un Blueprint en Render conectado a `gomeza2/golf`: detectará `render.yaml`.
2. Configura `CLIENT_ORIGIN=https://gomeza2.github.io,https://NOMBRE-REAL.onrender.com` usando la URL real asignada al servicio. El propio origen del servidor también está permitido automáticamente.
3. Render instala, compila, arranca Node y comprueba `/health`. El plan gratuito puede dormir: el primer acceso tardará en reactivarlo; para partidas continuas usa un servicio que permanezca activo.
4. En Pages, abre **Conectar un servidor**, pega la URL HTTPS de Render y crea la sala. Comparte el enlace generado, que incluye el servidor. Alternativamente configura `VITE_SERVER_URL` en GitHub y vuelve a publicar.
5. Comprueba una sala desde dos dispositivos/redes distintas antes de considerar validado el acceso público.

### Contenedor o VPS

```sh
docker build -t club-golf .
docker run --rm -p 3001:3001 -e CLIENT_ORIGIN=https://gomeza2.github.io club-golf
```

El contenedor usa Node 22, usuario sin privilegios y `/health`. La receta del contenedor se conserva; las pruebas de esta versión ejecutan el servidor Node con clientes reales y rechazan los intentos de golpe elevado. Publica el puerto detrás de HTTPS con WebSocket. Las salas requieren una réplica persistente; un reinicio pierde las sesiones en memoria. Las claves no se incluyen en imagen ni repositorio.

## Avance por fases

- Base y partidas locales: implementadas, con 18 hoyos, clasificación y revancha.
- Multijugador: salas privadas autoritativas, 2–8 clientes, reconexión, latencia, invitación con servidor y controles de versión. **Pendiente: disponer de hosting persistente y comprobarlo por Internet.**
- Experiencia visual y controles: cámara de seguimiento, carga real, césped procedural, agua animada, impactos, guía corta de dirección, Clásico, Retroceso y Precisión.
- Variedad: rampas, puentes, canales, islas, arena, barreras móviles y elecciones entre ruta segura y salto.
- Pulido: pruebas automáticas de los 18 hoyos y casos de red; pendientes pruebas de rendimiento en teléfonos físicos, carga de muchas salas y mecánicas Battle adicionales.

## Récords y objetivos de un jugador

Se guardan por recorrido, control y versión de reglas (`club-personal-normal-v5`), separados de versiones anteriores. Solo califican rondas completas de un jugador con puntuaciones válidas, sin retiro ni hoyos terminados por límite. El asterisco en la tabla identifica los límites; embocar realmente en el golpe 12 sigue siendo válido. Las penalizaciones normales cuentan en la puntuación.

Se conservan la mejor marca, rondas válidas y objetivos conseguidos: terminar, igualar/bajar del par, terminar sin penalizaciones, dominar Precisión y completar las vueltas de 9 o 18. Los objetivos provienen del resultado real, no de acciones ficticias. Una marca peor no reemplaza la mejor. Los datos corruptos/antiguos se ignoran. Si el navegador bloquea el almacenamiento, la pantalla indica que la marca solo dura esta sesión.

## Estado por fases

El detalle de implementación, pruebas y pendientes está en [EVOLUTION.md](EVOLUTION.md). La base normal se verificó antes de avanzar a controles; después se verificaron terrenos y registros; por último se recalibraron y probaron todos los hoyos. El refinamiento continuo sigue abierto: faltan sesiones prolongadas en teléfonos físicos, medidas de muchas salas y recoger experiencia real de jugadores. El backend público requiere hosting externo; no se presenta como desplegado.

### Últimos ajustes de jugabilidad

El panel de tiro se abre compacto. «Más ajustes» despliega el giro fino y las potencias rápidas; se repliega al tirar o cambiar de jugador. El indicador de turno y la transición se sitúan al lateral. Los nombres se pueden editar antes de empezar y se conservan al iniciar una partida.

La salida del siguiente hoyo corresponde a la menor puntuación del anterior. El resto sale también en ese orden; los empates conservan los honores previos y los retirados se omiten. Una revancha reinicia el orden de inscripción.

El green utiliza `TriMeshFlags.FIX_INTERNAL_EDGES`: evita contactos falsos en las aristas compartidas del suelo plano. Se conserva el rebote físico de las bandas y la elevación natural de rampas; el lanzamiento siempre parte con velocidad vertical cero.

### Pistas y cámara — reglas v5

Pulsa **Mirar** para explorar: arrastra con ratón o tacto, o usa los botones de giro, altura y acercamiento. El tiro queda bloqueado durante la inspección; **Volver a apuntar** restaura la cámara y conserva dirección y potencia. El seguimiento normal de la pelota continúa durante el juego.

La copa tiene aro e interior gris, caída visible y mástil centrado con colisión. La flecha gana grosor, contraste y marcas cortas sin predecir posiciones finales. Se suavizan las esquinas de los obstáculos, se cierran rendijas laterales accidentales y se corrige la unión de la rampa de entrenamiento. Los tres primeros hoyos reciben trazados revisados; todos los campos comparten las mejoras de presentación, copa y bordes.

El suplemento de potencia solo actúa por encima del 80 %: `velocidad = 14p + 1,2 × max(0, (p−0,8)/0,2)²`. El 100 % es un 8,6 % más rápido; se mantienen los golpes finos y el lanzamiento vertical cero. El servidor y el cliente usan protocolo 5 y los récords separan esta versión de las reglas anteriores.

Consulta [RESEARCH.md](RESEARCH.md) para las fuentes primarias, decisiones y límites de la investigación.
