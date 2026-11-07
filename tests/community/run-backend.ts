// Explicitly isolated integration server; no test authentication is present in production.
import { testDatabase, databaseUrl } from "./helpers";
if (!process.env.TEST_COMMUNITY_DATABASE_URL)
  throw Error("Falta TEST_COMMUNITY_DATABASE_URL para el servidor de pruebas.");
const db = await testDatabase();
await db.pool.end();
Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "3001",
  COMMUNITY_DATABASE_URL: databaseUrl(),
  COMMUNITY_OIDC_ISSUER: "http://127.0.0.1:48321",
  COMMUNITY_OIDC_CLIENT_ID: "golf-client-test",
  COMMUNITY_OIDC_AUDIENCE: "golf-api-test",
  COMMUNITY_OIDC_JWKS_URL: "http://127.0.0.1:48321/jwks",
  COMMUNITY_MODERATOR_SUBJECTS: "reviewer",
  CLIENT_ORIGIN: "http://localhost:5173",
});
await import("../../server/index");
