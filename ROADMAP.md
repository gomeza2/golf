# Evolución total del club

## Entrega actual — 0.22.0, Fase 1 del editor 3D

La prioridad solicitada concentra la entrega en editor, construcción y visualización. Se añade área 3D orbital con cuatro vistas, selección real, manipuladores y acceso a capas superpuestas. La edición conserva plano, propiedades e historial; grupos/bloqueos se guardan en un proyecto separado del documento jugable. Estructuras reutilizables y laboratorio con ruta física comprobada, avisos por niveles, alturas libres y pasos estrechos. El regreso de la prueba conserva construcción y cámara.

Se conservan documentos 1/2/3, protocolo 17, física 1/2, reglas 7, guardados/records, 34 hoyos oficiales y las funciones previas. [EDITOR-3D-PHASE1.md](EDITOR-3D-PHASE1.md) reúne auditoría, implementación, pruebas, compatibilidad y límites.

**Cierre:** no se inicia la fase 2. Quedan para evaluación manual la comodidad con personas, teléfonos físicos y sesiones largas con estructuras complejas. La activación de comunidad gratuita sigue pendiente de cuentas/variables del propietario, sin bloquear el editor ni convertirse en una nueva fase automática.

## Entrega anterior — 0.21.0, recursos del taller y activación gratuita

Tres recursos físicos nuevos con adopción explícita del documento 3: giro completo, puerta elevable y tierra. Dos ejemplos editables con rutas seguras/arriesgadas comprobadas, conservación del borrador y mapa de mecanismos en vivo. La nueva geometría comparte compilación, pose y presupuesto con Rapier/Scene/servidor. Documentos 1/2 mantienen hashes y comportamiento; 34 hoyos oficiales, todos los modos y datos intactos. Protocolo 17, física 1/2, reglas 7 y esquema PostgreSQL 1.

Se resuelve el acceso a migración en hosting gratuito sin Shell mediante preparación opcional e idempotente; no inserta cuentas o publicaciones. Diagnóstico de base/OIDC sin secretos. Guía concreta Neon Free + Auth0 Free sobre Render, con pasos de cuenta real, permisos y publicación/reinicio. [WORKSHOP-RESOURCES.md](WORKSHOP-RESOURCES.md) y [FREE-COMMUNITY-SETUP.md](FREE-COMMUNITY-SETUP.md).

**Siguiente fase:** el propietario debe crear esas cuentas y configurar las variables privadas para activar la galería pública; luego verificar acceso/moderación/publicación y permanencia tras reinicio. Sesiones con amigos y móviles físicos para equilibrar tiempos de mecanismos y rutas. Colecciones de varios hoyos del taller, carga concurrente y persistencia de copas siguen pendientes; no se simulan.

## Entrega anterior — 0.20.0, física elegida y verificada en las creaciones

El autor puede adoptar explícitamente física actual mediante documento 2 o conservar documento 1/original. Confirmación, deshacer/rehacer, borrador, biblioteca, exportación/importación y prueba 3D conservan la elección. La huella incluye la edición; servidor y cliente contrastan contenido y física antes de mostrar una cancha privada.

La comunidad mantiene versiones inmutables con edición visible y búsqueda por física. Una revisión nueva necesita los mismos permisos y moderación; no cambia el cuerpo ni los enlaces de la anterior. JSONB existente conserva ambas; esquema PostgreSQL 1 sin migración adicional. Capacidades del servidor impiden ofrecer publicación de formatos no soportados. Protocolo 16, reglas de puntuación 7 y guardados originales intactos. [WORKSHOP-PHYSICS.md](WORKSHOP-PHYSICS.md) documenta la entrega.

**Siguiente fase:** pruebas humanas de los recorridos y las ventanas de control, medidas en teléfonos físicos y ampliación cuidadosa de recursos del taller con presupuestos comprobados. La activación pública de comunidad aún necesita infraestructura real del propietario. No se presenta una galería poblada o una publicación disponible sin esos servicios.

