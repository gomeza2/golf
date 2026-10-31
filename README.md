# Hoyo en Uno · Golf Club — Minigolf competitivo

Versión **0.6.0** de minigolf 3D competitivo, en español. React + TypeScript + Three.js/React Three Fiber; físicas Rapier; servidor Node + Socket.IO con simulación autoritativa. Geometría procedural y fuentes incluidas: no necesita cuentas, modelos remotos, claves ni base de datos.

## Jugar desde GitHub Pages

URL del proyecto: **https://gomeza2.github.io/golf/**. La publicación la realiza el workflow **Publish playable game** al actualizar `main`; su estado y la comprobación final de la URL están en GitHub Actions. La primera publicación debe terminar correctamente antes de que desaparezca un 404 anterior.

Pages sirve el juego local completo para 1–8 personas y las ocho opciones de recorrido. No ejecuta Node ni las salas: si no hay un servidor público configurado, el botón online aparece desactivado con una explicación y una acción **Conectar un servidor**. Puedes escribir una URL HTTPS en el menú online sin recompilar. La URL se recuerda localmente y las invitaciones incluyen `server=` (nunca el token de recuperación). También puedes configurar `VITE_SERVER_URL` en GitHub y volver a publicar. Permite `https://gomeza2.github.io` en `CLIENT_ORIGIN` del servidor. Los códigos de sala no funcionan como sesiones online hasta que ese servidor esté disponible.

El workflow compila con la ruta `/golf/`, comprueba en Chromium que todos los assets cargan y se puede golpear, publica `dist/` y repite la prueba contra la URL desplegada. Publica sobre el sitio Pages existente desde `main`, con `pages: write` e `id-token: write`; no necesita modificar sus ajustes administrativos. Como recomienda GitHub, seleccionar **Settings → Pages → Source: GitHub Actions** evita que además se ejecute el publicador Jekyll heredado. Si un fork todavía no tiene Pages habilitado, su propietario debe activarlo una vez en **Settings → Pages → Source: GitHub Actions**.

## Presentación y cámara

El juego se llama **Hoyo en Uno · Golf Club**. La URL del repositorio se conserva para no romper enlaces.

- La pantalla inicial aparece antes de cargar React/Three/Rapier. El manifiesto de compilación enumera los archivos y sus tamaños; la barra muestra los bytes realmente recibidos hasta el 90%. El resto corresponde a la inicialización de Rapier y al primer fotograma 3D con las fuentes preparadas. No se rellena con un temporizador.
- Si la red se atasca se muestra un aviso; si falla una descarga o el arranque, aparece una acción para reintentar. La preparación tiene un límite de dos minutos para no quedar esperando indefinidamente.
- Durante la partida se utiliza todo el viewport, con cámara en tercera persona detrás de la pelota activa. Sigue su posición completa y mantiene la dirección del golpe durante el movimiento para evitar giros bruscos en los rebotes.
- Al pasar el turno, la cámara conserva brevemente el final del golpe y se desplaza al siguiente jugador. Se muestra su nombre y se bloquea el golpe durante esa transición. En local también se pausa el reloj durante la presentación; online el servidor mantiene su tiempo autoritativo.
- **Ver campo** conserva la vista general. **Mapa** despliega una vista cenital con paredes, obstáculos móviles y pelotas reales. **Pantalla completa** utiliza la API del navegador si está disponible; al salir de la partida se abandona también ese modo.

### Calidad visual y fluidez

En **Ajustes → Calidad visual** elige:

- **Automática** (predeterminada): observa intervalos reales entre fotogramas. Espera dos segundos al arrancar; baja un nivel después de dos ventanas lentas de dos segundos (menos de 40 FPS). Para subir exige cuatro ventanas estables por encima de 56 FPS. Entre cambios espera seis segundos para evitar oscilaciones. No usa el reloj ni la puntuación de la partida.
- **Ahorro**: resolución interna de hasta 0,8 veces el tamaño CSS y sin sombras dinámicas. La interfaz conserva su nitidez y tamaño.
- **Alta**: resolución de hasta 2 veces el tamaño CSS, limitada por la densidad real de la pantalla, y sombras de 2048. Puede exigir más batería y potencia gráfica.

