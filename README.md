# Hoyo en Uno · Golf Club — Minigolf competitivo

Versión **0.19.0** de minigolf 3D competitivo, en español. React + TypeScript + Three.js/React Three Fiber; físicas Rapier; servidor Node + Socket.IO con simulación autoritativa. Geometría procedural y fuentes incluidas. El juego oficial y las salas del taller no exigen cuentas ni base de datos; la comunidad persistente usa PostgreSQL y protege publicación/moderación con OIDC.

## Tierras bravas y física de aterrizajes — 0.19.0

Tres campos nuevos de **90–160 m de recorrido**, con rutas seguras y atajos que exigen precisión: salto sobre agua, descenso de ocho metros y delta con tres caminos, compuerta y puente giratorio. El catálogo alcanza **34 hoyos físicos, 13 selecciones y 38 prácticas**. Las vueltas clásicas de 9/18, los tres controles, escuela, copas, editor y comunidad permanecen disponibles.

El golpe sigue siendo normal, con impulso vertical cero. La potencia de 0–75 % conserva su respuesta; el último cuarto aumenta progresivamente hasta 20 m/s (antes 16,2). Los aterrizajes recuperan energía según césped, arena, rough o tierra, sin rebote artificial al rodar o chocar de lado. La flecha sigue siendo corta y no predice el destino.

**Compatibilidad:** los guardados originales, desafíos c1 y creaciones del taller/documento 1 mantienen la física original. Las rondas oficiales nuevas usan física 2 y guardado 2. Los récords anteriores se conservan y se consultan en «Marcas anteriores»; los nuevos tienen un espacio separado. Reglas de puntuación 7 y protocolo online **15**. Actualiza cliente y servidor juntos. [PHYSICS-AND-WILDLANDS.md](PHYSICS-AND-WILDLANDS.md) describe las decisiones, pruebas y límites.

## Controles más legibles — 0.18.0

Retroceso incorpora **Arrastre fino**, una sensibilidad para putts de 3–35 %; el arrastre normal mantiene su curva anterior. Volver al círculo cancela el golpe y la interfaz distingue cuándo está armado. En **Más ajustes** se pueden preparar dirección y referencia de potencia en los tres esquemas.

Precisión muestra la oscilación del ángulo, la referencia de potencia y la lectura de la suelta. Usa el instante del evento de ratón/tacto/teclado para medir la pulsación. La pérdida de captura cancela y restaura los valores preparados. [CONTROLS.md](CONTROLS.md) explica los gestos, límites y pruebas. Física, reglas v7, protocolo 14 y guardados existentes conservados.

## Empezar a jugar — renovación 0.17.0

**Jugar ahora** abre la guía interactiva con tiros reales: fuerza, banda y copa. Al terminar puedes entrar directamente a una vuelta de tres hoyos. Si existe una partida recuperable, la acción principal permite continuarla sin reemplazarla. **Jugar online con amigos** queda visible en la portada y abre las salas reales; catálogo, modos y taller siguen accesibles.

Se renovaron jerarquía visual, guía móvil, feedback, transitorios de sonido y continuidad inicial. [FIRST-IMPRESSION.md](FIRST-IMPRESSION.md) recoge la auditoría crítica, las pruebas y lo que necesita evaluación con personas. No se afirma que las capturas o la compilación demuestren diversión.

La entrada rápida conserva el progreso por control: propone el primer ejercicio pendiente y, una vez completada la escuela, inicia directamente la vuelta de tres hoyos. Las partidas recuperables tienen prioridad.

## Jugar desde GitHub Pages

URL del proyecto: **https://gomeza2.github.io/golf/**. La publicación la realiza el workflow **Publish playable game** al actualizar `main`; su estado y la comprobación final de la URL están en GitHub Actions. La primera publicación debe terminar correctamente antes de que desaparezca un 404 anterior.

Pages sirve el juego local completo para 1–8 personas y trece opciones de recorrido, con dos perfiles de bandera en Al Filo. No ejecuta Node ni las salas: si no hay un servidor público configurado, el botón online aparece desactivado con una explicación y una acción **Conectar un servidor**. Puedes escribir una URL HTTPS en el menú online sin recompilar. La URL se recuerda localmente y las invitaciones incluyen `server=` (nunca el token de recuperación). También puedes configurar `VITE_SERVER_URL` en GitHub y volver a publicar. Permite `https://gomeza2.github.io` en `CLIENT_ORIGIN` del servidor. Los códigos de sala no funcionan como sesiones online hasta que ese servidor esté disponible.

El workflow compila con la ruta `/golf/`, comprueba en Chromium que todos los assets cargan y se puede golpear, publica `dist/` y repite la prueba contra la URL desplegada. Publica sobre el sitio Pages existente desde `main`, con `pages: write` e `id-token: write`; no necesita modificar sus ajustes administrativos. Como recomienda GitHub, seleccionar **Settings → Pages → Source: GitHub Actions** evita que además se ejecute el publicador Jekyll heredado. Si un fork todavía no tiene Pages habilitado, su propietario debe activarlo una vez en **Settings → Pages → Source: GitHub Actions**.

## Comunidad persistente — 0.17.0

Galería pública, búsqueda por nombre, autor, dificultad y características, planos del diseño real y enlaces permanentes a creaciones/revisiones. El taller envía una versión inmutable a moderación; solo una aprobación la hace pública. Denuncias, retirada, restauración e historial de decisiones se guardan en PostgreSQL. No hay votos, usuarios o estadísticas de partidas ficticios.

Las canchas publicadas se pueden jugar individualmente sin cuenta o llevar a una sala con amigos. El servidor carga la revisión por ID desde la base, valida su documento y checksum y conserva el motor de físicas y las reglas de sala existentes. Los récords/guardados oficiales no se mezclan con estas partidas. Cada creación usa el formato actual del taller: un hoyo.

**Activación real:** `COMMUNITY_DATABASE_URL`, migración y configuración OIDC/moderadores. Sin base, se muestra comunidad no disponible; con base e identidad incompleta, solo exploración de publicaciones existentes. El taller no muestra publicación si falta configuración. No se ha inventado ni provisionado una base/proveedor de producción. [COMMUNITY.md](COMMUNITY.md) detalla variables, permisos, API, pruebas y despliegue.

