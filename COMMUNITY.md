# Comunidad de creaciones — 0.21.0

**Ediciones físicas:** documento 1 mantiene física original; documentos 2 y 3 requieren `physics: 2`; el 3 admite giro completo, puerta elevable y tierra. La elección se guarda dentro del JSONB inmutable y su hash. No se reescriben revisiones anteriores ni hace falta una migración adicional. Nuevo servidor y cliente usan protocolo 18. [WORKSHOP-PHYSICS.md](WORKSHOP-PHYSICS.md) explica la conversión explícita y las pruebas de compatibilidad.

`GET /api/community/config` declara `documentVersions: [1,2,3]` cuando la base está disponible. Los clientes no ofrecen enviar un documento a un servidor que no lo anuncia. Galería y detalles incluyen `physics`; el historial identifica ambas ediciones. El filtro `physics=1|2` aplica a la última revisión pública de cada creación; las anteriores siguen disponibles por enlace fijo. No se vuelve a mostrar una revisión antigua en la galería solamente para coincidir con un filtro.

## Qué está implementado

La comunidad usa **PostgreSQL real**, con autores vinculados a una identidad OIDC, creaciones, revisiones inmutables, denuncias y un historial de moderación. No usa localStorage como base pública ni crea cuentas, votos, partidas o estadísticas de ejemplo.

- Galería pública paginada, planos del diseño real y búsqueda por nombre/descripción, alias de autor, ID de autor, dificultad, física y características.
- Características calculadas desde el documento: agua, arena, tierra, césped alto, rampas, alturas, mecanismos y pasos estrechos. La dificultad es una indicación del autor; no una certificación automática.
- Publicación autenticada en estado **En revisión**. Solo una decisión del moderador la hace pública.
- Página de creación y enlaces a cada revisión. Una nueva versión no modifica la anterior; si está pendiente, la última aprobada sigue disponible.
- Juego individual con el mismo Game/Rapier/Scene y resultado real, separado de los récords oficiales. No exige cuenta.
- Invitación a una sala privada por referencia `{id, revision}`. El servidor carga y valida esa revisión desde PostgreSQL: no acepta una geometría enviada por el cliente como si fuera la publicación.
- Edición de una nueva revisión en el taller. Se conserva una copia del borrador anterior en la biblioteca antes de sustituirlo; si no puede guardarse, la operación se detiene con un error. El contexto de revisión sobrevive a una recarga de la misma sesión.
- Denuncias autenticadas, deduplicadas por persona/revisión; cola de moderación, aprobación, rechazo, retirada, restauración y cierre de denuncias con motivo.
- Historial de decisiones persistente y de solo anexado. El contenido y los identificadores de cada revisión no pueden actualizarse ni borrarse mediante las operaciones normales de la base.

La publicación conserva los documentos del taller **v1/v2/v3: una cancha de un hoyo**. No se agrega un editor de colecciones de varios hoyos ni se reescriben los recorridos oficiales existentes; las selecciones oficiales nuevas se definen en el catálogo del juego. El protocolo de salas es **18**, las reglas locales siguen en **7** y el guardado oficial conserva formatos **1/2**.

## Estado público y configuración incompleta

El repositorio contiene la implementación, migración, integración OIDC y pruebas. **No contiene una conexión de producción a PostgreSQL, una cuenta de identidad ni credenciales inventadas.** Configurar el código no provisiona esos servicios.

`GET /api/community/config` comprueba la base y la versión del esquema:

| Configuración                                       | Interfaz y permisos                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Sin base, base caída o migración pendiente          | Estado no disponible, recuperación visible; sin tarjetas ficticias ni publicación. El golf oficial y las salas del taller continúan. |
| PostgreSQL listo, identidad/moderadores incompletos | Galería y juego públicos de las revisiones existentes; publicación y administración desactivadas.                                    |
| PostgreSQL, OIDC y moderadores listos               | Acceso de autores, envíos a revisión y moderación protegidos.                                                                        |

El taller solo muestra **Publicar en la comunidad** cuando el servicio anuncia que los envíos están configurados. Una búsqueda fallida no se sustituye por registros locales ni resultados inventados.

## Opción gratuita y hosting sin Shell

[FREE-COMMUNITY-SETUP.md](FREE-COMMUNITY-SETUP.md) explica Neon Free + Auth0 Free en el Render existente. Requiere cuentas reales del propietario; no están provisionadas por el repositorio. Con `COMMUNITY_MIGRATE_ON_START=true`, `npm start` prepara el esquema si falta y conserva los datos existentes, sin sembrar usuarios o publicaciones. Rechaza una versión de esquema superior. La opción viene desactivada y un fallo no bloquea el golf oficial.

`npm run community:check` (o `community:check:production` sobre el build) diagnostica conexión/esquema y descubrimiento/claves OIDC sin imprimir conexiones privadas ni tokens. Audiencia, callbacks y propiedad del usuario moderador se comprueban entrando realmente. No confundir configuración presente con acceso público comprobado.