La opción automática usa tres niveles: resolución 0,8 / 1,2 / 1,6 y sombras desactivadas / 512 / 1024. El nivel inferior dibuja un cuarto de los píxeles del superior en pantallas de densidad suficiente; eso mide el tamaño del buffer, **no una mejora garantizada de FPS**. Las sombras se encuadran según el tamaño de la pista para cubrir también los hoyos largos.

La preferencia se conserva en `golf-graphics-mode`. Puede cambiarse durante la partida desde ajustes; el control de tiro sigue bloqueado como antes. Cambiar calidad conserva la simulación, el guardado y los récords de reglas v7. En segundo plano se suspende el bucle de dibujo; al volver se reinicia la observación del rendimiento para no interpretar la ausencia de fotogramas como lentitud. En online el servidor mantiene el partido y su reloj.

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

### Duelo por puntos · Stableford local

En **Jugar en este dispositivo**, añade de 2 a 8 jugadores y elige **Duelo por puntos** antes de comenzar. El formato queda fijo durante la ronda y la revancha. Para cambiarlo vuelve a la preparación. **Menos golpes** sigue siendo la opción predeterminada y el modo individual; el entrenamiento también utiliza golpes.

- Cada hoyo completado otorga `máximo(0, 2 + par − golpes)`: bogey 1, par 2, birdie 3, eagle 4 y albatros 5. Doble bogey o peor suma 0. Un hoyo en uno puntúa según el par, sin un premio añadido: en par 3 suma 4; en par 5, 6.
- Gana quien acumule **más puntos**. Los empates se resuelven por más hoyos en uno; si persisten, la victoria se comparte. Un hoyo malo puede quedar en cero y el siguiente permite remontar.
- Los golpes, el agua, el tiempo y el límite de 12 se siguen contabilizando. El límite concede cero puntos. No se conceden puntos provisionales a pelotas en movimiento: la clasificación muestra solo hoyos completados, incluido el jugador que ya embocó mientras sus rivales siguen en el hoyo.
- Los honores se conservan como en golf: sale primero quien hizo menos golpes en el hoyo anterior, aunque varios jugadores hayan quedado en cero puntos. Los empates mantienen el orden anterior.
- La tarjeta muestra puntos, golpes reales y el par de cada hoyo. Los avisos de embocada añaden los puntos ganados. La revancha conserva el formato.
- El guardado local conserva el duelo, los puntos confirmados, los nombres y el turno. Los guardados clásicos anteriores siguen siendo compatibles. Las rondas por puntos no se mezclan con récords individuales de golpes ni con medallas de entrenamiento.
- **Este formato es local.** El online sigue usando menos golpes y control Clásico: el servidor no acepta cambiarlo mediante campos enviados por el cliente. Los protocolos y marcas de reglas v7 se conservan porque no cambian los golpes ni las físicas.

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

### Guardar y recuperar una partida local

- La ronda o práctica local se guarda automáticamente cada segundo, al cambiar de turno/hoyo, al lanzar/detenerse la pelota, al pasar a segundo plano y al salir al club. En la portada aparece **Reanudar partida** con recorrido, jugadores, hoyo y control.
- También se recupera después de recargar o cerrar el navegador, desde el mismo navegador y origen, si conserva su almacenamiento. Se abre **en pausa**: pulsa **Continuar partida** cuando estés preparado. El reloj no descuenta el tiempo que estuvo cerrada.
- Se conserva el mundo de Rapier completo, incluidas velocidad, contactos, compuertas, turno, resultados, último punto antes del tiro y fase de caída en la copa. Un golpe interrumpido continúa; no se vuelve a lanzar ni se cobra dos veces.
- Solo hay **un guardado local en curso** por navegador/origen. Empezar otra partida local o práctica lo sustituye; terminar una partida lo elimina. **Descartar guardado** no borra nombres, preferencias ni récords. Varias pestañas locales comparten ese único espacio; usa una sola para continuar tu ronda.
- El formato comprueba reglas, datos, integridad y versión del motor. Un archivo incompatible o dañado ofrece descarte, sin intentar arrancar una simulación incompleta. Si el navegador bloquea el almacenamiento o agota la cuota, la pausa avisa: se puede seguir jugando, pero cerrar la pestaña puede perder el progreso.
- Este archivo es exclusivamente local y no sirve para enviar resultados ni recuperar salas online. Esas sesiones siguen dependiendo del servidor. Tampoco instala una PWA ni conserva los archivos de la web para una primera visita sin red.
- Un cierre forzado que impida ejecutar los eventos del navegador puede perder el último intervalo de hasta aproximadamente un segundo. Los récords completos y las medallas siguen usando sus claves independientes de reglas v7; esta entrega no altera las físicas ni invalida esas marcas.