```sh
# Con COMMUNITY_DATABASE_URL privado configurado en .env:
npm run community:migrate
npm run dev
# Migración de un despliegue compilado:
npm run community:migrate:production
```

Dependencias nuevas: `pg` para PostgreSQL, `jose` para verificar JWT/JWKS y `oidc-client-ts` para Authorization Code + PKCE. Ninguna credencial privada se compila en Vite. `VITE_COMMUNITY_SERVER_URL` es solo el origen público de API, fijado por despliegue.

Protocolo online **15**, reglas v7, guardados 1/2 y documento del taller 1. Se conservan los 34 hoyos oficiales, recorridos, tres controles, modos, copas y récords. Las salas siguen siendo temporales; la persistencia de creaciones está en PostgreSQL.

## Canchas del taller con amigos — entrega 0.16.0

**Taller → Jugar con amigos online** prepara tu creación para una sala privada. Escribe tu nombre, elige golpes o puntos y crea la sala. Comparte su código/enlace: tus amigos reciben el diseño sin importar archivos. Antes de prepararse, cada cliente verifica la misma revisión SHA-256; el servidor valida y compila la geometría, limita su coste y calcula los resultados con Rapier.

Se juega un hoyo fijo con reloj de 30 s, límite de 12 golpes, par propio, resultados, reconexión y revancha. La cancha no se cambia ni se convierte en copa dentro de esa sala; para otro diseño se crea una nueva. La práctica individual del taller sigue sin reloj. Los resultados privados no generan récords oficiales ni sustituyen sus guardados. El contenido viaja al entrar/reconectar, no en cada actualización de posiciones.

El protocolo 13 se introdujo en esta entrega; el vigente es 15. Reglas v7, guardados 1 y documento del taller v1 conservados. Las salas están en memoria y se pierden si el servidor reinicia. Guardar/exportar el diseño lo conserva fuera de la sala. HTTPS o localhost para verificar la revisión. Todavía no hay galería pública ni publicación persistente: [COMMUNITY.md](COMMUNITY.md) define el siguiente paso y sus requisitos. No se agregan servicios, cuentas, secretos o dependencias nuevas.

## Cumbres y Mareas — 0.15.0

**Jugar Cumbres y Mareas** prepara tres canchas nuevas, también seleccionables en las salas online. El club alcanza **31 hoyos físicos distintos, once tarjetas y doce selecciones** (Al Filo conserva sus dos perfiles). Las vueltas de 9/18 mantienen su contenido y puntuación anteriores.

| Lugar                  | Decisión                                                                     | Mecánica real                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| La cornisa del glaciar | Bajada amplia entre terrazas o diagonal de 1,2 m sin barandas                | Ocho metros de altura, gravedad, agua y arena de frenado en dos niveles. Ruta amplia de unos 52 m.                             |
| El faro de las nubes   | Subir por una espiral de 270° o intentar la rampa oblicua hacia el hoyo alto | Malla inclinada continua con colisión real, green a 3,6 m y un as difícil que exige ángulo y fuerza. Ruta amplia de unos 62 m. |
| Bajo las válvulas      | Zigzag ancho con compuertas o puentes estrechos sobre los carriles           | Tres compuertas que suben, túnel bajo el viaducto, cambio de dirección arriba y descenso al green. Ruta amplia de unos 70 m.   |

Los nuevos lugares tienen paletas y ambientación propias: cumbres rocosas, un faro nocturno y pilares de acueducto. La decoración está fuera del límite de recuperación; los obstáculos jugables están definidos en `Course` y tienen colisiones. Ahorro usa cuatro decoraciones, más detalle añade instancias; el haz del faro se detiene con movimiento reducido. No hay modelos, claves o fuentes remotas nuevas.

Las compuertas verticales comparten `blockPose` entre servidor, escena y mapa. Su ciclo es predecible y el color indica la ventana de paso. El mapa conserva su huella y cambia el estado abierto/cerrado. No se aleatorizan resultados. Los puentes superiores dejan altura libre sobre esas puertas y funcionan también como techo del carril inferior.

Se conservan el golpe normal y las físicas generales de reglas v7; los desniveles y los saltos resultan de la geometría y gravedad. Las potencias/control Clásico, Retroceso y Precisión mantienen sus reglas. El atajo de la cornisa se equilibró con una zona de arena visible: un golpe bueno termina en unos 4,6 s y evita una curva, sin convertir la rampa en una espera larga.

QA física: vueltas amplias de **4/8/7** golpes y atajos de **3/1/4**, completos sin recolocaciones ni penalizaciones. Para las puertas se espera una ventana real dentro del tiempo de turno; el as oblicuo no se obtiene tirando recto con máxima potencia. Estos son recorridos de prueba, no una guía visible de tiros. La geometría elevada, la espiral y el mundo guardado se verifican con Rapier; la escena usa los mismos datos.

**Compatibilidad:** guardado formato 1 y reglas v7; las claves de práctica originales y las cuatro de banderas cruzadas mantienen sus índices. Las tres nuevas se añaden después. El protocolo 12 se introdujo en esta entrega; el vigente es 15: actualizar cliente y servidor juntos. Las salas siguen en memoria y se pierden al reiniciar/desplegar el servicio.

La comunidad de creaciones queda como la siguiente fase: primero partidas privadas con contenido validado por servidor y después publicación persistente/galería. [COMMUNITY.md](COMMUNITY.md) define el contrato, límites y almacenamiento necesarios. Todavía se comparten archivos del taller; no hay galería ni publicación central conectada. La revisión específica de Retroceso y Precisión queda en una fase posterior, como solicitó el usuario.

## Taller de precisión e inspección — entrega 0.14.0

El taller permite trabajar con **varias piezas a la vez**. Activa **Selección múltiple** (también disponible en móvil) o usa Shift al seleccionar. Apaga ese modo para arrastrar el grupo; sus distancias internas se conservan. Puedes mover, girar 90° alrededor de su centro, alinear centros X/Z, duplicar o eliminar el grupo. Cada operación ocupa un solo paso de deshacer. Las zonas de agua/arena/rough intercambian ancho/largo al girar, sin introducir rotaciones incompatibles con las físicas.

