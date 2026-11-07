import { createRemoteJWKSet, jwtVerify } from "jose";
export type Principal = {
  issuer: string;
  subject: string;
  name: string;
  moderator: boolean;
};
export type AuthConfig = {
  issuer: string;
  clientId: string;
  audience: string;
  jwksUrl: string;
  scope: string;
  moderators: string[];
};
export function readCommunityAuth(env: NodeJS.ProcessEnv): AuthConfig | null {
  const {
    COMMUNITY_OIDC_ISSUER: issuer,
    COMMUNITY_OIDC_CLIENT_ID: clientId,
    COMMUNITY_OIDC_AUDIENCE: audience,
    COMMUNITY_OIDC_JWKS_URL: jwksUrl,
  } = env;
  if (!issuer || !clientId || !audience || !jwksUrl) return null;
  for (const value of [issuer, jwksUrl]) {
    const u = new URL(value);
    if (
      u.username ||
      u.password ||
      (u.protocol !== "https:" &&
        !(
          env.NODE_ENV !== "production" &&
          u.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(u.hostname)
        ))
    )
      throw Error("OIDC requiere URLs HTTPS válidas.");
  }
  return {
    issuer,
    clientId,
    audience,
    jwksUrl,
    scope: env.COMMUNITY_OIDC_SCOPE || "openid profile",
    moderators: (env.COMMUNITY_MODERATOR_SUBJECTS || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  };
}
export function communityVerifier(config: AuthConfig) {
  const keys = createRemoteJWKSet(new URL(config.jwksUrl), {
    timeoutDuration: 5000,
    cooldownDuration: 30000,
  });
  return async (authorization: string | undefined): Promise<Principal> => {
    if (!authorization?.startsWith("Bearer ") || authorization.length > 16384)
      throw Error("Inicia sesión para continuar.");
    const { payload } = await jwtVerify(authorization.slice(7), keys, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ["RS256", "ES256"],
      requiredClaims: ["sub", "exp", "iat"],
      clockTolerance: 5,
    });
    if (!payload.sub || payload.sub.length > 256)
      throw Error("Identidad inválida.");
    return {
      issuer: config.issuer,
      subject: payload.sub,
      name:
        typeof payload.name === "string"
          ? payload.name.slice(0, 48)
          : "Sin alias",
      moderator: config.moderators.includes(payload.sub),
    };
  };
}