## Recorridos y reglas

**21 hoyos distintos y ocho opciones de recorrido**. **Club del As** incorpora tres pistas con agua, un puente diagonal, carambola y compuerta. Los tres permiten un hoyo en uno comprobado con las físicas reales; también se verifica una vuelta completa sin penalizaciones. Las rondas de 9/18 conservan sus hoyos originales. Club del atardecer y Jardín lunar tienen tres hoyos/par 11; Gran Parque, tres/par 15; Riviera Salvaje, cuatro/par 26; Desafío Maestro, cinco/par 31. **Vuelta completa** enlaza esos 18 hoyos en una única partida y clasificación (par 94). Las canchas crecen desde 12 × 24 m hasta 22 × 72 m. **Vuelta de 9** ofrece los primeros nueve hoyos, con par 37 y puntuación independiente. El catálogo no cuenta dos veces esos hoyos. Las bandas, rampas y obstáculos se definen una sola vez: el render y Rapier comparten dimensiones, rotaciones y movimiento. No hay paredes físicas invisibles más altas que las visibles.

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
| Club del As        | La aguja               | 30 m, puente diagonal estrecho y pasarela alternativa   | 3   |
| Club del As        | La firma de la banda   | Carambola derecha para el as y aproximación izquierda   | 3   |
| Club del As        | La ventana del faro    | Compuerta deslizante, arena y tiro de precisión         | 3   |

- Un golpe por turno; cada pelota conserva su posición. Las pelotas rivales son fantasmas para evitar bloqueos.
- Menos golpes acumulados gana. Desempate por mayor número de hoyos en uno; si persiste, victoria compartida.
- El hoyo es una abertura circular real de un metro de diámetro y 0,85 m de profundidad. El césped triangulado, el borde, las paredes y el fondo comparten geometría física y visual. La gravedad hace caer la pelota; un golpe rápido puede cruzar el hueco. La puntuación se confirma después de caer bajo el borde y se conserva medio segundo de seguimiento antes de cambiar el turno. No se teletransporta la pelota al aproximarse.
- Máximo **12 golpes por hoyo**. Alcanzar el límite termina ese hoyo con 12; el resultado distingue el límite mediante el mensaje de partida.
- **30 segundos por turno**. Si expiran, se suma un golpe y se pasa al siguiente jugador, también cuando alguien está desconectado. Así una sesión abandonada puede terminar sin bloquear al resto.
- **Agua**: al tocarla, se suma un golpe y se vuelve al punto anterior. Pasar por encima en el aire o sobre un puente no penaliza. Las zonas tienen geometría seca real: no existe suelo invisible bajo el agua.
- **Superficies**: césped, césped alto (rough), tierra y arena aplican resistencias crecientes de 0,016 / 0,04 / 0,055 / 0,085 por paso. La resistencia se aplica a la velocidad tangente al suelo, también en pendientes, y no a superficies que estén por debajo de un puente. Las bandas curvas visibles usan segmentos con colisión compartida con el motor.
- Fuera de límites: vuelve al punto anterior al golpe con un golpe adicional. La simulación limita cada movimiento a 18 segundos como protección contra bloqueos.
- El motor comparte pasos fijos de 60 Hz y acumula intervalos variables, tanto en cliente como en servidor. Limita la recuperación tras pausas largas a 250 ms para evitar bloqueos. Una pelota esperando sobre una rampa conserva su posición hasta el golpe; la resistencia solo se aplica cuando hay suelo debajo.
- La elasticidad se separa por material: **césped y rampas 0; bandas 0,52; copa 0,08; pelota 0**, con combinación máxima. El suelo absorbe el aterrizaje; las bandas reflejan con pérdida de energía. No se usa elasticidad de pared en el suelo. Se comprueba con caídas, rebotes medidos y tiros cortos que paran en menos de tres segundos.
- El golpe normal tiene **velocidad máxima 16,2**, velocidad vertical inicial **0** y una guía de **1,2–2,4 m**. No se dibujan arcos, posiciones finales ni rebotes previstos. Las rampas y colisiones pueden elevar naturalmente la pelota; un límite de velocidad total 18 evita transferencias desmedidas de obstáculos móviles.
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