Elige ajuste de cuadrícula de **0,1 / 0,5 / 1 m**. Las flechas desplazan la selección y Shift + flechas usa 0,1 m. Ctrl/Cmd + Z deshace, Ctrl/Cmd + Shift + Z o Ctrl/Cmd + Y rehace; Suprimir elimina. Los atajos no actúan al escribir en formularios, durante un arrastre ni en el importador/prueba 3D. Si un movimiento o una copia excede los límites, se rechaza como grupo, sin separar ni deformar sus piezas. Deshacer conserva el diseño; la selección es temporal.

En **Probar en 3D → Inspeccionar cancha**, gira, inclina y acerca/aleja la cámara con botones o arrastre táctil/ratón. El golpe queda bloqueado mientras inspeccionas. El encuadre general reserva el espacio real de cabecera y paneles para no dejar el campo detrás de los controles. Cerrar la inspección conserva la puntería y permite seguir probando; restablecer la vista no mueve la pelota ni borra golpes. Se reutilizan cámara, límites de vista y Scene existentes.

**Revisar el diseño** avisa de zonas de arena/rough que no coinciden con suelo a su altura, islas separadas y falta de conexión de suelo entre salida/copa. Usa una cuadrícula aproximada de 0,5 m y la altura superior; no tiene en cuenta paredes, saltos, pasos inferiores ni resuelve tiros. **No bloquea** rutas con saltos y no certifica que una cancha se pueda completar. Los errores estructurales anteriores sí siguen bloqueando la prueba. Se conserva el mismo compilador y la misma física.

El importador ahora usa un diálogo nativo con fondo inactivo, foco en el JSON y cierre con Escape. Informa de errores al leer archivos. Documento v1, biblioteca, borrador, límite de piezas, registros oficiales, los 28 hoyos y todas las salas/copas siguen compatibles. No se agregan dependencias, ni un motor nuevo, ni creaciones online todavía. Reglas v7, guardados formato 1; protocolo vigente 15.

Código nuevo: `shared/workshopTools.ts` (transformaciones), `shared/workshopDiagnostics.ts` (avisos), `src/WorkshopSelection.tsx` y `src/WorkshopImport.tsx`. Pruebas de herramientas/diagnóstico en `tests/workshop-tools.test.ts`; los casos de navegador comprueban grupos, historial, foco, cámara táctil y embocado después de inspeccionar.

## Taller de hoyos — 0.13.0

En el catálogo, pulsa **Abrir taller de hoyos**. Es un editor local real: coloca plataformas, rampas, paredes, compuertas deslizantes, agua, arena y césped alto sobre un plano de 24 × 48 m. Selecciona y arrastra con ratón o tacto, ajusta posiciones, tamaños y alturas; paredes/rampas giran libremente y las plataformas en pasos de 90°. Las zonas de superficie mantienen sus ejes. Puedes mover salida y copa y cambiar el par/nombre. Deshacer/rehacer conserva hasta 60 pasos; un arrastre se confirma como una sola edición y cancelar el puntero lo descarta.

**Probar en 3D** utiliza la escena y el mismo `Game`/Rapier de las partidas oficiales, con golpe normal Clásico, fricción, rebotes, pendientes, compuertas y penalizaciones reales. Puedes seguir la pelota o ver el campo, volver al diseño y repetir. La prueba no tiene penalización por reloj: permite experimentar con calma. El límite de golpes sigue vigente. No hay un motor de físicas paralelo ni resultados simulados.

Las plataformas se recortan físicamente alrededor de la copa gris, incluida su abertura real; moverla no deja un suelo invisible tapándola. La salida se apoya a la altura de la plataforma/rampa. Se comprueban soporte de salida, pendientes, límites del mapa y espacio libre de la copa antes de habilitar la prueba. **Esta validación no demuestra que todas las rutas puedan completarse**: hay que probar el diseño. No se etiqueta como certificado por embocar una vez.

**Borrador:** se recupera automáticamente solo en este navegador. **Guardar diseño:** crea/actualiza una copia explícita en la biblioteca, hasta 12; borrar una copia no elimina el borrador abierto. **Exportar archivo:** descarga `.golf.json`. **Importar diseño:** abre ese archivo o permite pegar su JSON; lo valida y descarta campos desconocidos. Para compartir hoyos ahora, envía el archivo a un amigo y que lo importe. Si el navegador bloquea el almacenamiento o se agota la cuota, se avisa y la exportación sigue disponible. Los datos del taller tienen claves propias (`club-workshop-draft-v1`, `club-workshop-library-v1`).

Formato de documento v1: hasta 80 piezas, nombre de 48 caracteres, par 2–8, alturas 0–4 m, tamaños/posiciones/rotaciones acotados y archivos de hasta 60 KB. No admite código, URL de modelos, mallas arbitrarias ni IDs reservados/duplicados. El compilador produce un `Course` local; `Scene` recibe esa misma geometría explícitamente. El modo de prueba se marca como personalizado y se rechaza en récords, práctica oficial, desafíos y guardado de recuperación oficial. Una prueba del taller no reemplaza una partida local guardada.

**Conservado:** los 28 hoyos oficiales, diez tarjetas/once selecciones, ambos perfiles de Al Filo, tres controles oficiales, escuela, retos, vueltas 9/18, todas las copas y salas online. Reglas v7, guardados formato 1 y protocolo vigente 15. No se agrega un circuito falso al registro oficial ni se renumeran récords.

**Pendiente:** jugar diseños personalizados con varios participantes, validación/importación de geometría en el servidor, galerías y enlaces de creación duraderos y plataformas que transporten pelotas. Esta entrega permite editar, guardar, compartir archivos y probar individualmente; las creaciones todavía no se admiten en salas online. Persistencia central y pruebas de carga/teléfonos físicos siguen pendientes.

Código: `shared/workshop.ts` (documento, validación y compilación), `src/Workshop.tsx` (editor), `src/WorkshopPlay.tsx` (prueba con motor/escena existentes), `src/workshopStorage.ts` (borrador/biblioteca/historial). Pruebas específicas en `tests/workshop.test.ts`, `tests/e2e/workshop.spec.ts` y `tests/pages/published.spec.ts`.

## Al Filo — entrega 0.12.0

