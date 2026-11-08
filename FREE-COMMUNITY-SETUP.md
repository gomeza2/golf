# Activar la comunidad con planes gratuitos

El juego y las salas ya pueden funcionar en tu Render actual. Para conservar publicaciones entre reinicios hacen falta dos cuentas del propietario: una base PostgreSQL y un acceso OIDC. Esta guía utiliza **Neon Free + Auth0 Free**, sin cambiar el motor ni el servidor del juego. No hay cuentas, claves o datos públicos inventados por el proyecto.

Planes comprobados el 8 de noviembre de 2026: [Neon Free](https://neon.com/pricing) ofrece PostgreSQL a $0, sin tarjeta, con cuotas de almacenamiento/cómputo; [Auth0 Free](https://auth0.com/pricing) ofrece acceso a $0 con cuotas de usuarios. Usa los planes Free y el dominio incluido del proveedor. Revisa sus límites en el panel antes de activar funciones adicionales. Render Free no ofrece Shell; por eso esta entrega incluye una preparación de base opcional al iniciar. [Limitaciones de Render Free](https://render.com/docs/free).

## 1. Crear PostgreSQL en Neon

1. Entra a [Neon](https://console.neon.tech/) y crea tu cuenta. Puedes usar GitHub.
2. Crea un proyecto para Golf Club en el plan Free. Elige una región cercana a tu Render cuando sea posible.
3. En **Connect**, copia la conexión PostgreSQL directa del proyecto, sin pooler. Es un secreto: guárdala directamente en Render, nunca en GitHub ni en el chat.
4. Conserva el host/usuario/contraseña reales del proveedor. En la URL usa `sslmode=verify-full` para verificar el certificado y el nombre del servidor. No desactives TLS ni la verificación de certificados.

No uses una base temporal que caduque para prometer publicaciones permanentes. Los datos serán persistentes en tu proyecto; las cuotas y políticas de retención del proveedor siguen aplicándose. Exporta tus diseños y conserva respaldos bajo tu control.

## 2. Crear acceso en Auth0

1. Crea una cuenta en [Auth0](https://auth0.com/signup) y usa Free para este proyecto.
2. En **Applications → APIs**, crea la API de comunidad. Utiliza como Identifier `https://hoyo-en-uno-golf-club.onrender.com/api/community` y firma **RS256**.
3. En **Applications → Applications**, crea una **Single Page Application** para Golf Club, con Authorization Code + PKCE y sin autenticación mediante secreto del cliente.
4. Configura estas direcciones exactas en **Allowed Callback URLs** y **Allowed Logout URLs**:

```text
https://gomeza2.github.io/golf/
https://hoyo-en-uno-golf-club.onrender.com/
```

5. En **Allowed Web Origins**, agrega los dos orígenes:

```text
https://gomeza2.github.io
https://hoyo-en-uno-golf-club.onrender.com
```

6. Anota el Domain y Client ID reales de la aplicación. El proyecto no necesita un Client Secret para el navegador. Configura un acceso habilitado en esa SPA, por ejemplo la conexión de usuarios/contraseña del proveedor.
7. Antes de activar publicación, crea **tu propia cuenta** en User Management → Users. Copia su **User ID** exacto para la lista de moderadores. Es el identificador que aparecerá como `sub` en el token, no el Client ID ni el UUID del perfil interno de Golf Club. No inventes un usuario/moderador de ejemplo.

El dominio del emisor tiene esta forma, usando tu Domain real y conservando la barra final: `https://TU-DOMINIO.auth0.com/`. La URL de claves corresponde a ese mismo dominio seguido de `.well-known/jwks.json`. Los ejemplos de dominio son explicativos, no credenciales válidas.

## 3. Completar Environment en tu servicio Render

Abre tu servicio existente de Golf Club → Environment. Copia allí estos valores reales:

| Variable                       | Valor que debes cargar                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `COMMUNITY_DATABASE_URL`       | Conexión privada de Neon, con verificación TLS completa    |
| `COMMUNITY_MIGRATE_ON_START`   | `true`                                                     |
| `COMMUNITY_OIDC_ISSUER`        | Emisor Auth0 exacto, con `https://` y barra final          |
| `COMMUNITY_OIDC_CLIENT_ID`     | Client ID de tu SPA                                        |
| `COMMUNITY_OIDC_AUDIENCE`      | Identifier exacto de la API creada arriba                  |
| `COMMUNITY_OIDC_JWKS_URL`      | Dirección de claves públicas de ese emisor                 |
| `COMMUNITY_OIDC_SCOPE`         | `openid profile`                                           |
| `COMMUNITY_MODERATOR_SUBJECTS` | User ID verificado de tu cuenta; varios separados por coma |
| `COMMUNITY_TRUST_PROXY_HOPS`   | `1` detrás del ingreso habitual de Render                  |
| `CLIENT_ORIGIN`                | `https://gomeza2.github.io`                                |

El origen propio de Render se permite automáticamente. No copies la URL de base en ninguna variable `VITE_*`. No agregues secretos al repositorio. Los valores públicos de OIDC se entregan al navegador desde la configuración del servidor; la contraseña PostgreSQL permanece solo en el servidor.

Mantén Build Command `npm ci --include=dev && npm run build` y Start Command `npm start`. Guarda y vuelve a desplegar. La preparación opcional crea el esquema si falta, con bloqueo transaccional; no crea autores ni publicaciones. Si la base ya está lista, la conserva. No necesitas una Shell de pago. Si falla, la comunidad permanece indisponible y el golf/las salas continúan funcionando.

## 4. Verificar la activación real

1. Comprueba `/health` y la versión actual del servicio.
2. Abre `https://hoyo-en-uno-golf-club.onrender.com/api/community/config`. `available: true` indica base/esquema disponibles; `publishing: true` indica configuración habilitada. No demuestra por sí solo que el identificador de moderador corresponda a tu cuenta.
3. Entra al juego → Comunidad → Entrar para publicar, con tu cuenta real.
4. Confirma que aparece Moderación con esa cuenta. Si no aparece, compara el User ID de Auth0 con `COMMUNITY_MODERATOR_SUBJECTS` en Render; no uses un ID inventado o el UUID interno del juego.
5. Publica una creación real del taller. Debe quedar pendiente; apruébala después de revisarla. Abre su enlace sin iniciar sesión y completa el hoyo. Crea también una sala por esa revisión.
6. Reinicia el servicio y verifica que la publicación siga en la galería. Las salas son temporales; las creaciones/versiones se conservan en PostgreSQL.

Desde una copia local del proyecto con `.env` privado también puedes ejecutar:

```sh
npm run community:check
# O sobre el servidor compilado:
npm run community:check:production
```

El diagnóstico revisa conexión/esquema y descubrimiento/claves OIDC. Solo imprime estados e instrucciones; no muestra contraseñas, URLs privadas ni tokens. Identifica qué comprobaciones requieren entrar con una cuenta real. No simula una sesión, no genera usuarios y no sustituye las pruebas manuales de permisos.

## Si algo sigue pendiente

- Sin base: revisa la variable privada y el plan/proyecto Neon; el juego oficial sigue disponible.
- Base sin esquema: revisa `COMMUNITY_MIGRATE_ON_START=true` y vuelve a desplegar. La preparación nunca baja una base de una versión superior.
- Error de acceso: verifica emisor exacto/barra final, audience, SPA, PKCE, endpoints, firma RS256 y callbacks. No desactives validaciones para ocultar el error.
- Solo lectura: falta identidad o una cuenta moderadora real. Sigue sin haber publicaciones ficticias.
- Cuota gratuita agotada: revisa el panel y libera recursos bajo tu control o decide si necesitas otro plan; el proyecto no contrata servicios automáticamente.

Para empezar, el propietario debe crear las dos cuentas y cargar los valores en Render. Esta entrega deja integración y diagnóstico reales, pero no afirma que una base o identidad estén conectadas hasta comprobarlo.

Referencias oficiales: [Neon: conexión](https://neon.com/docs/connect/connect-from-any-app), [Auth0: aplicaciones SPA](https://auth0.com/docs/get-started/applications/application-settings), [Auth0: APIs](https://auth0.com/docs/get-started/apis), [Render: variables](https://render.com/docs/configure-environment-variables).