`npm test`: 112 pruebas de reglas, física, recorridos, superficies, controles, guardado y cámara. Se completan las rondas de 18 y 9 hoyos desde sus salidas con el golpe normal, sin recolocar la pelota ni recurrir a penalizaciones. También se comprueban lanzamiento vertical cero, potencia máxima, guía corta, aterrizajes, pérdida de energía, pendientes, cuatro superficies, banda curva, copa, límites y validez de los récords. Las rutas se recalibraron para la velocidad reducida y la corrección de aristas internas del green. También se prueban salida por honores, empates y retiros. Diez pruebas de recuperación comparan fotograma a fotograma tiros interrumpidos, colisiones, compuertas, caída en copa, agua, rondas completas y datos dañados.

`npm run test:e2e`: 34 casos con Chromium y sockets reales: controles de escritorio/tacto, cancelación y multidedo, preferencia antes de iniciar y bloqueo de cambios durante la ronda, modo online forzado a Clásico, panel compacto, indicador lateral, nombres persistentes, rechazo de golpes elevados, permisos/reconexión/capacidad de salas, cámara y partida solo completa con récord persistente tras recargar. Arranca automáticamente cliente y servidor. Usa `/usr/bin/chromium` si existe o el navegador de Playwright; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite elegirlo. Dos casos de competición cubren embocados reales, puntos, recuperación, honores y bloqueo del formato; el caso de sockets rechaza el intento de cambiar el online a puntos. Tres casos gráficos miden buffers reales en móvil, persistencia, conservación de un tiro y llamadas WebGL al ocultar/mostrar la pestaña. Cinco casos de recuperación cubren recarga durante un golpe, nombres/turno/reloj, control fijo en móvil, tabla entre hoyos, finalización de práctica sin duplicar marcas, descarte y cuota bloqueada. Las capturas se guardan en `work/`.

`PAGES_BASE_PATH=/golf/ VITE_STATIC_HOST=true npm run build` seguido de `npm run test:pages` comprueba la compilación estática para publicar, bajo el prefijo real y sin fallback de rutas. Sus cuatro pruebas detectan 404 de scripts/fuentes, errores de JavaScript y fallos del golpe; bloquean una descarga para comprobar que la barra espera bytes reales y prueban la recuperación ante fallos del motor o del script inicial. Contra la URL pública se juega un duelo por puntos real, se cambia la calidad y se recuperan turno y formato tras recargar; las tres inyecciones de fallo/espera se reservan al servidor de pruebas. `PUBLIC_GAME_URL` permite repetir esta comprobación contra la URL ya desplegada.

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