## Activar PostgreSQL

1. Provisiona una base PostgreSQL mantenida por el propietario, por ejemplo en un proveedor gestionado compatible. La aplicación no exige un proveedor específico.
2. Define `COMMUNITY_DATABASE_URL` **solo en el servidor**. Usa las credenciales reales y la configuración TLS del proveedor; no desactives la verificación del certificado.
3. Instala y aplica la migración:

```sh
npm ci
npm run community:migrate
npm run build
npm start
```

Los comandos cargan `.env` si existe. En un despliegue ya compilado:

```sh
npm run community:migrate:production
```

La migración es transaccional, usa un bloqueo asesor y se puede repetir. No siembra publicaciones ni cuentas. Rechaza un esquema más nuevo para evitar degradarlo. El servidor no ejecuta migraciones destructivas al arrancar.

El esquema `golf_community` contiene `authors`, `creations`, `revisions`, `reports`, `moderation` y `migrations`. Las restricciones de PostgreSQL mantienen unicidad, relaciones, estados y contenido inmutable. El pool limita conexiones y tiempos de consulta.

Los datos no se escriben en el disco efímero de Render. Reiniciar o desplegar el servidor no borra PostgreSQL. Conserva el servicio de base de datos y configura sus copias de seguridad; retirar una publicación conserva su historial, no elimina sus documentos de la base.

## Configurar identidad y moderadores

Se requiere un proveedor OIDC con **Authorization Code + PKCE S256**, descubrimiento OpenID y access tokens JWT firmados RS256 o ES256 para una audiencia de API. Por ejemplo, una aplicación SPA y una API en Auth0, o configuración equivalente de Keycloak. No se exige registro para explorar o jugar.

Variables del servidor:

| Variable                       | Valor real que debe proporcionar el propietario                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `COMMUNITY_OIDC_ISSUER`        | Emisor exacto del token, incluida su barra final si el proveedor la utiliza. HTTPS en producción.                  |
| `COMMUNITY_OIDC_CLIENT_ID`     | Identificador público de la aplicación SPA. No es un client secret.                                                |
| `COMMUNITY_OIDC_AUDIENCE`      | Audiencia del access token para la API de comunidad.                                                               |
| `COMMUNITY_OIDC_JWKS_URL`      | Endpoint HTTPS de claves públicas del proveedor.                                                                   |
| `COMMUNITY_OIDC_SCOPE`         | `openid profile` por defecto; añade solo scopes configurados en el proveedor.                                      |
| `COMMUNITY_MODERATOR_SUBJECTS` | Valores exactos `sub` de los moderadores, separados por coma. No alias, emails ni roles enviados por el navegador. |

Registra como callbacks las direcciones de la aplicación que realmente utilices, por ejemplo la raíz del servidor y `/golf/` en Pages. Autoriza sus orígenes web en el proveedor para el intercambio PKCE. Para desarrollo, registra `http://localhost:5173/`. La API rechaza emisores/audiencias incorrectos, firmas inválidas y tokens caducados. Un ID token para el cliente no sustituye al access token de la API.

El acceso del navegador usa `oidc-client-ts`; el servidor verifica con `jose`. Los tokens de sesión quedan en sessionStorage, no en localStorage ni en enlaces de invitación. No se incluyen en el código del juego ni se aceptan roles del cliente. El alias público se elige al publicar; la autoría está ligada al ID estable de la cuenta verificada, no a ese alias.

La API de comunidad se elige desde la configuración de despliegue, **no** desde el parámetro de invitación `server=`. Esto evita enviar credenciales de publicación a un servidor de salas elegido por un enlace externo.

## Cliente separado / GitHub Pages

- `VITE_COMMUNITY_SERVER_URL` fija opcionalmente el origen de la API antes de compilar. Sin él, Node usa mismo origen; Pages usa su servidor online configurado.
- Es una URL pública de API, nunca una conexión PostgreSQL, un token o un secreto.
- Incluye el origen de Pages en `CLIENT_ORIGIN` del servidor. El origen propio de Node se admite automáticamente.
- Detrás de un único proxy de entrada de Render, configura `COMMUNITY_TRUST_PROXY_HOPS=1`. Localmente usa `0`. Solo se deben confiar saltos de proxy controlados por el operador.
- Después de cambiar variables del cliente recompila; después de cambiar variables del servidor reinicia y recarga el navegador.

## Flujo de uso

### Autor

1. Abre el taller, crea y prueba el diseño.
2. **Publicar en la comunidad**, entra con tu cuenta y completa alias, descripción y dificultad.
3. Envía a revisión y consulta **Mis publicaciones**. Hasta aprobarse, el documento solo es accesible por su autor y moderación.
4. Desde una revisión propia, **Editar nueva versión en el taller** prepara una copia. Publicar añade una revisión; no edita la anterior.
5. Si quieres un proyecto independiente, usa **Publicar como creación nueva** en el taller.