## Entrega anterior — 0.19.0, Tierras bravas y aterrizajes

Campos extensos con huellas abiertas sobre agua: presa con salto real, escalera de ocho metros y delta de tres rutas. Geometría, colisiones, mapa y servidor comparten Course. Potencia superior progresiva, aterrizajes por superficie y salpicaduras a la altura real del agua. No se añade golpe elevado ni trayectoria resuelta.

Una edición de física explícita conserva guardados originales, desafíos c1 y documentos del taller 1; rondas oficiales nuevas usan física 2. Récords originales visibles y almacenados sin sobrescribir; nuevas marcas separadas. Catálogo ampliado sin renumerar prácticas anteriores ni cambiar las vueltas de 9/18. Puntuación 7, protocolo 15. [PHYSICS-AND-WILDLANDS.md](PHYSICS-AND-WILDLANDS.md) recoge verificación y límites.

**Siguiente fase:** sesiones con personas y teléfonos físicos para ajustar lectura de alturas, ventanas de mecanismos, cámara y fuerza máxima. Preparar documento 2 con adopción explícita de física nueva para creaciones, conservando revisiones publicadas inmutables. La comunidad pública sigue necesitando PostgreSQL, identidad y moderación reales del propietario; no se inventan estadísticas ni disponibilidad.

## Entrega anterior — 0.18.0, dominio de Retroceso y Precisión

La siguiente fase se centra en controles antes de ampliar campos. Se corrige la imposibilidad práctica de preparar putts inferiores a 6,7 % en el arrastre normal mediante una sensibilidad fina opcional de 3–35 %. La zona de cancelación refleja el estado real, y Más ajustes revela dirección/referencia en los tres esquemas. Precisión incorpora lectura de desvío, referencia elegida y análisis de la suelta, manteniendo sus dos oscilaciones y dificultad.

Los eventos de entrada proporcionan la marca temporal de preparación/suelta, con fallback para relojes incompatibles. Perder captura cancela; las lecturas se limpian al cambiar turno/hoyo/ronda. El arrastre fino es una sensibilidad, no un cambio de esquema. Física, fuerza máxima normal, 31 hoyos, editor, comunidad, modos y datos previos conservados. Reglas 7 y protocolo 14 permanecen. [CONTROLS.md](CONTROLS.md) recoge límites y verificación.

**Siguiente fase:** observar puntería, cancelaciones, tiros cortos y ventanas de suelta con personas y teléfonos físicos. Ajustar sensibilidad/cámara con esos resultados antes de endurecer las curvas o agregar escenarios. La activación pública de comunidad sigue requiriendo PostgreSQL, identidad y moderación del propietario.

## Entrega anterior — 0.17.0, bienvenida y comunidad persistente

La auditoría de primera impresión adelanta accesibilidad al juego frente a más contenido. Portada con entrada rápida/online, guía visual basada en la escuela existente, potencia inicial suave, feedback de contacto y paso directo a una vuelta de tres hoyos. Partidas recuperables, todos los campos/modos y las funciones previas se conservan. [FIRST-IMPRESSION.md](FIRST-IMPRESSION.md) documenta hallazgos y límites de las pruebas.

Implementado PostgreSQL con migración versionada, autoría ligada a OIDC, publicación pendiente, revisiones inmutables, galería/filtros/paginación y enlaces permanentes. Juego individual y salas por referencia de revisión que reutilizan motor/documentos y mantienen la geometría fija. Denuncias y decisiones registradas, retirada/restauración y modos explícitos sin configuración o solo lectura. Documento 1, guardado 1 y reglas 7; protocolo 14.

Las suites de PostgreSQL y OIDC/navegador usan servicios reales locales y se añaden a CI. No hay base o identidad de producción provisionadas en el repositorio: activar requiere variables y migración, detalladas en [COMMUNITY.md](COMMUNITY.md). El producto no presenta publicación o datos comunitarios ficticios cuando falta esa configuración.