Node sirve `dist/`, `/health` y Socket.IO. Publica detrás de un proxy con HTTPS y soporte para WebSocket y HTTP long polling. Configura el proxy para reenviar todos los paths al puerto 3001; permite conexiones de más de 60 segundos y upgrades WebSocket. `GET /health` devuelve estado, protocolo (7), número de salas y capacidad. El cliente rechaza servidores de protocolos anteriores para evitar reglas incompatibles. El proceso debe permanecer activo: un hosting exclusivamente estático no ejecuta las salas.

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
- `shared/competition.ts`, `src/MatchFormatPicker.tsx`: puntuación Stableford, empates y selección previa del duelo local.
- `src/Scene.tsx`: representación 3D, cámara, materiales, obstáculos y pelotas interpoladas.
- `src/graphics.ts`, `src/RenderQuality.tsx`, `src/GraphicsSettings.tsx`: presupuesto visual automático, perfiles, suspensión en segundo plano y preferencia gráfica.
- `src/main.tsx`: flujos de inicio, conexión online, sesión local y controles.
- `src/GamePanels.tsx`: lobby, HUD de partida y resultados.
- `src/boot.ts`, `index.html` y el manifiesto generado por Vite: carga inicial por bytes y preparación real.
- `src/AppErrorBoundary.tsx`: recuperación ante errores de arranque.
- `src/camera.ts`, `src/useTurnPresentation.ts`, `src/useFullscreen.ts`, `src/HoleMap.tsx`: cámara, cambios de jugador, pantalla completa y minimapa.
- `.github/workflows/pages.yml`, `scripts/serve-pages.mjs`, `tests/pages/`: publicación y comprobación del juego compilado en su ruta pública.
- `src/CircuitPicker.tsx`: selección de recorrido compartida por los menús y el lobby.
- `src/localRound.ts`, `src/useLocalRecovery.ts`, `src/SavedRound.tsx`: snapshot físico, validación, guardado periódico y recuperación de la partida local.
- `src/storage.ts`: preferencias y sesiones tolerantes a datos corruptos o almacenamiento bloqueado.
- `src/audio.ts`, `src/style.css`: audio y presentación adaptable.
- `server/index.ts`: salas, invitaciones, sesiones, validación de mensajes y servidor HTTP.
- `tests/`: reglas y pruebas reales de navegador/red.

## Alcance de esta versión

Incluye ocho opciones de recorrido (21 hoyos distintos, con vueltas de 9/18), selección local/online, revancha y recuperación de una partida local en curso. La identidad Battle se apoya en rutas de riesgo, rebotes y ventanas de los obstáculos; **no incluye habilidades ni modificadores**. El Duelo por puntos añade una competición local con reglas Stableford y las mismas físicas. No hay cámara orbital libre, espectadores, salas públicas, persistencia de salas ni cuentas. El anfitrión puede quitar invitados desconectados del lobby; no puede expulsar rivales conectados en mitad de una partida. Se implementan rampas y barreras giratorias y deslizantes, además de agua con penalización, arena, puentes y saltos producidos por el terreno. Faltan túneles y plataformas que transporten pelotas.

El motor mantiene un solo hoyo visible y una pelota física activa. La calidad automática adapta resolución y sombras; Ahorro las desactiva y Alta permite DPR 2 con sombras de 2048. La geometría fija de cada pista se reutiliza entre actualizaciones y el renderizado se detiene en segundo plano. Faltan pruebas manuales en dispositivos iOS/Android físicos y pruebas de carga de muchas salas. Hay sonidos sintetizados de golpe, rebote, agua, cambios de turno y embocada, con anillos de impacto. El césped utiliza una textura procedural local y el agua una animación ligera. La primera versión prioriza la partida completa y las salas reales.

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

- Base y partidas locales: implementadas, con 21 hoyos, clasificación, revancha y guardado con recuperación tras recargar.
- Multijugador: salas privadas autoritativas, 2–8 clientes, reconexión, latencia, invitación con servidor y controles de versión. **Pendiente: disponer de hosting persistente y comprobarlo por Internet.**
- Experiencia visual y controles: cámara de seguimiento, carga real, césped procedural, agua animada, impactos, guía corta de dirección, Clásico, Retroceso y Precisión.
- Variedad: rampas, puentes, canales, islas, arena, barreras móviles y elecciones entre ruta segura y salto.
- Pulido: pruebas automáticas de los 21 hoyos, recuperación y casos de red; pendientes pruebas de rendimiento en teléfonos físicos, carga de muchas salas y mecánicas Battle adicionales.

## Récords y objetivos de un jugador