La nueva entrada principal prioriza canchas con decisiones reales. **Jugar Al Filo** prepara una ronda de cuatro hoyos; puedes añadir amigos locales o seleccionar el mismo recorrido en una sala online. Son **28 hoyos físicos distintos**: se conservan los 24 anteriores y sus vueltas de 9/18, geometrías, controles, récords y guardados. El catálogo reúne diez tarjetas; Al Filo tiene dos perfiles y por eso el registro técnico contiene once selecciones.

| Hoyo nuevo               | Ruta amplia                                 | Atajo y coste del fallo                                                                                              |
| ------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| La horquilla del vértigo | U de 82 m, con bandas exteriores            | Puente de 1,15 m sobre agua; la línea directa entre salida y copa no tiene suelo.                                    |
| El hilo de la aguja      | Serpiente de 72 m, rough y arena            | Diagonal estrecha con isla intermedia; hay que frenar y volver a alinear.                                            |
| La órbita rota           | Anillo físico de 270° y 66 m de recorrido   | Radio estrecho y compuerta deslizante: un as es posible con la ventana adecuada; el exceso de fuerza sale del green. |
| El balcón partido        | Bajada ancha, arena de frenado y giro, 47 m | Diagonal sin barandillas con tres metros de descenso; la gravedad importa.                                           |

**Abiertas / Cruzadas** se elige antes de empezar. Cruzadas desplaza las cuatro copas, conserva las huellas y exige otras aproximaciones; no hay azar que decida la trayectoria. Cada perfil mantiene sus propios récords de ronda y práctica. Se recuerda el último recorrido elegido, sin sustituir la recuperación de una partida anterior. **Mapa** muestra el suelo real y notas de ruta amplia/riesgo, sin resolver ángulos, potencias o rebotes.

No hay suelo ni paredes rectangulares invisibles cerrando las pistas nuevas. Los vacíos son reales y el agua aplica la penalización habitual. El anillo utiliza la misma malla cerrada en Three.js, Rapier y el mapa; las rampas diagonales comparten un cuaternión para representación y colisión. La distancia anunciada es la ruta amplia, no la dimensión de la caja usada para cámara/límites. Los tiros siguen siendo normales: no se añade impulso vertical ni aumenta la potencia de reglas v7.

En **Online → Crear sala → Tipo de encuentro**, la **Copa Al Filo** enlaza Abiertas y Cruzadas: ocho hoyos jugados sobre cuatro huellas, actas acumuladas por servidor, golpes o puntos, reconexión y revancha. Las copas anteriores se conservan. En esa entrega se introdujo el protocolo 11; el protocolo vigente es 14. las salas siguen en memoria y se pierden al reiniciar/desplegar el servidor.

Comprobaciones físicas reproducibles: rutas amplias de **5/6/7/4** golpes frente a atajos **3/2/1/2**, y Cruzadas **5/6/8/4** frente a **3/3/2/3**. El as del anillo se prueba en una ventana concreta del mecanismo. Son recorridos de QA, no ayudas visibles ni garantías para cualquier momento de una partida. Se prueban también fallos de puente, puerta cerrada, soporte del anillo, rampa diagonal, recuperación durante un golpe y registros independientes sin renumerar claves antiguas. `tests/fixtures/rift.ts` solo se importa desde pruebas.

## Copas entre amigos — 0.11.0

En **Online → Crear sala**, el anfitrión elige **Tipo de encuentro** antes de preparar a los participantes:

- **Partida única:** conserva todos los recorridos y los formatos habituales.
- **Copa del Club:** Club del atardecer, Jardín lunar y Gran Parque; tres vueltas y nueve hoyos.
- **Copa del Riesgo:** Club del As y Ruinas del Cielo; dos vueltas y seis hoyos.
- **Copa Al Filo (0.12.0):** Abiertas y Cruzadas; dos vueltas y ocho hoyos jugados.

Se pueden usar **Menos golpes** o **Duelo por puntos**. Cambiar la copa o el formato cancela los preparados. Al comenzar quedan fijados el plan, formato y participantes; no se admiten incorporaciones entre vueltas. Todos usan Clásico online, sin modificar su preferencia para partidas locales.

El servidor conserva un acta por vuelta y calcula el acumulado. Durante el juego, **Ver copa** muestra el total provisional y las columnas confirmadas; consultar el marcador no pausa el reloj online. Al terminar un recorrido el anfitrión pulsa **Siguiente vuelta**. Los honores de la salida siguiente siguen el resultado de la vuelta anterior. Los empates del total se resuelven por ases; si persisten, la victoria es compartida.

Una desconexión conserva plaza, resultados y token durante el plazo configurado (90 s por defecto), también entre vueltas. Si vence o el jugador sale, queda retirado de la copa y conserva sus resultados anteriores, sin inventar puntuaciones de vueltas futuras. Los demás pueden continuar, incluso si queda uno. La copa cerrada conserva su clasificación al salir un participante. **La revancha** inicia la misma copa desde cero si hay dos participantes conectados; **Preparar otra partida** vuelve al lobby al terminar la serie.

En todos los modos, **Más ajustes → Ceder este hoyo → Confirmar: 12 golpes** permite recoger la pelota detenida durante el propio turno. Cuenta como límite de golpes y otorga cero puntos: no genera récord, medalla ni objetivo limpio de un reto. No se permite durante el movimiento ni sobre el turno de otro jugador.

Las copas usan el servidor real y no localStorage para resultados. Las salas y actas siguen en memoria: un reinicio/despliegue del servidor las elimina. Persistencia central e historial durable de copas todavía no están implementados. **Protocolo online 11:** cliente y servidor deben actualizarse juntos. Las físicas/registros locales conservan reglas v7 y guardados formato 1.

## Retos del club — 0.10.0

Desde el catálogo puedes preparar el **Desafío diario** o la **Copa semanal**. Son vueltas individuales completas con control Clásico fijo: el diario rota entre cinco recorridos cortos y la copa ofrece 9 o 18 hoyos. Tu preferencia Clásico/Retroceso/Precisión para otras partidas se conserva. No se modifican las físicas ni las potencias de reglas v7.