**Siguiente fase:** activar la infraestructura real del propietario y ensayar moderación/balance con personas; medir carga y respaldos. Después ampliar recursos y colecciones del taller sin romper documentos v1, y revisar Retroceso/Precisión con controles táctiles/teclado y física compartida. El caso anterior de pausa comprueba ahora un tiro distinto para ajustes, evitando exigir movimiento a una pelota ya detenida. La prioridad siguiente es observar jugadores nuevos y un grupo de amigos antes de ampliar contenido.

## Entrega anterior — 0.16.0, jugar creaciones con amigos

Taller → preparación online → sala privada con documento validado y presupuesto, revisión SHA-256 fija, sincronización por admisión/reconexión y simulación autoritativa. Un hoyo completo con golpes/puntos, reloj, resultados, reconexión y revancha. Guardados/records oficiales y prueba local libre se mantienen separados.

**Siguiente fase:** publicación persistente de creaciones y galería real, con revisiones inmutables, autoría, moderación y almacenamiento central. Antes de abrir envíos públicos, completar pruebas de carga y sesiones humanas de creaciones. Luego revisar Retroceso/Precisión con pruebas de gesto/momento y sin modificar la física por control. [COMMUNITY.md](COMMUNITY.md) detalla lo disponible y lo pendiente.

## Entrega anterior — 0.15.0, alturas y rutas de riesgo

La prioridad nueva del usuario adelanta contenido más variado después de cerrar las herramientas del taller. Cumbres y Mareas incorpora tres lugares y geometrías: descenso de ocho metros, faro en espiral ascendente y dos alturas con compuertas/túnel/viaductos. Se comprobaron rutas amplias y arriesgadas con física real y se equilibró el frenado para evitar esperas en una bajada válida. Los 28 hoyos previos y todos los modos/datos permanecen.

El nuevo mecanismo vertical usa la misma pose en servidor, escena y mapa. El contenido eleva el protocolo a 12; reglas v7 y guardados formato 1 se conservan, sin renumerar prácticas de banderas cruzadas. El catálogo y entrenamiento permiten jugarlo individualmente o con amigos en las salas existentes.

**Siguiente fase:** contenido creado por jugadores en una sala privada, validado y fijado por el servidor; luego comunidad con almacenamiento central, revisiones/autoría y publicación real. [COMMUNITY.md](COMMUNITY.md) define el trabajo y los servicios pendientes. Después revisar Retroceso y Precisión sin perder sus diferencias, con pruebas táctiles/teclado y sin alterar la física por esquema. La galería no se simulará con localStorage. Faltan ensayos humanos, hardware físico y pruebas de carga.

## Entrega anterior — 0.14.0, construir con precisión y revisar en 3D

Se implementan selección y transformaciones de grupos, arrastre sin deformación, ajuste de cuadrícula, atajos y un paso de historial por operación. Se extraen transformaciones puras e importador/selección en módulos propios. La inspección usa la cámara existente y bloquea el tiro, sin cambiar puntería ni física. Los avisos de suelo son aproximados y no se confunden con una certificación de jugabilidad.

Conservados documentos/guardados, todos los recorridos y modos, y las salas oficiales. No se admiten diseños personalizados online todavía. El formato v1 no cambia: las herramientas producen el mismo documento validado, listo para la siguiente fase.

**Siguiente fase:** contrato de contenido para partidas privadas de creaciones: validar documento completo, límites/versión y geometría en el servidor; fijar el contenido antes de empezar, sincronizarlo con la sala y comprobar turnos, reconexión, límites y resultados sin aceptar snapshots/puntuaciones del cliente. Primero una sola cancha privada, después recorridos. Enlaces duraderos/galería requieren persistencia central. Mantener pendientes ensayos humanos de Al Filo, hardware móvil y muchas salas.