Se guardan por recorrido, control y versión de reglas (`club-personal-normal-v7`), separados de versiones anteriores. Solo califican rondas completas de un jugador con puntuaciones válidas, sin retiro ni hoyos terminados por límite. El asterisco en la tabla identifica los límites; embocar realmente en el golpe 12 sigue siendo válido. Las penalizaciones normales cuentan en la puntuación.

Se conservan la mejor marca, rondas válidas y objetivos conseguidos: terminar, igualar/bajar del par, terminar sin penalizaciones, dominar Precisión y completar las vueltas de 9 o 18. Los objetivos provienen del resultado real, no de acciones ficticias. Una marca peor no reemplaza la mejor. Los datos corruptos/antiguos se ignoran. Si el navegador bloquea el almacenamiento, la pantalla indica que la marca solo dura esta sesión.

## Estado por fases

El detalle de implementación, pruebas y pendientes está en [EVOLUTION.md](EVOLUTION.md). La base normal se verificó antes de avanzar a controles; después se verificaron terrenos y registros; por último se recalibraron y probaron todos los hoyos. El refinamiento continuo sigue abierto: faltan sesiones prolongadas en teléfonos físicos, medidas de muchas salas y recoger experiencia real de jugadores. El backend público requiere hosting externo; no se presenta como desplegado.

### Últimos ajustes de jugabilidad

El panel de tiro se abre compacto. «Más ajustes» despliega el giro fino y las potencias rápidas; se repliega al tirar o cambiar de jugador. El indicador de turno y la transición se sitúan al lateral. Los nombres se pueden editar antes de empezar y se conservan al iniciar una partida.

La salida del siguiente hoyo corresponde a la menor puntuación del anterior. El resto sale también en ese orden; los empates conservan los honores previos y los retirados se omiten. Una revancha reinicia el orden de inscripción.

El green utiliza `TriMeshFlags.FIX_INTERNAL_EDGES`: evita contactos falsos en las aristas compartidas del suelo plano. Se conserva el rebote físico de las bandas y la elevación natural de rampas; el lanzamiento siempre parte con velocidad vertical cero.

### Pistas y cámara — reglas v7

Pulsa **Mirar** para explorar: arrastra con ratón o tacto, o usa los botones de giro, altura y acercamiento. El tiro queda bloqueado durante la inspección; **Volver a apuntar** restaura la cámara y conserva dirección y potencia. El seguimiento normal de la pelota continúa durante el juego.

La copa tiene aro e interior gris, caída visible y mástil centrado con colisión. La flecha gana grosor, contraste y marcas cortas sin predecir posiciones finales. Se suavizan las esquinas de los obstáculos, se cierran rendijas laterales accidentales y se corrige la unión de la rampa de entrenamiento. Los tres primeros hoyos reciben trazados revisados; todos los campos comparten las mejoras de presentación, copa y bordes.

La potencia se calibra con distancias reales de rodamiento del motor sobre césped plano. Entre 20 y 100 % se busca una distancia de referencia aproximadamente proporcional al porcentaje, no una velocidad proporcional: 50 % recorre unos 13 m, 60 % unos 15,5 m y 100 % unos 26 m en la pista de medición sin obstáculos. Por debajo del 20 % una transición suave permite golpes cortos. La velocidad máxima es 16,2 (+2,5 % respecto a v6), siempre con lanzamiento vertical cero. Arena, pendientes, paredes y agua modifican el resultado real. La guía sigue corta y no muestra el punto final. Servidor y cliente usan protocolo 7; los récords anteriores permanecen separados en sus claves v5.

Consulta [RESEARCH.md](RESEARCH.md) para las fuentes primarias, decisiones y límites de la investigación.

### Entrenamiento individual y pausa local

En el catálogo abre **Entrenamiento · elige un hoyo**. Selecciona el recorrido y el control antes de comenzar; **Vuelta completa** permite elegir cualquiera de los 18 hoyos. Usa **Practicar este hoyo** para jugar desde su salida real con el primer nombre local configurado. Al terminar puedes **Repetir hoyo** o **Entrenar siguiente hoyo**, conservando el mismo control y las mismas reglas físicas.

