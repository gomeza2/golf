import { CommunityDatabase, communityPool } from "./database";
import { migrateCommunity } from "./schema";
import { readCommunityAuth } from "./auth";
export type SetupCheck = {
  id: string;
  state: "ok" | "missing" | "error" | "manual";
  message: string;
};
const databaseUrl = (env: NodeJS.ProcessEnv) => {
  const value = env.COMMUNITY_DATABASE_URL;
  if (!value) return null;
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw Error("Invalid database protocol");
  return value;
};
/** Opt-in, idempotent preparation for hosts without shell access. Never seeds data. */
export async function prepareCommunity(
  env: NodeJS.ProcessEnv,
): Promise<"disabled" | "missing" | "ready" | "failed"> {
  if (env.COMMUNITY_MIGRATE_ON_START !== "true") return "disabled";
  if (!env.COMMUNITY_DATABASE_URL) return "missing";
  let pool: ReturnType<typeof communityPool> | undefined;
  try {
    pool = communityPool(databaseUrl(env)!);
    const db = new CommunityDatabase(pool);
    if (!(await db.ready().catch(() => false))) await migrateCommunity(pool);
    return "ready";
  } catch {
    return "failed";
  } finally {
    await pool?.end();
  }
}
/** Reports only statuses and variable names. Errors never disclose DSNs, tokens or passwords. */
export async function checkCommunitySetup(
  env: NodeJS.ProcessEnv,
): Promise<SetupCheck[]> {
  const checks: SetupCheck[] = [];
  let pool: ReturnType<typeof communityPool> | undefined;
  try {
    const url = databaseUrl(env);
    if (!url)
      checks.push({
        id: "database",
        state: "missing",
        message: "Falta COMMUNITY_DATABASE_URL.",
      });
    else {
      pool = communityPool(url);
      const ready = await new CommunityDatabase(pool).ready();
      checks.push({
        id: "database",
        state: ready ? "ok" : "error",
        message: ready
          ? "PostgreSQL accesible y esquema compatible."
          : "El esquema falta o no es compatible. Revisa la versión del servidor y la migración del proyecto.",
      });
    }
  } catch {
    checks.push({
      id: "database",
      state: "error",
      message:
        "No se pudo verificar PostgreSQL. Revisa conexión, TLS y migración en el panel del proveedor.",
    });
  } finally {
    await pool?.end();
  }
  let auth: ReturnType<typeof readCommunityAuth> = null;
  try {
    auth = readCommunityAuth(env);
    if (!auth)
      checks.push({
        id: "identity",
        state: "missing",
        message:
          "Faltan valores COMMUNITY_OIDC_ISSUER, CLIENT_ID, AUDIENCE o JWKS_URL.",
      });
    else {
      const discoveryUrl =
        auth.issuer.replace(/\/$/, "") + "/.well-known/openid-configuration";
      const reply = await fetch(discoveryUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!reply.ok) throw Error();
      const metadata = await reply.json();
      if (
        metadata.issuer !== auth.issuer ||
        metadata.jwks_uri !== auth.jwksUrl ||
        !metadata.response_types_supported?.includes("code") ||
        (metadata.code_challenge_methods_supported &&
          !metadata.code_challenge_methods_supported.includes("S256"))
      )
        throw Error();
      for (const key of ["authorization_endpoint", "token_endpoint"]) {
        const u = new URL(metadata[key]);
        if (
          u.protocol !== "https:" &&
          !(
            env.NODE_ENV !== "production" &&
            u.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(u.hostname)
          )
        )
          throw Error();
      }
      const keys = await fetch(auth.jwksUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!keys.ok) throw Error();
      const jwks = await keys.json();
      if (
        !Array.isArray(jwks.keys) ||
        !jwks.keys.some(
          (k: any) =>
            ((k.kty === "RSA" && (!k.alg || k.alg === "RS256")) ||
              (k.kty === "EC" &&
                k.crv === "P-256" &&
                (!k.alg || k.alg === "ES256"))) &&
            (!k.use || k.use === "sig"),
        )
      )
        throw Error();
      checks.push({
        id: "identity",
        state: "ok",
        message:
          "Descubrimiento OIDC y claves públicas compatibles. El acceso con la audiencia configurada debe comprobarse con una cuenta real.",
      });
    }
  } catch {
    checks.push({
      id: "identity",
      state: "error",
      message:
        "OIDC no verificable: revisa HTTPS, emisor exacto, endpoints, PKCE y JWKS. No se muestran valores privados.",
    });
  }
  checks.push(
    auth?.moderators.length
      ? {
          id: "moderation",
          state: "manual",
          message:
            "Lista de moderadores configurada. Inicia sesión y confirma que tu cuenta muestra Moderación; el diagnóstico no verifica la propiedad de esos usuarios.",
        }
      : {
          id: "moderation",
          state: "missing",
          message:
            "Falta COMMUNITY_MODERATOR_SUBJECTS con el identificador verificado de tu cuenta.",
        },
  );
  checks.push({
    id: "browser",
    state: "manual",
    message:
      "Revisa callbacks y cierres de sesión de la aplicación pública, sus orígenes permitidos y una publicación/revisión reales.",
  });
  return checks;
}