## Entrega anterior — 0.13.0, taller local con prueba real

El siguiente paso tras las canchas Al Filo es permitir construir otras decisiones sin duplicar el juego. Se implementa documento v1 validado/acotado, compilación a `Course`, editor de piezas y marcadores, arrastre, propiedades, historial, borrador/biblioteca local y archivo `.golf.json`. El mismo Game/Rapier/Scene prueba el diseño y su copa físicamente abierta; los resultados de prueba se aíslan de los datos oficiales.

Se conserva íntegro el contenido oficial y el online. Las creaciones no entran en las salas todavía: compartir ahora consiste en exportar/importar archivos. No se implementa una galería ficticia ni un ranking local presentado como global. No se puede certificar la jugabilidad solo con validación de campos.

**Siguiente fase:** ampliar el taller con inspección 3D y herramientas de precisión/selección múltiple, reforzar comprobaciones geométricas y preparar un protocolo de contenido validado antes de permitir partidas privadas de creaciones. Conservar la separación entre documentos y snapshots, limitar carga/tamaño por servidor y probar rondas reales compartidas. La galería y enlaces duraderos requieren persistencia central real. Continuar el equilibrio humano de Al Filo y ensayos en teléfonos físicos/concurrencia.

## Prioridad anterior — 0.12.0, canchas que cambien la decisión

La revisión de 0.11.0 encontró que muchas pistas conservaban un perímetro rectangular con una línea de ataque demasiado parecida. La prioridad solicitada pasa a ser el diseño del campo antes del taller. Se preservan los 24 hoyos anteriores por compatibilidad y se crea una entrada principal distinta: **Al Filo**, cuatro huellas sobre agua, rutas amplias y atajos estrechos, anillo físico y descenso diagonal.

Abiertas y Cruzadas cambian las copas de los mismos cuatro campos, con registros independientes. La Copa Al Filo usa ambas vueltas en las salas existentes. No se duplica el motor, la competición ni el transporte. Las nuevas estructuras comparten geometría y rotación entre física, escena y mapa; no tienen un relleno rectangular invisible.

Verificación: rondas completas con rutas amplias y atajos en ambos perfiles, penalización de fallos, compuerta cerrada, soporte del anillo, pendiente y recuperación de snapshot. Navegador completa la nueva ronda, conserva perfil y juega un duelo con dos sockets. La publicación exige además el nuevo puente en el cliente estático y contra el servidor público.

**Siguiente fase:** recoger resultados de amigos en Al Filo, estudiar dispersión real de puntuaciones y puntos de caída, y ajustar dificultad con esas evidencias; después construir el documento versionado/validado del taller y una prueba real con el mismo motor. Siguen pendientes persistencia central de salas/copas, editor visual, mediciones en teléfonos físicos y carga concurrente. No se declara todo el plan terminado.

## Auditoría de partida — main 05a4ce7, versión 0.7.0

Se revisaron las definiciones y geometrías, Rapier y reglas de partido, entradas y tres controles, cámara y efectos, guardado/recuperación, récords, lobby y servidor Socket.IO, configuración Render/Pages y pruebas.

| Área existente       | Resultado y decisión                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React/TypeScript/R3F | Separación útil entre motor e interfaz. `main.tsx` concentra conexión y navegación; extraerlas antes de añadir más modos. Conservar el catálogo único.                                                       |
| Física               | Rapier a 60 Hz, golpe normal horizontal, superficies compartidas, copa abierta, recuperación y energía limitada. No recalibrar distancias sin una regresión física completa.                                 |
| Contenido            | 21 hoyos únicos, ocho selecciones, vueltas de 9/18 y tres ases comprobados. Ampliar al final de las listas para conservar las claves de práctica.                                                            |
| Juego                | Local 1–8, online 2–8, golpes y Stableford, honores, entrenamiento y tres controles. No duplicar salas ni competición.                                                                                       |
| Datos locales        | Snapshot Rapier, reglas v7, formato 1, récords/prácticas separados. Mantener claves y geometrías antiguas.                                                                                                   |
| Online público       | Render y Pages ya configurados; la publicación de 0.7.0 pasó dos pruebas públicas contra Render y la comprobación de Pages. No confundir este resultado con disponibilidad permanente o una prueba de carga. |
| Renderizado          | Calidad automática y suspensión en segundo plano existentes. Árboles individuales y muchas piezas pequeñas de reflejos son candidatos a agrupar. La nueva decoración sustituye a la anterior.                |
| Validación           | 122 pruebas de reglas, 37 de navegador y cuatro de producción previas. Casos de controles, tacto, rondas completas, reconexión y guardado ya existentes.                                                     |

