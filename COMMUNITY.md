# Canchas privadas y comunidad

## Disponible — 0.16.0

Desde **Taller → Jugar con amigos online** se prepara una sala con una creación. Elige nombre y formato, crea la sala y comparte código o enlace. Los invitados no necesitan importar un archivo: reciben la misma revisión al entrar o reconectar. El servidor vuelve a validar y compilar el documento. Cliente y servidor requieren protocolo 13, HTTPS o localhost para la comprobación SHA-256.

Una sala conserva una sola cancha fija. No se cambia por una copa o un recorrido oficial durante esa sesión. Se puede elegir Menos golpes o Duelo por puntos antes de empezar, disputar el hoyo, ver resultados, jugar revancha y volver al lobby. Para editar o sustituir el diseño, vuelve al taller y crea otra sala. El documento se transmite una vez por admisión/reconexión; los estados periódicos solo llevan su huella. El cliente comprueba la revisión antes de prepararse, y el servidor sigue validando golpes y turnos.

La partida privada tiene reloj de 30 s, límite de 12 golpes y las reglas habituales de desconexión y recuperación. La prueba individual del taller conserva su reloj libre. El par, la clasificación, las estadísticas y los resultados de la cancha privada usan su propio trazado y no generan récords oficiales, progresión de retos ni guardados de rondas oficiales.

La validación comprueba estructura, salida y copa, límites y presupuesto: 60 KB, 80 piezas, hasta 220 colliders, 2048 triángulos y ocho mecanismos. No certifica que haya una ruta completada. Se conservan concesión y límites para terminar también un diseño imposible. No admite scripts ni recursos remotos. SHA-256 identifica la revisión; las puntuaciones proceden de Rapier y las reglas del servidor, no de datos enviados por jugadores.

**Persistencia actual:** las salas y sus diseños permanecen en memoria. Una desconexión temporal permite recuperar la sesión; un reinicio/despliegue elimina la sala. Guarda/exporta la creación desde el taller para conservarla. No hay galería, publicación comunitaria, autoría verificada ni enlaces permanentes a creaciones todavía.

## Orden de implementación

1. **Implementado en 0.16.0:** admitir una creación validada en una sala privada. El servidor recibe el documento, ejecuta `parseWorkshop`, valida límites y compila él mismo el `Course`. Fija la geometría y una huella de contenido antes de preparar jugadores. Cada participante recibe ese mismo documento/versión; un diseño no se cambia durante la partida.
2. **Implementado y probado en automatización:** turnos, recepción/reconexión, límite/reloj, resultados, revancha y presupuesto de recursos. Completar ensayos humanos y carga concurrente. La simulación sigue en `Game`/Rapier. No se aceptan snapshots ni puntuaciones del navegador. Una ronda de creación no genera marcas oficiales.
3. Incorporar almacenamiento central persistente y publicar creaciones con revisión. Render gratuito conserva actualmente las salas en memoria y pierde datos de disco al desplegar: ese disco no se presentará como una comunidad duradera.
4. Construir galería con búsqueda, autoría, revisión, denuncias e historial de versiones. Los enlaces compartidos apuntarán a una revisión inmutable, no al borrador mutable de un navegador.

## Datos y límites

La base es el documento versionado del taller. La creación propuesta conservaría ID estable, revisión, fecha UTC, autor, documento normalizado y huella de contenido. Cada revisión tendría estado pendiente/publicada/retirada y motivo de revisión. El cliente muestra autoría e historial reales, sin usuarios o resultados inventados.

Además de los límites actuales (60 KB/80 piezas/coordenadas y alturas acotadas), el servidor debe comprobar el coste de la geometría compilada: colliders, triángulos, mecanismos, zonas y tiempo de simulación. Rechazará campos, versiones o datos no admitidos. No aceptará scripts, modelos remotos, HTML ni recursos ejecutables.

Una prueba terminada por el servidor puede acreditar que se completó una ruta concreta; no demuestra que todas las rutas sean jugables. Un límite de golpes, concesión o puntuación inválida no dará esa acreditación. La moderación y las denuncias seguirán siendo necesarias. No se inventarán votos o rankings a partir de localStorage.

## Persistencia y acceso

La opción prevista es PostgreSQL gestionado con un plan gratuito disponible (por ejemplo, Supabase o Neon), configurado mediante variables del servidor. Requiere una cuenta del propietario y una conexión provisionada; todavía no hay una base de comunidad conectada. Las credenciales privadas nunca irán en Vite, archivos exportados ni el repositorio.

Jugar y consultar las canchas públicas seguirá siendo posible sin registro obligatorio. Para publicar o administrar revisiones se necesita una identidad verificable y límites de envío; el sistema de autoría, moderación y protección contra spam se implementará con el servicio elegido. Los registros locales de progreso seguirán separados de resultados compartidos.

Hasta que exista el backend comunitario, se pueden compartir archivos y jugar creaciones en salas privadas. No se muestra un botón de publicación ni una galería ficticia.