Una revisión concurrente causa un conflicto visible: se conserva el borrador y se debe partir del estado más reciente. No se sobrescribe la revisión de otra sesión ni se admite modificar una creación ajena.

### Visitante

Explora, filtra y abre una creación sin cuenta. **Jugar en solitario** carga el documento verificado en 3D. **Invitar amigos a esta versión** prepara una sala que carga esa revisión desde el servidor. Los enlaces `?community=1&creation=ID&revision=N` fijan la versión; sin `revision` se muestra la última publicada disponible.

Las salas conservan los turnos, nombres, límite de golpes, golpes/puntos, reconexión y revancha existentes. Se guarda el diseño en PostgreSQL; el estado temporal de una sala continúa en memoria y no sobrevive a un reinicio del proceso.

### Moderación

Revisa la cola, inspecciona el documento y prueba la cancha. Aprueba o rechaza indicando un motivo. Las denuncias no retiran automáticamente contenido por acumulación: requieren una decisión real. Retirar una revisión bloquea nuevas cargas y salas desde ella, pero no cambia la geometría de una partida ya admitida. Su enlace conserva una ficha de retirada sin exponer el documento al público.

Si existe una revisión anterior publicada, continúa accesible. Para retirar toda una creación, revisa y retira también las versiones públicas anteriores. El historial permite ver quién decidió cada cambio y cuándo. Cerrar una denuncia registra su resolución y no reescribe las decisiones anteriores.

## Límites y seguridad

- Se reutilizan `parseWorkshop`, `workshopIssues`, `validateRoomWorkshop` y la compilación compartida. Documento máximo 60 KB/80 piezas, 220 colisiones, 2048 triángulos y ocho mecanismos.
- La revisión se identifica por SHA-256. Cliente y servidor comprueban contenido, límites y versión; los estados periódicos de sala no retransmiten el documento.
- Descripción y alias son texto; no se admiten scripts, HTML ejecutable, modelos remotos ni URLs de claves aportadas por usuarios.
- Consultas SQL parametrizadas, control de propietario y moderador, bloqueo transaccional para versiones concurrentes y cuotas por cuenta.
- Máximo 20 versiones y 20 denuncias por cuenta/día; una denuncia por cuenta y revisión. API limitada por dirección de cliente y memoria acotada para el limitador.
- Una publicación no demuestra automáticamente que se puede completar. Los límites/concesión evitan bloquear una sala con un diseño imposible.
- No hay votos, rankings globales, conteos de jugadores o récords comunitarios inventados. Los números de piezas, terrenos y mecanismos proceden del documento.

## Pruebas con servicios reales locales

La base de pruebas está aislada. Los scripts destructivos solo admiten una URL local cuyo nombre termine en `_test` y nunca usan `COMMUNITY_DATABASE_URL` como sustituto.

```sh
docker compose -f compose.community.test.yml up -d
export TEST_COMMUNITY_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/golf_test
npm run test:community
npm run test:community:e2e
```

El Compose es **solo de pruebas**, limitado a loopback. Las pruebas recrean su esquema. La base de desarrollo/producción requiere autenticación y TLS según su proveedor.

La suite PostgreSQL comprueba migración, publicación, propiedad, revisión, inmutabilidad, versiones concurrentes, paginación, filtros, cuotas, denuncias y persistencia tras reiniciar el servicio HTTP. Usa claves RSA efímeras y tokens JWT realmente firmados para comprobar firma, emisor, audiencia, caducidad y permisos.

La suite de navegador usa un proveedor OIDC **exclusivamente de pruebas**, con PKCE real y cuentas efímeras de fixtures. No se importa ni se despliega con la aplicación. Cubre acceso, publicación, revisión, juego físico individual y online, historial, edición/recarga del borrador y retirada. También comprueba admisiones simultáneas, desconexión durante consulta y corrupción de checksum. GitHub Actions ejecuta ambas suites con un servicio PostgreSQL real.

## Lo que aún falta

Provisionar la base y el proveedor de identidad de producción y configurar las variables anteriores para activar el servicio público. No se afirma que estén conectados si `/config` dice lo contrario. También quedan ensayos humanos de moderación y dificultad, carga concurrente, copias de seguridad operativas del proveedor y futuras colecciones comunitarias de varios hoyos. La revisión de Retroceso/Precisión y nuevos recursos del taller siguen en el roadmap del juego.

Las conexiones PostgreSQL inactivas cerradas por el servidor se descartan sin terminar el proceso del juego. Las consultas fallidas siguen mostrando indisponibilidad real; el pool reconecta en solicitudes posteriores. La suite termina una conexión real para comprobar este caso.