Cada reto tiene tres objetivos reales: terminar al par o mejor, sin penalizaciones y con al menos un hoyo bajo par (tres en la copa). Completar todos los hoyos sin llegar al límite da Bronce; dos objetivos dan Plata y los tres dan Oro. Un retiro, un hoyo al límite, entrenamiento, otro control o una vuelta incompleta no generan marca del reto. Los resultados muestran qué se consiguió y permiten repetir o copiar el resultado.

**Compartir enlace** abre exactamente el mismo reto en otro navegador; por ejemplo `?challenge=c1-d-2026-11-04`. El calendario usa UTC (diario a medianoche, copa el lunes). El identificador versiona la selección y fija la fecha: un intento no cambia de recorrido al pasar medianoche y los enlaces antiguos siguen siendo jugables. Las invitaciones de sala tienen prioridad sobre un parámetro de reto.

Las marcas y medallas son **personales en este navegador**, separadas de los récords de rondas normales y de la escuela; no se simula una clasificación global. Se conservan hasta 120 retos recientes y los últimos 32 identificadores de intento por reto para evitar duplicados por recuperación. Reanudar conserva el intento y la simulación real; repetir crea otro. Hay un único guardado local de partida: empezar una nueva sustituye el anterior, con aviso previo. El panel de objetivos pausa solamente la partida local.

Para competir simultáneamente con amigos, sigue disponible **Online → Crear sala → Compartir invitación**, con el servidor autoritativo real. Los retos de esta entrega no son salas online ni guardan resultados en el servidor. Las copas compartidas de varias vueltas se incorporan en 0.11.0; un ranking persistente todavía necesita almacenamiento central y no está implementado.

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

### Duelo por puntos · Stableford

En **Jugar en este dispositivo**, añade de 2 a 8 jugadores y elige **Duelo por puntos** antes de comenzar. El formato queda fijo durante la ronda y la revancha. Para cambiarlo vuelve a la preparación. **Menos golpes** sigue siendo la opción predeterminada y el modo individual; el entrenamiento también utiliza golpes.

- Cada hoyo completado otorga `máximo(0, 2 + par − golpes)`: bogey 1, par 2, birdie 3, eagle 4 y albatros 5. Doble bogey o peor suma 0. Un hoyo en uno puntúa según el par, sin un premio añadido: en par 3 suma 4; en par 5, 6.
- Gana quien acumule **más puntos**. Los empates se resuelven por más hoyos en uno; si persisten, la victoria se comparte. Un hoyo malo puede quedar en cero y el siguiente permite remontar.
- Los golpes, el agua, el tiempo y el límite de 12 se siguen contabilizando. El límite concede cero puntos. No se conceden puntos provisionales a pelotas en movimiento: la clasificación muestra solo hoyos completados, incluido el jugador que ya embocó mientras sus rivales siguen en el hoyo.
- Los honores se conservan como en golf: sale primero quien hizo menos golpes en el hoyo anterior, aunque varios jugadores hayan quedado en cero puntos. Los empates mantienen el orden anterior.
- La tarjeta muestra puntos, golpes reales y el par de cada hoyo. Los avisos de embocada añaden los puntos ganados. La revancha conserva el formato.
- El guardado local conserva el duelo, los puntos confirmados, los nombres y el turno. Los guardados clásicos anteriores siguen siendo compatibles. Las rondas por puntos no se mezclan con récords individuales de golpes ni con medallas de entrenamiento.
- **También disponible online:** el anfitrión elige el formato al crear la sala o mientras está en el lobby. Los invitados ven la misma selección; cambiarla cancela los preparados de todos. El servidor valida rol, formato y fase. Una vez empezada la ronda se conserva hasta la revancha. Online utiliza control Clásico en ambos formatos. Las marcas y los guardados locales conservan reglas v7; la red utiliza protocolo 9.

### Online real

1. Abre **Jugar online**, escribe tu nombre, elige el recorrido y Menos golpes/Duelo por puntos y crea una sala. La dirección del servidor queda en **Conexión avanzada**; desde el propio enlace del servidor se utiliza automáticamente.
2. Copia la invitación pulsando el código o comparte sus seis caracteres. Si usas un servidor externo, el enlace también lo identifica. La sala muestra la latencia medida por confirmaciones reales del servidor.
3. Desde otro navegador/dispositivo abre el enlace, pulsa **Jugar online**, introduce un nombre y entra con el código prellenado.
4. Todos pulsan **Estoy listo**. El anfitrión inicia cuando hay al menos dos jugadores conectados y preparados.
5. El servidor calcula cada trayectoria y puntuación, y envía estados 20 veces por segundo. Los navegadores solo envían dirección, potencia y tipo de golpe: los golpes fuera de turno, simultáneos, malformados o fuera de rango se rechazan.
6. El anfitrión avanza entre hoyos o inicia la revancha. Al terminar puede volver a la sala para cambiar de recorrido sin cambiar el código. Si se desconecta, el rol pasa a otro participante conectado; si todos perdieron la conexión, el primero que recupera una sesión toma el rol.

El anfitrión puede cambiar de recorrido o formato en el lobby: todos deben marcarse preparados otra vez. Repetir la selección del mismo formato no cancela los preparados. Puede quitar invitados desconectados para liberar plazas. Al iniciar se excluyen los desconectados; sus sesiones ya no pueden incorporarse a esa partida. **Salir de la sala** libera inmediatamente la plaza y revoca la sesión. **Salir** durante el juego cuenta como retiro: 12 golpes en el hoyo no terminado y en los siguientes, sin más turnos para esa persona. Los retirados aparecen al final de la clasificación. Un corte de red temporal conserva la sesión durante 90 segundos por defecto, manteniendo el reloj de la partida. Si vence ese plazo, el servidor registra el retiro y revoca la recuperación para que el resto pueda continuar. La configuración `DISCONNECT_GRACE_SECONDS` permite elegir de 1 a 300 segundos; un valor inválido vuelve a 90. Esta política no expulsa de un lobby ni cambia los resultados de partidas ya terminadas.

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

