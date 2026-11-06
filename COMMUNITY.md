# Comunidad de canchas — siguiente fase

Estado: todavía no hay publicación comunitaria ni galería online. El taller permite guardar localmente y compartir archivos `.golf.json`. Las salas oficiales funcionan; las creaciones aún no entran en ellas. Este documento describe el contrato pendiente, no una API disponible.

## Orden de implementación

1. Admitir una creación validada en una sala privada. El servidor recibe el documento, ejecuta `parseWorkshop`, valida límites y compila él mismo el `Course`. Fija la geometría y una huella de contenido antes de preparar jugadores. Cada participante recibe ese mismo documento/versión; un diseño no se cambia durante la partida.
2. Probar turnos, reconexión, concesión/límite, resultados, revancha y recursos del servidor. La simulación sigue en `Game`/Rapier. No se aceptan snapshots ni puntuaciones del navegador. Una ronda de creación no genera marcas oficiales.
3. Incorporar almacenamiento central persistente y publicar creaciones con revisión. Render gratuito conserva actualmente las salas en memoria y pierde datos de disco al desplegar: ese disco no se presentará como una comunidad duradera.
4. Construir galería con búsqueda, autoría, revisión, denuncias e historial de versiones. Los enlaces compartidos apuntarán a una revisión inmutable, no al borrador mutable de un navegador.

## Datos y límites

La base es el documento versionado del taller. La creación propuesta conservaría ID estable, revisión, fecha UTC, autor, documento normalizado y huella de contenido. Cada revisión tendría estado pendiente/publicada/retirada y motivo de revisión. El cliente muestra autoría e historial reales, sin usuarios o resultados inventados.

Además de los límites actuales (60 KB/80 piezas/coordenadas y alturas acotadas), el servidor debe comprobar el coste de la geometría compilada: colliders, triángulos, mecanismos, zonas y tiempo de simulación. Rechazará campos, versiones o datos no admitidos. No aceptará scripts, modelos remotos, HTML ni recursos ejecutables.

Una prueba terminada por el servidor puede acreditar que se completó una ruta concreta; no demuestra que todas las rutas sean jugables. Un límite de golpes, concesión o puntuación inválida no dará esa acreditación. La moderación y las denuncias seguirán siendo necesarias. No se inventarán votos o rankings a partir de localStorage.

## Persistencia y acceso

La opción prevista es PostgreSQL gestionado con un plan gratuito disponible (por ejemplo, Supabase o Neon), configurado mediante variables del servidor. Requiere una cuenta del propietario y una conexión provisionada; todavía no hay una base de comunidad conectada. Las credenciales privadas nunca irán en Vite, archivos exportados ni el repositorio.

Jugar y consultar las canchas públicas seguirá siendo posible sin registro obligatorio. Para publicar o administrar revisiones se necesita una identidad verificable y límites de envío; el sistema de autoría, moderación y protección contra spam se implementará con el servicio elegido. Los registros locales de progreso seguirán separados de resultados compartidos.

Hasta que existan ese backend y sus pruebas públicas, el producto conservará el flujo funcional de archivos y no mostrará un botón de publicación ficticio.
