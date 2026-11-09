import { createServer } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import {
  communityPool,
  CommunityDatabase,
} from "../../server/community/database";
import { migrateCommunity } from "../../server/community/schema";
export const databaseUrl = () => {
  const raw = process.env.TEST_COMMUNITY_DATABASE_URL;
  if (!raw)
    throw Error(
      "Las pruebas requieren TEST_COMMUNITY_DATABASE_URL apuntando a PostgreSQL de pruebas.",
    );
  const u = new URL(raw);
  if (
    !u.pathname.endsWith("_test") ||
    !["127.0.0.1", "localhost"].includes(u.hostname)
  )
    throw Error(
      "Se rechaza reiniciar una base que no sea local y termine en _test.",
    );
  return raw;
};
export async function testDatabase() {
  const pool = communityPool(databaseUrl());
  await pool.query("DROP SCHEMA IF EXISTS golf_community CASCADE");
  await migrateCommunity(pool);
  return new CommunityDatabase(pool);
}
export async function oidcFixture() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: "local-test-key",
    alg: "RS256",
    use: "sig",
  };
  let issuer = "";
  const http = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/.well-known/openid-configuration") {
      res.end(
        JSON.stringify({
          issuer,
          jwks_uri: issuer + "/jwks",
          authorization_endpoint: issuer + "/authorize",
          token_endpoint: issuer + "/token",
          response_types_supported: ["code"],
          code_challenge_methods_supported: ["S256"],
        }),
      );
      return;
    }
    if (req.url === "/jwks") {
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    res.writeHead(404);
    res.end("{}");
  });
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  issuer = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
  return {
    issuer,
    jwksUrl: issuer + "/jwks",
    close: () => new Promise<void>((r) => http.close(() => r())),
    token: async (
      subject: string,
      options: {
        audience?: string;
        issuer?: string;
        expires?: string;
        moderator?: boolean;
      } = {},
    ) =>
      new SignJWT({
        name: subject,
        ...(options.moderator ? { role: "moderator" } : {}),
      })
        .setProtectedHeader({ alg: "RS256", kid: "local-test-key" })
        .setSubject(subject)
        .setIssuer(options.issuer || issuer)
        .setAudience(options.audience || "golf-api-test")
        .setIssuedAt()
        .setExpirationTime(options.expires || "5m")
        .sign(privateKey),
  };
}
