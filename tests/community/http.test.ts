import { afterAll, beforeAll, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { createCommunity } from "../../server/community/http";
import { databaseUrl, oidcFixture, testDatabase } from "./helpers";
import { privateWorkshop } from "../fixtures/workshop";
let fixture: Awaited<ReturnType<typeof oidcFixture>>,
  server: Server,
  service: ReturnType<typeof createCommunity>,
  base: string,
  author: string,
  other: string,
  moderator: string,
  id: string;
const input = () => ({
  document: privateWorkshop(),
  description: "Una publicación real de pruebas de acceso y revisión.",
  difficulty: "medium",
  authorName: "Autor autenticado",
});
async function call(
  path: string,
  token?: string,
  body?: unknown,
  origin?: string,
) {
  const r = await fetch(base + "/api/community" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: r.status, data: await r.json() };
}
async function start() {
  service = createCommunity(
    {
      NODE_ENV: "test",
      COMMUNITY_DATABASE_URL: databaseUrl(),
      COMMUNITY_OIDC_ISSUER: fixture.issuer,
      COMMUNITY_OIDC_CLIENT_ID: "golf-client-test",
      COMMUNITY_OIDC_AUDIENCE: "golf-api-test",
      COMMUNITY_OIDC_JWKS_URL: fixture.jwksUrl,
      COMMUNITY_MODERATOR_SUBJECTS: "reviewer",
    },
    ["http://localhost:5173"],
  );
  server = createServer(async (req, res) => {
    if (!(await service.handle(req, res))) {
      res.writeHead(404);
      res.end("{}");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
}
beforeAll(async () => {
  const db = await testDatabase();
  await db.pool.end();
  fixture = await oidcFixture();
  author = await fixture.token("author");
  other = await fixture.token("other");
  moderator = await fixture.token("reviewer");
  await start();
});
afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await service.close();
  await fixture.close();
});
it("advertises real readiness, exposes anonymous exploration and protects publication with verified JWTs", async () => {
  expect((await call("/config")).data).toMatchObject({
    available: true,
    publishing: true,
  });
  expect((await call("/creations")).data.total).toBe(0);
  expect((await call("/creations", undefined, input())).status).toBe(401);
  expect((await call("/creations", "not-a-token", input())).status).toBe(401);
  for (const token of [
    await fixture.token("author", { audience: "wrong" }),
    await fixture.token("author", { issuer: "https://wrong.invalid" }),
    await fixture.token("author", { expires: "-1m" }),
  ])
    expect((await call("/creations", token, input())).status).toBe(401);
  const parts = author.split(".");
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  claims.sub = "reviewer";
  const tampered =
    parts[0] +
    "." +
    Buffer.from(JSON.stringify(claims)).toString("base64url") +
    "." +
    parts[2];
  expect((await call("/moderation", tampered)).status).toBe(401);
  const sent = await call("/creations", author, input());
  expect(sent.status).toBe(201);
  id = sent.data.id;
  expect((await call(`/creations/${id}/revisions/1`)).status).toBe(404);
  expect((await call(`/creations/${id}/revisions/1`, other)).status).toBe(404);
  expect(
    (await call(`/creations/${id}/revisions/1`, author)).data.document,
  ).toEqual(privateWorkshop());
});
it("rejects client-forged moderation roles and applies the configured subject allowlist", async () => {
  const forged = await fixture.token("author", { moderator: true });
  expect((await call("/moderation", forged)).status).toBe(403);
  expect(
    (
      await call(`/creations/${id}/revisions/1/moderate`, forged, {
        status: "published",
        reason: "El cliente declara un rol.",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await call(`/creations/${id}/revisions/1/moderate`, moderator, {
        status: "published",
        reason: "Revisión de moderación auténtica.",
      })
    ).status,
  ).toBe(200);
  expect((await call("/creations")).data.total).toBe(1);
});
it("rejects malformed input and disallowed browser origins without leaking database configuration", async () => {
  expect(
    (
      await call("/creations", author, {
        ...input(),
        document: { ...privateWorkshop(), version: 999 },
      })
    ).status,
  ).toBe(400);
  expect(
    (await call("/creations", author, input(), "https://evil.invalid")).status,
  ).toBe(403);
  expect((await call("/creations?difficulty=not-valid")).status).toBe(400);
  expect((await call("/config")).data).not.toHaveProperty("databaseUrl");
});
it("persists approved content and revision URLs after shutting down and restarting the HTTP service", async () => {
  const before = (await call(`/creations/${id}/revisions/1`)).data;
  await new Promise<void>((r) => server.close(() => r()));
  await service.close();
  await start();
  const after = (await call(`/creations/${id}/revisions/1`)).data;
  expect(after.hash).toBe(before.hash);
  expect(after.document).toEqual(before.document);
  expect((await service.publicDocument(id, 1)).hash).toBe(before.hash);
});
it("makes moderation effective for new loads and rooms while retaining a public tombstone", async () => {
  await call(`/creations/${id}/revisions/1/report`, other, {
    category: "broken",
    details: "Denuncia persistida para revisar la ruta de esta versión.",
  });
  expect((await call("/moderation", moderator)).data.reports).toHaveLength(1);
  await call(`/creations/${id}/revisions/1/moderate`, moderator, {
    status: "withdrawn",
    reason: "La revisión se retira de la galería.",
  });
  expect((await call(`/creations/${id}/revisions/1`)).data).toMatchObject({
    status: "withdrawn",
  });
  expect(
    (await call(`/creations/${id}/revisions/1`)).data.document,
  ).toBeUndefined();
  await expect(service.publicDocument(id, 1)).rejects.toThrow(/publicada/);
});
it("returns explicit disabled state with no configured database and never pretends an empty public gallery is persisted", async () => {
  const disabled = createCommunity({}, []);
  try {
    const fake = createServer(async (req, res) => {
      await disabled.handle(req, res);
    });
    await new Promise<void>((r) => fake.listen(0, "127.0.0.1", r));
    const url = "http://127.0.0.1:" + (fake.address() as { port: number }).port;
    try {
      const r = await fetch(url + "/api/community/config");
      expect(await r.json()).toMatchObject({
        available: false,
        publishing: false,
        auth: null,
      });
      expect((await fetch(url + "/api/community/creations")).status).toBe(503);
    } finally {
      await new Promise<void>((r) => fake.close(() => r()));
    }
  } finally {
    await disabled.close();
  }
});

it("keeps exploration read-only when identity or moderation has not been provisioned", async () => {
  const readonly = createCommunity(
    { COMMUNITY_DATABASE_URL: databaseUrl() },
    [],
  );
  const http = createServer(async (req, res) => {
    await readonly.handle(req, res);
  });
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + (http.address() as { port: number }).port;
  try {
    expect(
      await (await fetch(url + "/api/community/config")).json(),
    ).toMatchObject({ available: true, publishing: false, auth: null });
    expect((await fetch(url + "/api/community/creations")).status).toBe(200);
    const denied = await fetch(url + "/api/community/creations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input()),
    });
    expect(denied.status).toBe(503);
    expect((await denied.json()).message).toMatch(
      /publicación no está configurada/,
    );
  } finally {
    await new Promise<void>((r) => http.close(() => r()));
    await readonly.close();
  }
});