## Entrega 0.8.0 — mundos con decisiones

Implementado: **Ruinas del Cielo**, tres hoyos nuevos y 24 en total, nueve recorridos. Ruta amplia frente a puente diagonal que permite ahorrar un golpe; dos rampas a un templo con pórtico físico; reloj de piedra con mecanismos y desvío por rough. Misma fuente de geometría para representación y colisiones. Vuelta segura real de 3/3/4 golpes; atajo inicial real de dos.

Ambientación instanciada fuera de los límites jugables, variantes de jardín/luna/ruinas, bandera de tela animada, texturas de superficies y partículas de impacto. Ahorro conserva lectura del terreno con cuatro decoraciones, sin partículas/bandera animada/reflejos pequeños. Alta usa 14, automática 4/8/14. Las animaciones nuevas de bandera y partículas respetan movimiento reducido. No se modifica la trayectoria para producir un efecto visual.

Compatibilidad: se conservan los 21 hoyos, ocho selecciones, turnos, controles, guardados y récords. Reglas v7 y formato 1 intactos; protocolo de red 9 para impedir conectar un catálogo nuevo con un servidor antiguo. Los despliegues/reinicios de Render siguen perdiendo las salas en memoria.

La verificación de publicación incluye ahora tres pruebas públicas: dos anteriores y una con dos clientes que completan el nuevo puente y reciben la misma puntuación del servidor. Un fallo impide publicar Pages.

## Próximas entregas, en orden

1. **Cámara y entrada al juego — implementada en 0.9.0.** Encuadre por proyección del volumen real en el espacio útil; vista local de 2,6 s omisible; Escuela del Club con tres objetivos físicos, los tres controles, progreso local y guía recuperable. Se comprobaron geometría proyectada, orientación, tiros reales, tacto y persistencia. Continúan pendientes las mediciones en teléfonos físicos.
2. **Desafíos del club — implementados en 0.10.0.** Selecciones diarias/semanales deterministas de contenido comprobado, objetivos completos y resultados personales separados. Compartir el mismo desafío por enlace. No presentar datos locales como un ranking compartido; sin recompensas que alteren la física.
3. **Copas entre amigos — implementadas en 0.11.0.** Series de rondas dentro de la sala, acumulación autoritativa, revancha y resultados de la serie recuperables durante una desconexión. Definir abandono y empates antes de incorporar interfaz. Persistencia entre reinicios requerirá almacenamiento central real.
4. **Taller de hoyos.** Aprovechar `Course`, `Block`, `Zone`, `geometry()` y `blockPose()`. Primero documento versionado/validado y prueba con el mismo Rapier; después colocar, mover, girar, deshacer y configurar salida/copa. Guardar/exportar/importar creaciones locales explícitas; los circuitos compartidos online deberán ser validados por el servidor. No aceptar snapshots físicos enviados por jugadores. Galería comunitaria y enlaces duraderos necesitan almacenamiento y moderación, aún no implementados.
5. **Mundos y progresión.** Ciudad en miniatura, industria, cascadas y movimientos nuevos con colisiones compartidas; medallas, historial y cosméticos sin ventajas. Incorporar cada mundo solo después de completar sus rutas reales.