**31 hoyos distintos y once tarjetas de recorrido, con dos perfiles de banderas en Al Filo**. **Club del As** incorpora tres pistas con agua, un puente diagonal, carambola y compuerta. Los tres permiten un hoyo en uno comprobado con las físicas reales; también se verifica una vuelta completa sin penalizaciones. Las rondas de 9/18 conservan sus hoyos originales. Club del atardecer y Jardín lunar tienen tres hoyos/par 11; Gran Parque, tres/par 15; Riviera Salvaje, cuatro/par 26; Desafío Maestro, cinco/par 31. **Vuelta completa** enlaza esos 18 hoyos en una única partida y clasificación (par 94). Las canchas crecen desde 12 × 24 m hasta 22 × 72 m. **Vuelta de 9** ofrece los primeros nueve hoyos, con par 37 y puntuación independiente. El catálogo no cuenta dos veces esos hoyos. Las bandas, rampas y obstáculos se definen una sola vez: el render y Rapier comparten dimensiones, rotaciones y movimiento. No hay paredes físicas invisibles más altas que las visibles.

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
- La elasticidad de suelo quieto sigue en cero; al aterrizar en física 2 la pelota usa césped 0,32, arena 0,08, rough 0,18 o tierra 0,40. Bandas 0,52 y copa 0,08, con combinación máxima. El golpe lateral no agrega elevación. Se comprueban caídas, pérdida de energía, asentamiento y tiros cortos. La física original conserva sus coeficientes anteriores.
- El golpe normal tiene **velocidad máxima 20 m/s**, velocidad vertical inicial **0** y una guía de **1,2–2,4 m**. No se dibujan arcos, posiciones finales ni rebotes previstos. Las rampas y colisiones pueden elevar naturalmente la pelota; un límite de velocidad total 22 m/s evita transferencias desmedidas de obstáculos móviles.
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

`npm test`: 213 pruebas de reglas, física, recorridos, superficies, controles, guardado y cámara. Se completan las rondas de 18 y 9 hoyos desde sus salidas con el golpe normal, sin recolocar la pelota ni recurrir a penalizaciones. También se comprueban lanzamiento vertical cero, potencia máxima, guía corta, aterrizajes, pérdida de energía, pendientes, cuatro superficies, banda curva, copa, límites y validez de los récords. Las rutas se recalibraron para la velocidad reducida y la corrección de aristas internas del green. También se prueban salida por honores, empates y retiros. Diez pruebas de recuperación comparan fotograma a fotograma tiros interrumpidos, colisiones, compuertas, caída en copa, agua, rondas completas y datos dañados.

`npm run test:e2e`: 74 casos con Chromium y sockets reales: controles de escritorio/tacto, cancelación y multidedo, preferencia antes de iniciar y bloqueo de cambios durante la ronda, modo online forzado a Clásico, panel compacto, indicador lateral, nombres persistentes, rechazo de golpes elevados, permisos/reconexión/capacidad de salas, cámara y partida solo completa con récord persistente tras recargar. Arranca automáticamente cliente y servidor. Usa `/usr/bin/chromium` si existe o el navegador de Playwright; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite elegirlo. Cuatro casos de amigos comprueban dos navegadores/sockets online, reglas del lobby y retiro tras vencer la reconexión; diez pruebas nuevas cubren elección de formato, plazos, podio y reconocimientos. Dos casos de competición cubren embocados reales, puntos, recuperación, honores y bloqueo del formato; el caso de sockets comprueba que el cliente no puede cambiar el formato mediante un campo en el comando de inicio. Tres casos gráficos miden buffers reales en móvil, persistencia, conservación de un tiro y llamadas WebGL al ocultar/mostrar la pestaña. Cinco casos de recuperación cubren recarga durante un golpe, nombres/turno/reloj, control fijo en móvil, tabla entre hoyos, finalización de práctica sin duplicar marcas, descarte y cuota bloqueada. Las capturas se guardan en `work/`.

`PAGES_BASE_PATH=/golf/ VITE_STATIC_HOST=true npm run build` seguido de `npm run test:pages` comprueba la compilación estática para publicar, bajo el prefijo real y sin fallback de rutas. Sus doce pruebas detectan 404 de scripts/fuentes, errores de JavaScript y fallos del golpe; bloquean una descarga para comprobar que la barra espera bytes reales y prueban la recuperación ante fallos del motor o del script inicial. Contra la URL pública se juega un duelo por puntos real, se cambia la calidad y se recuperan turno y formato tras recargar; las tres inyecciones de fallo/espera se reservan al servidor de pruebas. `PUBLIC_GAME_URL` permite repetir esta comprobación contra la URL ya desplegada.

`npm run build`: comprobación TypeScript, cliente en `dist/` y servidor en `dist-server/`. La CI ejecuta los tres comandos. WebGL con renderizado por software permite automatizar estas comprobaciones; no sustituye pruebas de rendimiento en teléfonos físicos.

### Pruebas de comunidad

