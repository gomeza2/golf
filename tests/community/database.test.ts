import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { testDatabase, databaseUrl } from "./helpers";
import {
  CommunityDatabase,
  communityPool,
} from "../../server/community/database";
import { migrateCommunity } from "../../server/community/schema";
import { privateWorkshop } from "../fixtures/workshop";
import type { CommunityActor } from "../../shared/community";
let db: CommunityDatabase,
  a: CommunityActor,
  b: CommunityActor,
  mod: CommunityActor,
  id: string;
const input = (extra: Record<string, unknown> = {}) => ({
  document: privateWorkshop(),
  description: "Una cancha de prueba para verificar las rutas publicadas.",
  difficulty: "medium",
  authorName: "Autor de prueba",
  ...extra,
});
beforeAll(async () => {
  db = await testDatabase();
  a = await db.actor({
    issuer: "urn:test",
    subject: randomUUID(),
    name: "Autor A",
    moderator: false,
  });
  b = await db.actor({
    issuer: "urn:test",
    subject: randomUUID(),
    name: "Autor B",
    moderator: false,
  });
  mod = await db.actor({
    issuer: "urn:test",
    subject: randomUUID(),
    name: "Moderador",
    moderator: true,
  });
});
afterAll(async () => {
  await db.pool.end();
});
it("migrates idempotently without inventing public content", async () => {
  await migrateCommunity(db.pool);
  expect((await db.gallery(new URLSearchParams())).total).toBe(0);
  expect(
    (await db.pool.query("SELECT count(*) FROM golf_community.migrations"))
      .rows[0].count,
  ).toBe("1");
});
it("keeps publication pending, binds its real author and hides unreviewed geometry from guests", async () => {
  const sent = await db.publish(a, input());
  id = sent.id;
  expect(sent.status).toBe("pending");
  expect((await db.gallery(new URLSearchParams())).total).toBe(0);
  await expect(db.detail(id, 1)).rejects.toMatchObject({ status: 404 });
  const own = await db.detail(id, 1, a);
  expect(own.document).toEqual(privateWorkshop());
  expect(own.author.id).toBe(a.id);
  await expect(
    db.publish(b, input({ creationId: id, expectedVersion: 1 })),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    db.moderate(a, id, 1, {
      status: "published",
      reason: "Autor intenta aprobar su diseño",
    }),
  ).rejects.toMatchObject({ status: 403 });
});
it("publishes only through moderation, searches real title/author/difficulty and ignores forged feature claims", async () => {
  await db.moderate(mod, id, 1, {
    status: "published",
    reason: "Revisión inicial comprobada.",
  });
  let list = await db.gallery(
    new URLSearchParams({
      q: "CANCHA DE ANA",
      author: "autor de prueba",
      difficulty: "medium",
    }),
  );
  expect(list.total).toBe(1);
  expect(list.items[0].preview).toEqual(privateWorkshop());
  expect(list.items[0].author.id).toBe(a.id);
  expect(
    (await db.gallery(new URLSearchParams({ q: "' OR 1=1 --" }))).total,
  ).toBe(0);
  expect(
    (await db.gallery(new URLSearchParams({ difficulty: "hard" }))).total,
  ).toBe(0);
  expect((await db.gallery(new URLSearchParams("feature=water"))).total).toBe(
    0,
  );
  const doc = privateWorkshop();
  doc.name = "Puentes y agua";
  doc.pieces.push(
    {
      id: "water",
      kind: "water",
      x: -8,
      z: 15,
      width: 2,
      length: 2,
      height: 0,
      endHeight: 0,
      angle: 0,
    },
    {
      id: "ramp",
      kind: "ramp",
      x: -7,
      z: 9,
      width: 2,
      length: 4,
      height: 0,
      endHeight: 2,
      angle: 0,
    },
  );
  const second = await db.publish(
    b,
    input({
      document: doc,
      difficulty: "hard",
      authorName: "Otro autor",
      features: ["fake"],
    }),
  );
  await db.moderate(mod, second.id, 1, {
    status: "published",
    reason: "Diseño y contenido revisados.",
  });
  list = await db.gallery(
    new URLSearchParams("feature=water&feature=ramps&difficulty=hard"),
  );
  expect(list.total).toBe(1);
  expect(list.items[0].features).toEqual(["water", "ramps", "heights"]);
  expect(
    (await db.gallery(new URLSearchParams({ authorId: a.id }))).total,
  ).toBe(1);
});
it("serializes competing version submissions, retains approved older bodies and hides rejected revisions", async () => {
  const first = await db.detail(id, 1);
  const outcomes = await Promise.allSettled([
    db.publish(a, input({ creationId: id, expectedVersion: 1 })),
    db.publish(a, input({ creationId: id, expectedVersion: 1 })),
  ]);
  expect(outcomes.filter((v) => v.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.find((v) => v.status === "rejected")).toMatchObject({
    reason: { status: 409 },
  });
  expect((await db.detail(id)).revision).toBe(1);
  expect((await db.detail(id, 1)).hash).toBe(first.hash);
  await db.moderate(mod, id, 2, {
    status: "rejected",
    reason: "Falta explicar la decisión de ruta.",
  });
  await expect(db.detail(id, 2)).rejects.toMatchObject({ status: 404 });
  expect((await db.detail(id, 2, a)).status).toBe("rejected");
  expect((await db.detail(id, 1)).versions.map((v) => v.revision)).toEqual([1]);
  const next = await db.publish(
    a,
    input({
      creationId: id,
      expectedVersion: 2,
      authorName: "Alias actualizado",
    }),
  );
  expect(next.revision).toBe(3);
  await db.moderate(mod, id, 3, {
    status: "published",
    reason: "La nueva revisión está lista.",
  });
  expect((await db.detail(id)).revision).toBe(3);
  expect((await db.detail(id, 1)).author.name).toBe("Autor de prueba");
  expect((await db.detail(id, 3)).author.name).toBe("Alias actualizado");
});
it("preserves immutable revision content in PostgreSQL and persists through a fresh database connection", async () => {
  await expect(
    db.pool.query(
      "UPDATE golf_community.revisions SET title='Editado' WHERE creation_id=$1 AND revision=1",
      [id],
    ),
  ).rejects.toThrow(/immutable/);
  await expect(
    db.pool.query(
      "DELETE FROM golf_community.revisions WHERE creation_id=$1 AND revision=1",
      [id],
    ),
  ).rejects.toThrow(/deleted/);
  const other = new CommunityDatabase(communityPool(databaseUrl()));
  try {
    expect((await other.detail(id, 1)).document).toEqual(privateWorkshop());
    expect((await other.detail(id)).revision).toBe(3);
  } finally {
    await other.pool.end();
  }
});
it("deduplicates real reports, restricts the review queue, records withdrawal and retains permanent tombstones", async () => {
  const report = await db.report(b, id, 3, {
    category: "broken",
    details: "La ruta necesita una segunda revisión de jugabilidad.",
  });
  await expect(
    db.report(b, id, 3, {
      category: "other",
      details: "Un segundo envío de la misma persona.",
    }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(db.queue(a)).rejects.toMatchObject({ status: 403 });
  expect((await db.queue(mod)).reports.map((r) => r.id)).toContain(report.id);
  await db.moderate(mod, id, 3, {
    status: "withdrawn",
    reason: "Retirada tras revisar la denuncia.",
  });
  const gone = await db.detail(id, 3);
  expect(gone.status).toBe("withdrawn");
  expect(gone.document).toBeUndefined();
  expect((await db.detail(id)).revision).toBe(1);
  await db.moderate(mod, id, 1, {
    status: "withdrawn",
    reason: "Se retira también esta versión anterior.",
  });
  expect((await db.detail(id)).status).toBe("withdrawn");
  expect((await db.detail(id)).document).toBeUndefined();
  await expect(
    db.resolveReport(a, report.id, "No tengo autorización."),
  ).rejects.toMatchObject({ status: 403 });
  await db.resolveReport(
    mod,
    report.id,
    "La revisión denunciada fue retirada.",
  );
  expect((await db.queue(mod)).reports).toHaveLength(0);
  await expect(
    db.resolveReport(mod, report.id, "Se intenta cerrar otra vez."),
  ).rejects.toMatchObject({ status: 409 });
  const audit = await db.audit(mod, id, 3);
  expect(audit.map((r) => r.next_status)).toEqual(["published", "withdrawn"]);
  expect(audit.every((r) => r.actor_id === mod.id)).toBe(true);
  await expect(
    db.pool.query(
      "DELETE FROM golf_community.moderation WHERE creation_id=$1",
      [id],
    ),
  ).rejects.toThrow(/append-only/);
});
it("restores a withdrawn revision without rewriting its content or deleting audit history", async () => {
  const hash = (await db.detail(id, 3)).hash;
  await db.moderate(mod, id, 3, {
    status: "published",
    reason: "Restaurada tras comprobar nuevamente el contenido.",
  });
  expect((await db.detail(id, 3)).hash).toBe(hash);
  expect((await db.detail(id)).revision).toBe(3);
  expect(await db.audit(mod, id, 3)).toHaveLength(3);
  await expect(
    db.moderate(mod, id, 3, {
      status: "rejected",
      reason: "No se puede rechazar una revisión publicada.",
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("refuses migrations from a newer schema without removing creation history", async () => {
  await db.pool.query(
    "INSERT INTO golf_community.migrations(version) VALUES(999)",
  );
  await expect(migrateCommunity(db.pool)).rejects.toThrow(/más nuevo/);
  await db.pool.query(
    "DELETE FROM golf_community.migrations WHERE version=999",
  );
  expect((await db.detail(id, 1)).status).toBe("withdrawn");
});

it("paginates actual published revisions without leaking pending rows", async () => {
  for (let i = 1; i <= 13; i++) {
    const document = privateWorkshop();
    document.name = `Paginación real ${i}`;
    const r = await db.publish(b, input({ document }));
    await db.moderate(mod, r.id, r.revision, {
      status: "published",
      reason: "Revisión para comprobar paginación real.",
    });
  }
  const first = await db.gallery(
      new URLSearchParams({ q: "Paginación real", page: "1" }),
    ),
    second = await db.gallery(
      new URLSearchParams({ q: "Paginación real", page: "2" }),
    );
  expect(first.total).toBe(13);
  expect(first.items).toHaveLength(12);
  expect(second.items).toHaveLength(1);
  expect(new Set([...first.items, ...second.items].map((r) => r.id)).size).toBe(
    13,
  );
});
it("enforces publication quotas under concurrent requests using the real database lock", async () => {
  const limited = await db.actor({
    issuer: "urn:test",
    subject: randomUUID(),
    name: "Límite de pruebas",
    moderator: false,
  });
  const results = await Promise.allSettled(
    Array.from({ length: 21 }, () => db.publish(limited, input())),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(20);
  expect(results.find((r) => r.status === "rejected")).toMatchObject({
    reason: { status: 429 },
  });
});
it("survives termination of an idle PostgreSQL connection and reconnects", async () => {
  const pool = communityPool(databaseUrl());
  const admin = communityPool(databaseUrl());
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT pg_backend_pid() AS pid");
    client.release();
    await admin.query("SELECT pg_terminate_backend($1)", [result.rows[0].pid]);
    // Do not attach a test error listener: the application's listener must keep
    // the server alive when PostgreSQL closes a released connection.
    await expect.poll(() => pool.totalCount).toBe(0);
    expect(await new CommunityDatabase(pool).ready()).toBe(true);
  } finally {
    await Promise.all([pool.end(), admin.end()]);
  }
});
