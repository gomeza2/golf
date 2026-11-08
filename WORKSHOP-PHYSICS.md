# Elegir física en una creación · 0.20.0

## Flujo completo

En el taller, **Física de la cancha** ofrece Original y Actual. Los diseños existentes, importados y recién creados mantienen Original hasta una elección explícita del autor. Confirmar cambia solamente el borrador; cancelar lo conserva. Deshacer/rehacer cruza ambas ediciones. Las copias existentes de la biblioteca no cambian al convertir el borrador; Guardar diseño sigue siendo una acción explícita. Exportar/importar y recuperar el borrador conservan la edición.

Actual utiliza el mismo Game/Rapier que los campos oficiales: fuerza máxima progresiva superior al 75 %, impulso vertical inicial cero y restitución de aterrizajes por superficie. Original conserva la respuesta anterior. No se cambia la geometría al convertir ni se concede una ventaja a un jugador sobre los demás de esa misma cancha.

**Probar en 3D** y el juego individual de una publicación usan la edición del documento. En una sala, el servidor valida el documento y obtiene la física de él, sin aceptar una elección enviada por el jugador. La huella del documento fija también su edición. Antes de mostrar una cancha privada, el cliente verifica tanto el hash como la concordancia de `State.physics`. Una discrepancia bloquea la admisión y descarta la sesión.

La edición queda visible en taller, prueba, invitación, lobby, control de partida, galería, página de creación e historial de revisiones. Se puede buscar `physics=1` u `physics=2` en la comunidad.

## Formato, compatibilidad y límites

- Documento **1**: conserva exactamente su canonicalización. No contiene `physics`; se interpreta como edición original.
- Documento **2**: exige `physics: 2`. Omitirlo, declarar otra edición o mezclar marcador físico con documento 1 se rechaza.
- Los campos normalizados y el orden de serialización de documento 1 permanecen iguales. El hash de referencia de una creación previa es `5221543e5046f4f036025f84f05a88902df4e2f47b69179899b78e7464c7f5c0`, contrastado contra el código anterior.
- Volver a Original elimina el marcador de edición actual; con geometría sin cambios recupera la identidad original.
- Se mantienen límites: 60 KB, 80 piezas, dimensiones y alturas, pendientes, espacio libre de copa y presupuesto online de colisiones/triángulos/mecanismos. Ninguna edición omite validaciones.
- No se incorporan recursos nuevos ni se cambia el formato geométrico de las piezas. Una edición nueva no certifica que todas las rutas del autor sean completables: debe volver a probarlas.
- Protocolo online **16**; cliente y servidor deben actualizarse juntos. Las canchas oficiales conservan física 2 y las reglas de puntuación 7. Guardados locales 1/2, desafíos c1 y récords oficiales no se alteran.
- Las partidas de creaciones, sea cual sea su edición, siguen sin escribir récords ni guardados oficiales.

## Comunidad y persistencia

La edición se conserva en el documento JSONB existente y participa en su SHA-256. PostgreSQL sigue usando esquema 1: no requiere una migración adicional ni variables nuevas. Se mantienen autenticación OIDC, permisos de autor, límites de envío, moderación y denuncias.

Convertir un diseño publicado prepara una **nueva revisión**. Debe enviarse y aprobarse con el mismo flujo anterior; no cambia el cuerpo ni el hash de revisiones publicadas. Sus enlaces permanentes siguen cargando y jugando con su física original.

La galería muestra la última revisión publicada de cada creación y filtra por su edición. Un filtro Original no recupera una revisión antigua si la última pública ya usa Actual. El historial y el enlace fijo permiten elegir aquella revisión antigua expresamente. La física mostrada por API se deriva del documento persistido, no de estadísticas o afirmaciones del autor.

La configuración pública anuncia `documentVersions: [1,2]` cuando hay base disponible. Si un servidor anterior no anuncia documento 2, el cliente desactiva ese envío y el filtro por física. No se finge soporte ni se aprovisiona infraestructura. Publicación sigue necesitando PostgreSQL, identidad y moderación reales; jugar, crear e importar localmente no requieren cuenta.

## Verificación

- Pruebas unitarias: SHA legado, importación/exportación, conversión reversible con geometría idéntica, marcadores inválidos, límites, edición de piezas, historial, diferencias reales de alcance y partida privada completa con revancha.
- Cliente de red: no muestra estados cuya física contradice el documento verificado.
- PostgreSQL: publicación autenticada de revisiones 1/2, rechazo de otro autor, consulta desde otra instancia de acceso, filtros de última publicación, hashes distintos y prohibición de reescribir documentos.
- Navegador móvil: cancelación/confirmación, deshacer/rehacer, exportación descargada, biblioteca anterior intacta, recuperación del borrador y dos golpes reales hasta embocar.
- Comunidad/OIDC: edición nueva aprobada, original accesible por enlace, búsqueda por física y juego individual real de ambas.
- Socket.IO: edición actual fijada por el servidor pese a campos extra del cliente, dos drives completos, reconexión con contenido verificado, resultado 2–2 y revancha. Las salas originales mantienen sus pruebas previas.
- Producción: conversión explícita y embocado real bajo el prefijo `/golf/`; la verificación online pública incluye ambas ediciones.

Las pruebas físicas ejecutan golpes/ticks normales. No se teletransportan pelotas ni se asignan puntuaciones para simular un resultado. Compilar y completar rutas automatizadas no demuestra diversión humana ni rendimiento en teléfonos físicos.

## Siguiente fase

Observar a jugadores en las rutas de riesgo y con los tres controles; medir rendimiento en dispositivos físicos. Ampliar recursos del taller manteniendo validaciones, geometría compartida y compatibilidad de documentos. La comunidad pública continúa requiriendo configuración real del propietario.