`npm run test:community` usa PostgreSQL real y no admite sustituirlo por localStorage ni una base simulada. Requiere `TEST_COMMUNITY_DATABASE_URL` local con nombre terminado en `_test`. La suite OIDC/navegador se ejecuta con `npm run test:community:e2e`. Ambas tienen un job propio en GitHub Actions y proveedores/usuarios efímeros solo de pruebas. Consulta [COMMUNITY.md](COMMUNITY.md#pruebas-con-servicios-reales-locales) para levantar los servicios.

## Producción: cliente y servidor en un proceso

```sh
npm ci
npm run build
# Ajusta .env antes de arrancar:
# PORT=3001
# CLIENT_ORIGIN=https://golf.tudominio.com
npm start
```

Node sirve `dist/`, `/health` y Socket.IO. Publica detrás de un proxy con HTTPS y soporte para WebSocket y HTTP long polling. Configura el proxy para reenviar todos los paths al puerto 3001; permite conexiones de más de 60 segundos y upgrades WebSocket. `GET /health` devuelve estado, protocolo de red (15), reglas locales (7), versión, formatos, plazo de reconexión, commit desplegado cuando está disponible, número de salas y capacidad. El cliente rechaza servidores de protocolos anteriores para evitar reglas incompatibles. El proceso debe permanecer activo: un hosting exclusivamente estático no ejecuta las salas.

Para separar cliente y servidor, configura `VITE_SERVER_URL=https://servidor.tudominio.com` **antes de compilar** y `CLIENT_ORIGIN=https://cliente.tudominio.com` en el servidor. `CLIENT_ORIGIN` admite varios orígenes exactos separados por coma. No contiene rutas ni barras finales. Las variables del cliente son públicas; no pongas secretos en `VITE_*`. Node carga `.env` en desarrollo y producción (reinicia el servidor al cambiarlo); Vite carga sus variables al iniciar/compilar.

### Variables

| Variable                   | Uso                                        | Predeterminado          |
| -------------------------- | ------------------------------------------ | ----------------------- |
| `PORT`                     | Puerto del servidor                        | `3001`                  |
| `CLIENT_ORIGIN`            | Orígenes de navegador admitidos            | `http://localhost:5173` |
| `VITE_SERVER_URL`          | Dirección Socket.IO; vacío = mismo origen  | vacío                   |
| `DISCONNECT_GRACE_SECONDS` | Segundos para volver tras un corte (1–300) | `90`                    |
| `MAX_PLAYERS`              | Capacidad online, limitada a 2–8           | `8`                     |

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
- `shared/competition.ts`, `src/MatchFormatPicker.tsx`: puntuación Stableford, empates y selección previa del duelo local/online.
- `shared/highlights.ts`, `src/FinalPodium.tsx`: podio y reconocimientos basados en resultados completos.
- `server/disconnections.ts`: plazo de reconexión y retiro de sesiones caducadas.
- `src/ConnectionSettings.tsx`, `src/onlineServer.ts`, `playwright.online.config.ts`: conexión avanzada y comprobación de la dirección real.
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

Incluye doce tarjetas de recorrido (34 hoyos distintos, vueltas de 9/18 y perfil alternativo de banderas), selección local/online, revancha y recuperación de una partida local en curso. La identidad Battle se apoya en rutas de riesgo, rebotes y ventanas de los obstáculos; **no incluye habilidades ni modificadores**. El Duelo por puntos añade competición local y online con reglas Stableford y las mismas físicas. El final multijugador muestra un podio y reconocimientos calculados a partir de los hoyos completados: ases, hoyos bajo par y vueltas sin penalizaciones ni límites. No hay cámara orbital libre, espectadores, salas públicas, persistencia de salas ni cuentas. El anfitrión puede quitar invitados desconectados del lobby; no puede expulsar rivales conectados en mitad de una partida. Se implementan rampas y barreras giratorias y deslizantes, además de agua con penalización, arena, puentes y saltos producidos por el terreno. Faltan túneles y plataformas que transporten pelotas.

El motor mantiene un solo hoyo visible y una pelota física activa. La calidad automática adapta resolución y sombras; Ahorro las desactiva y Alta permite DPR 2 con sombras de 2048. La geometría fija de cada pista se reutiliza entre actualizaciones y el renderizado se detiene en segundo plano. Faltan pruebas manuales en dispositivos iOS/Android físicos y pruebas de carga de muchas salas. Hay sonidos sintetizados de golpe, rebote, agua, cambios de turno y embocada, con anillos de impacto. El césped utiliza una textura procedural local y el agua una animación ligera. La primera versión prioriza la partida completa y las salas reales.

La compilación avisa de los chunks grandes de Three.js y Rapier: el motor de físicas incluye su WASM. Están separados para caché; el servidor comprime los assets con gzip (aproximadamente 1.2 MB de JavaScript comprimido en total). Conviene mantener compresión y caché al desplegar.

## Despliegue del online por Internet

El servidor público configurado es **https://hoyo-en-uno-golf-club.onrender.com**. Sirve el juego y las salas juntos; GitHub Pages se conecta a esa misma dirección. La publicación de Pages comprueba el servidor con dos clientes reales antes de activar una actualización. Pages por sí solo no ejecuta Node.

### Render · ponerlo online con una cuenta propia

Solo el propietario necesita una cuenta de Render. Los jugadores entran con su nombre y el código/enlace, sin registrarse.

1. [Crea una cuenta en Render](https://dashboard.render.com/register) usando GitHub y permite acceso a `gomeza2/golf`.
2. [Instala el servidor desde este repositorio](https://render.com/deploy?repo=https://github.com/gomeza2/golf). Render leerá `render.yaml`: servicio Node **hoyo-en-uno-golf-club**, construcción y arranque automáticos, plan **Free**, capacidad 8 y reconexión de 90 segundos. Revisa que figure Free antes de confirmar; la disponibilidad y condiciones finales son las que muestre Render.
3. Espera a que termine el despliegue y figure **Live**. Abre la URL HTTPS asignada, por ejemplo `https://NOMBRE-ASIGNADO.onrender.com`. Esa dirección sirve **el juego y el servidor juntos**: no necesitas rellenar la dirección avanzada para jugar desde ella.
4. Crea una sala, copia la invitación y entra desde otro navegador o dispositivo. Prueba ambos formatos y una reconexión. `https://NOMBRE-ASIGNADO.onrender.com/health` debe responder con protocolo 9 y la versión actual.
5. Para activar además el acceso online predeterminado desde GitHub Pages, conserva la URL real en `src/onlineServer.ts`, o configura `VITE_SERVER_URL` en GitHub y publica. Esa URL es pública, no una contraseña. El código ya acepta `https://gomeza2.github.io` y el origen propio del servidor.

El plan Free puede dormir por inactividad y tardar en despertar. Las salas están en memoria: un reinicio/despliegue las pierde. No se afirma que haya un servidor público activo hasta verificar la URL real con dos clientes.

#### Comprobar la URL real

```sh
PUBLIC_ONLINE_URL=https://NOMBRE-ASIGNADO.onrender.com npm run test:online
```

Este comando espera a que `/health` responda con el protocolo correcto y ejecuta tres pruebas con sockets y navegadores contra ese servidor, sin arrancar un servidor de prueba. Comprueba dos embocadas físicas, puntuaciones compartidas, permisos, cambios de reglas y recuperación. Si solo se usa `http://localhost:3001`, se verifica la instalación propia, sin declarar acceso por Internet.

Al configurar `PUBLIC_SERVER_URL` en `src/onlineServer.ts`, la publicación de Pages ejecuta esa comprobación antes de desplegar. En Render espera el commit de la publicación (`RENDER_GIT_COMMIT`); en otros hostings puede informarse mediante `APP_COMMIT`. Sin URL configurada indica explícitamente que se omite la comprobación pública; el servidor local se sigue probando en `test:e2e`. Desarrollo y la aplicación servida por Node conservan conexión al mismo origen. `VITE_SERVER_URL` permite sobrescribir el destino cuando haga falta.

### Contenedor o VPS

```sh
docker build -t club-golf .
docker run --rm -p 3001:3001 -e CLIENT_ORIGIN=https://gomeza2.github.io club-golf
```

El contenedor usa Node 22, usuario sin privilegios y `/health`. La receta del contenedor se conserva; las pruebas de esta versión ejecutan el servidor Node con clientes reales y rechazan los intentos de golpe elevado. Publica el puerto detrás de HTTPS con WebSocket. Las salas requieren una réplica persistente; un reinicio pierde las sesiones en memoria. Las claves no se incluyen en imagen ni repositorio.

## Avance por fases

- Base y partidas locales: implementadas, con 34 hoyos, clasificación, revancha y guardado con recuperación tras recargar.
- Multijugador: salas privadas autoritativas, 2–8 clientes, reconexión, latencia, invitación con servidor y controles de versión. Servidor público en Render, con comprobación de clientes reales antes de publicar Pages. Las salas siguen siendo efímeras.
- Experiencia visual y controles: cámara de seguimiento, carga real, césped procedural, agua animada, impactos, guía corta de dirección, Clásico, Retroceso y Precisión.
- Variedad: rampas, puentes, canales, islas, arena, barreras móviles y elecciones entre ruta segura y salto.
- Pulido: pruebas automáticas de los 34 hoyos, recuperación y casos de red; pendientes pruebas de rendimiento en teléfonos físicos, carga de muchas salas y mecánicas Battle adicionales.

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

La potencia se calibra con distancias reales de rodamiento del motor sobre césped plano. Entre 20 y 75 % se conserva una distancia de referencia aproximadamente proporcional al porcentaje, no una velocidad proporcional: 50 % recorre unos 13 m, 60 % unos 15,5 m y 100 % unos 33–35 m desde la física 2, en la pista de medición sin obstáculos. Por debajo del 20 % una transición suave permite golpes cortos. La velocidad máxima actual es 20 m/s; física original conserva 16,2. Siempre con lanzamiento vertical cero. Arena, pendientes, paredes y agua modifican el resultado real. La guía sigue corta y no muestra el punto final. Servidor y cliente usan protocolo de red 8; las reglas físicas y marcas siguen en v7; los récords anteriores permanecen separados en sus claves v5.

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

## 0.8.0 · Ruinas del Cielo

Selecciona **Ruinas del Cielo** en el catálogo: tres hoyos de 36–44 m, par 13, disponibles en local, entrenamiento y salas online. Se añaden a los 21 existentes; no sustituyen las vueltas de 9/18. El claustro ofrece una pasarela amplia y una diagonal difícil que ahorra un golpe; el templo tiene dos rampas y un pórtico con colisiones; el reloj combina mecanismos y una ruta exterior con rough.

La vegetación y las columnas se agrupan en tres llamadas de dibujo y permanecen fuera de los límites jugables. La bandera se anima, las superficies ganan textura y los impactos añaden partículas. Ahorro reduce la decoración de 14 a cuatro piezas y desactiva esos efectos opcionales; la calidad automática adapta también el detalle. Los reflejos pequeños del agua se agrupan en una llamada por zona. Los recursos procedurales se liberan al cambiar de hoyo/desmontar.

Reglas v7, guardados formato 1 y marcas anteriores conservados. Protocolo de red **9**: actualiza también el servidor y recarga los clientes después de desplegar. `npm run test:online` incluye una comprobación real del nuevo recorrido con dos clientes y puntuación autoritativa. El workflow de Pages la exige antes de publicar.

Auditoría, siguiente entrega y límites: [ROADMAP.md](ROADMAP.md). Al cerrar 0.8.0, el editor, los desafíos periódicos y las copas de varias rondas estaban pendientes. Los desafíos individuales periódicos se incorporan en 0.10.0; el editor y las series online continúan pendientes.

## 0.9.0 · Ver el campo y aprender jugando

**Ver campo** encuadra ahora los límites 3D reales de cada hoyo mediante proyección en perspectiva. Cambia el ángulo en vertical y reserva espacio para el HUD y los controles; se recalcula al girar/redimensionar la pantalla, incluso en los hoyos de 72 m. Mirar conserva sus límites, giro, inclinación y zoom. El seguimiento del golpe mantiene su comportamiento anterior. En pantallas horizontales bajas los controles y el indicador de turno se reorganizan.

Las partidas locales muestran una vista inicial de 2,6 segundos por hoyo, con el reloj y la pelota detenidos. Se puede omitir inmediatamente o desactivar en Ajustes. No se introduce en medio de un golpe ni detiene el servidor online.

En el catálogo pulsa **Aprender jugando** para abrir la Escuela del Club con el control elegido. Son tres ejercicios sobre el jardín real: detener toda la pelota dentro de un aro con un golpe, realizar un rebote de pared y completar el hoyo sin penalizaciones ni límite. Se verifica el movimiento/resultado del mismo Rapier; no se asignan victorias por pulsar Siguiente. El reloj de la escuela se detiene al preparar y al superar cada ejercicio. Puedes reintentar desde la salida o cerrar la guía y seguir en práctica normal.

El progreso se guarda solo en este navegador, separado para Clásico, Retroceso y Precisión (`club-school-v7`). No es un ranking online ni modifica récords de rondas completas. La práctica final puede registrar su medalla ordinaria si se emboca realmente. Una guía en curso se adjunta como metadato opcional al guardado formato 1 y recupera su ejercicio/control; si ese metadato está dañado se ignora y se recupera la práctica física. Los guardados anteriores, récords, 24 hoyos, nueve recorridos, reglas v7 y protocolo 9 permanecen compatibles.

Verificación adicional: proyección de todos los hoyos en tres relaciones de aspecto y varios giros, ejercicios físicos, progreso/cuota, guía recuperada con otra preferencia de control, tiro táctil real, omisión de la vista inicial y cambio de orientación. La comprobación de producción también exige la versión publicada actual y completar una aproximación real de la escuela, además del duelo y recuperación existentes.
