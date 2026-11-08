import { beforeAll, afterAll, expect, it } from "vitest";
import { databaseUrl, oidcFixture } from "./helpers";
import {
  CommunityDatabase,
  communityPool,
} from "../../server/community/database";
import {
  checkCommunitySetup,
  prepareCommunity,
} from "../../server/community/setup";
import { workshopBlueprint } from "../../shared/workshopBlueprints";
let pool: ReturnType<typeof communityPool>,
  db: CommunityDatabase,
  identity: Awaited<ReturnType<typeof oidcFixture>>;
beforeAll(async () => {
  pool = communityPool(databaseUrl());
  await pool.query("DROP SCHEMA IF EXISTS golf_community CASCADE");
  expect(
    await prepareCommunity({
      COMMUNITY_DATABASE_URL: databaseUrl(),
      COMMUNITY_MIGRATE_ON_START: "true",
    }),
  ).toBe("ready");
  for (const table of ["authors", "creations", "revisions"])
    expect(
      (await pool.query(`SELECT count(*) FROM golf_community.${table}`)).rows[0]
        .count,
    ).toBe("0");
  db = new CommunityDatabase(pool);
  identity = await oidcFixture();
});
afterAll(async () => {
  await pool?.end();
  await identity?.close();
});
const env = () => ({
  NODE_ENV: "test",
  COMMUNITY_DATABASE_URL: databaseUrl(),
  COMMUNITY_OIDC_ISSUER: identity.issuer,
  COMMUNITY_OIDC_CLIENT_ID: "test-client",
  COMMUNITY_OIDC_AUDIENCE: "test-audience",
  COMMUNITY_OIDC_JWKS_URL: identity.jwksUrl,
  COMMUNITY_MODERATOR_SUBJECTS: "moderator",
});
it("prepares a fresh real database without creating example accounts or creations and remains explicitly opt-in", async () => {
  expect(await db.ready()).toBe(true);
  expect(
    await prepareCommunity({
      COMMUNITY_DATABASE_URL: "https://secret:password@invalid.example",
    }),
  ).toBe("disabled");
  expect(await prepareCommunity({ COMMUNITY_MIGRATE_ON_START: "true" })).toBe(
    "missing",
  );
  expect(
    await prepareCommunity({
      COMMUNITY_MIGRATE_ON_START: "true",
      COMMUNITY_DATABASE_URL: "https://secret:password@invalid.example",
    }),
  ).toBe("failed");
});
it("restarting preparation preserves a published advanced document and its real metadata", async () => {
  const a = await db.actor({
      issuer: "urn:setup",
      subject: "author",
      name: "Owner",
      moderator: false,
    }),
    m = await db.actor({
      issuer: "urn:setup",
      subject: "moderator",
      name: "Mod",
      moderator: true,
    });
  const doc = workshopBlueprint("lock");
  const p = await db.publish(a, {
    document: doc,
    description: "Prueba de una publicación avanzada persistente.",
    authorName: "Owner",
    difficulty: "hard",
  });
  await db.moderate(m, p.id, 1, {
    status: "published",
    reason: "Diseño revisado por el moderador de pruebas.",
  });
  const old = await db.detail(p.id, 1);
  expect(
    await prepareCommunity({ ...env(), COMMUNITY_MIGRATE_ON_START: "true" }),
  ).toBe("ready");
  const current = await db.detail(p.id, 1);
  expect(current.hash).toBe(old.hash);
  expect(current.document).toEqual(doc);
  expect(
    (
      await db.gallery(
        new URLSearchParams("feature=dirt&feature=moving&physics=2"),
      )
    ).items.map((x) => x.id),
  ).toEqual([p.id]);
});
it("checks actual PostgreSQL and local OIDC discovery/JWKS while leaving user ownership and audience login as manual checks", async () => {
  const checks = await checkCommunitySetup(env());
  expect(
    checks.filter((c) => c.state === "error" || c.state === "missing"),
  ).toEqual([]);
  expect(checks.find((c) => c.id === "database")?.state).toBe("ok");
  expect(checks.find((c) => c.id === "identity")?.state).toBe("ok");
  expect(checks.find((c) => c.id === "moderation")?.state).toBe("manual");
});
it("reports invalid discovery and redacts private connection values from all diagnostic output", async () => {
  const secret = "secret-password-that-must-never-appear";
  const checks = await checkCommunitySetup({
    ...env(),
    COMMUNITY_DATABASE_URL: `https://user:${secret}@invalid.example`,
    COMMUNITY_OIDC_JWKS_URL: identity.issuer + "/wrong-keys",
  });
  expect(checks.filter((c) => c.state === "error").map((c) => c.id)).toEqual([
    "database",
    "identity",
  ]);
  expect(JSON.stringify(checks)).not.toContain(secret);
  expect(JSON.stringify(checks)).not.toContain("user:");
});
it("refuses to migrate a newer schema and preserves that database", async () => {
  await pool.query("INSERT INTO golf_community.migrations(version) VALUES(2)");
  try {
    expect(
      await prepareCommunity({ ...env(), COMMUNITY_MIGRATE_ON_START: "true" }),
    ).toBe("failed");
    expect(
      (
        await pool.query(
          "SELECT max(version) AS version FROM golf_community.migrations",
        )
      ).rows[0].version,
    ).toBe(2);
    expect(
      (await pool.query("SELECT count(*) FROM golf_community.creations"))
        .rows[0].count,
    ).toBe("1");
  } finally {
    await pool.query("DELETE FROM golf_community.migrations WHERE version=2");
  }
});