Las medallas dependen de los golpes reales: **Oro** por debajo del par, **Plata** al par, **Bronce** hasta dos golpes por encima. Los intentos incompletos, retirados o terminados por límite no registran marca. La mejor marca por hoyo/control y el número de intentos válidos se conservan en `club-practice-v7`; el mismo hoyo comparte marca entre sus apariciones en varios recorridos. Las prácticas nunca modifican los récords de rondas completas.

**Pausar**, en el panel de tiro, detiene pelota y reloj en cualquier partida local. **Continuar partida** o Escape retoman la simulación sin recuperar tiempo acumulado. La pausa gestiona el foco y la navegación con Tab. Abrir ajustes, explorar con **Mirar** o pasar a una pestaña en segundo plano también detiene la simulación local. Al cerrar ajustes se retoma la partida, o se vuelve a la pausa si los abriste desde ella.

En online el servidor mantiene su reloj: no se envían comandos de pausa ni de entrenamiento, y esos comandos no están admitidos por el servidor. La inspección online muestra el tiempo restante. Los resultados muestran también el acumulado respecto al par de los hoyos ya completados.

La versión 0.4.0 añade recuperación después de recargar o cerrar la página: desde el catálogo pulsa **Reanudar partida**. Se conserva la simulación completa y se abre en pausa. Consulta **Guardar y recuperar una partida local** para los límites del almacenamiento y del único guardado en curso.

### Versión 0.2.0 — ritmo, potencia y resultados de golf

El nombre del juego es **Hoyo en Uno · Golf Club**. La cabecera muestra la versión de `package.json`, en lugar de una edición fija. Consulta [CHANGELOG.md](CHANGELOG.md) para el historial de entregas.

Los turnos duran **30 segundos**; la pausa y la inspección local conservan ese tiempo. En online el servidor mantiene el reloj. Birdie (−1), Eagle (−2), albatros, par, bogey (+1), doble bogey y hoyo en uno se calculan a partir de golpes y par reales. El hoyo en uno tiene prioridad sobre el nombre relativo al par. Los resultados aparecen al embocar, con sonidos diferenciados y un aviso breve en partidas con más jugadores; no añaden ni restan golpes artificialmente. Los límites y retiros no generan celebraciones de embocado.

La escala calibrada se comparte entre Clásico, Retroceso y Precisión. El selector muestra hasta una décima de porcentaje para no ocultar los ajustes finos. `shared/rules.ts` centraliza el tiempo de turno y la versión de reglas; las claves de récords completos y prácticas usan v6 sin borrar v5.

### Versión 0.3.0 — Club del As

El catálogo suma **21 hoyos distintos**: se mantienen las vueltas de **9 y 18**, y se incorpora **Club del As**, una ronda de tres hoyos nuevos, par 9. Selecciónalo en el catálogo para jugar solo, por turnos locales o en una sala conectada al servidor actualizado. También puedes entrenar cada hoyo por separado con cualquiera de los tres controles.

- **La aguja:** puente diagonal de 1,4 m para un golpe de precisión sobre el agua; pasarela de 2,2 m a la izquierda para dividir el recorrido y recuperarse.
- **La firma de la banda:** la línea directa está bloqueada. El hoyo en uno exige una carambola en la banda derecha; existe una ruta de aproximación por la izquierda.
- **La ventana del faro:** compuerta móvil y una franja de arena. El as requiere elegir el momento y la fuerza; se puede preparar un tiro desde los laterales.

Los tres hoyos tienen un hoyo en uno verificado desde su salida con física real. Las pruebas incluyen una vuelta completa sin penalizaciones, recuperación después de caer al agua, un rebote real en la banda y variaciones de ángulo/potencia que fallan. Las soluciones exactas quedan en fixtures de pruebas y no se muestran como ayuda de apuntado.

El máximo pasa de 15,8 a **16,2** de velocidad (+2,5 %); la referencia de rodamiento máximo medida pasa de 25,06 a 25,91 m. Se recalibran los porcentajes para conservar la progresión gradual. Cliente, servidor y marcas usan reglas/protocolo **7**, manteniendo almacenadas las claves anteriores. Las preferencias de nombre, volumen y control se conservan.