No hay botones anticipados para funciones pendientes. Cada entrega exige compilación, reglas, ronda física, navegador, producción, revisión visual y prueba pública cuando afecta al online. Antes de escalar: teléfonos iOS/Android físicos, sesiones humanas largas y carga de varias salas. El número de llamadas de dibujo reducido no equivale a una mejora de FPS ya medida en esos equipos.

## Base de 0.9.0, completada en 0.10.0

La prioridad de 0.9.0 era desarrollar desafíos del club y extraer la conexión de `main.tsx`; ambos bloques se implementan en la entrega 0.10.0 descrita a continuación. La lógica nueva de escuela ya está separada en reglas puras (`school.ts`), estado (`useGolfSchool.ts`) e interfaz (`GolfSchool.tsx`); la presentación inicial está en `useHoleIntro.ts`. No reutilizar el progreso local como clasificación global.

La entrega 0.9.0 mantiene los 24 hoyos/nueve recorridos y sus identidades. No añade una base de datos, cuentas ni editor superficial. La verificación pública exige la versión desplegada y completar el objetivo de aproximación, además de las salas/tiros reales.

## Entrega 0.10.0 — retos del club y transporte desacoplado

El siguiente objetivo de alto impacto era dar motivos concretos para volver sin añadir geometría repetida ni alterar los tiros ya equilibrados. Se implementan retos diarios y copas semanales **individuales**, con fecha UTC, circuitos versionados, objetivos, medallas y marcas personales locales. El mismo enlace prepara el mismo reto; sus reglas no cambian durante una vuelta. Se preservan el catálogo y todas las pistas, modos, controles, escuela y guardados.

La conexión sale de `main.tsx` hacia `onlineConnection.ts`, con contrato de transporte comprobable y callbacks anulados al salir. Se mantienen servidor autoritativo, reconexión, salas privadas y protocolo 9. La preparación común de juegos locales se reúne en una función sin duplicar motor ni puntuación.

**Prioridad de 0.10.0, resuelta en 0.11.0:** copas entre amigos como series reales en las salas existentes: selección de varias vueltas, clasificación acumulada del servidor, revancha y abandono/reconexión definidos. Los retos actuales no se presentan como copas online. Persistir series tras reiniciar Render requerirá almacenamiento central; no convertir localStorage en ranking compartido. Después: documento versionado/validado para el taller de hoyos, con la misma geometría y Rapier.

## Entrega 0.11.0 — competir por la serie completa

Las copas se implementan sobre la sala Socket.IO existente: actas y ranking de servidor, vueltas con el mismo Rapier/definiciones de pistas, formatos por golpes y puntos, transición validada, honores, abandono y recuperación entre vueltas. No se duplica transporte ni se permite enviar resultados desde el navegador. La cesión voluntaria con límite permite terminar un hoyo difícil pagando su coste real. La copa cerrada conserva su resultado; una revancha crea actas vacías.

La interfaz añade selector en lobby, consulta compacta dentro del juego y tabla de vueltas en resultados. Se conservan las partidas únicas, todos los recorridos, entrenamiento, tres controles y desafíos individuales. El protocolo cambia a 10; las reglas físicas y guardados locales permanecen en v7/formato 1. Las actas no sobreviven a reinicios del servidor.

**Prioridad prevista al cerrar 0.11.0 (reordenada por Al Filo en 0.12.0):** base del taller de hoyos: documento versionado y validado que reutilice `Course`, `geometry()` y Rapier, con colocación de paredes/rampas/superficies, salida y copa, deshacer y prueba real. Primero guardado/exportación local explícitos; compartir online requerirá validación de geometría y límites por servidor. Historial de copas durable y rankings compartidos requieren persistencia central y siguen pendientes. Mantener pendientes los ensayos prolongados en teléfonos físicos y pruebas de muchas salas simultáneas.
