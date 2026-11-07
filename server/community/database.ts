import pg from "pg";
import { randomUUID, createHash } from "node:crypto";
import {
  publicationInput,
  galleryFilter,
  textField,
  type CreationSummary,
  type CreationDetail,
  type RevisionStatus,
  type CommunityActor,
} from "../../shared/community";
import type { Principal } from "./auth";
import { COMMUNITY_SCHEMA_VERSION } from "./schema";
export class CommunityError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const select = `SELECT r.*, c.author_id FROM golf_community.revisions r JOIN golf_community.creations c ON c.id=r.creation_id`;
function summary(r: any): CreationSummary {
  return {
    id: r.creation_id,
    revision: r.revision,
    title: r.title,
    description: r.description,
    difficulty: r.difficulty,
    features: r.features,
    stats: r.stats,
    par: r.par,
    hash: r.hash,
    status: r.status,
    author: { id: r.author_id, name: r.author_name },
    createdAt: new Date(r.created_at).toISOString(),
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    ...(r.reason ? { reason: r.reason } : {}),
  };
}
export class CommunityDatabase {
  constructor(readonly pool: pg.Pool) {}
  async ready() {
    const result = await this.pool.query(
      "SELECT max(version) AS version FROM golf_community.migrations",
    );
    return Number(result.rows[0]?.version) === COMMUNITY_SCHEMA_VERSION;
  }
  async actor(principal: Principal): Promise<CommunityActor> {
    const r = await this.pool.query(
      `INSERT INTO golf_community.authors(id,issuer,subject,display_name) VALUES($1,$2,$3,$4) ON CONFLICT(issuer,subject) DO UPDATE SET subject=EXCLUDED.subject RETURNING id,display_name`,
      [randomUUID(), principal.issuer, principal.subject, principal.name],
    );
    return {
      id: r.rows[0].id,
      name: r.rows[0].display_name,
      moderator: principal.moderator,
    };
  }
  async publish(actor: CommunityActor, value: unknown) {
    const p = publicationInput(value);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT id FROM golf_community.authors WHERE id=$1 FOR UPDATE",
        [actor.id],
      );
      const count = await client.query(
        `SELECT count(*) FROM golf_community.revisions r JOIN golf_community.creations c ON c.id=r.creation_id WHERE c.author_id=$1 AND r.created_at>now()-interval '1 day'`,
        [actor.id],
      );
      if (Number(count.rows[0].count) >= 20)
        throw new CommunityError(429, "Límite de 20 versiones por día.");
      const id = p.creationId || randomUUID();
      let revision = 1;
      if (p.creationId) {
        const c = await client.query(
          "SELECT author_id FROM golf_community.creations WHERE id=$1 FOR UPDATE",
          [id],
        );
        if (!c.rows.length || c.rows[0].author_id !== actor.id)
          throw new CommunityError(
            403,
            "Solo el autor puede añadir versiones.",
          );
        const max = await client.query(
          "SELECT max(revision) AS revision FROM golf_community.revisions WHERE creation_id=$1",
          [id],
        );
        if (Number(max.rows[0].revision) !== p.expectedVersion)
          throw new CommunityError(
            409,
            "Hay una versión más reciente. Recarga antes de enviar.",
          );
        revision = Number(max.rows[0].revision) + 1;
      } else
        await client.query(
          "INSERT INTO golf_community.creations(id,author_id) VALUES($1,$2)",
          [id, actor.id],
        );
      await client.query(
        "UPDATE golf_community.authors SET display_name=$2 WHERE id=$1",
        [actor.id, p.authorName],
      );
      await client.query(
        `INSERT INTO golf_community.revisions(creation_id,revision,title,description,difficulty,author_name,document,hash,features,stats,par) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          revision,
          p.document.name,
          p.description,
          p.difficulty,
          p.authorName,
          JSON.stringify(p.document),
          createHash("sha256").update(p.canonical).digest("hex"),
          JSON.stringify(p.features),
          JSON.stringify(p.stats),
          p.document.par,
        ],
      );
      await client.query("COMMIT");
      return { id, revision, status: "pending" as const };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  async gallery(params: URLSearchParams) {
    const f = galleryFilter(params),
      where = `($1='' OR position(lower($1) in lower(title||' '||description))>0) AND ($2='' OR position(lower($2) in lower(author_name))>0) AND ($3='' OR difficulty=$3) AND ($4='' OR author_id::text=$4) AND features @> $5::jsonb`;
    const values = [
      f.q,
      f.author,
      f.difficulty,
      f.authorId,
      JSON.stringify(f.features),
    ];
    const cte = `WITH latest AS (SELECT DISTINCT ON (r.creation_id) r.*,c.author_id FROM golf_community.revisions r JOIN golf_community.creations c ON c.id=r.creation_id WHERE r.status='published' ORDER BY r.creation_id,r.revision DESC)`;
    const total = await this.pool.query(
      `${cte} SELECT count(*) FROM latest WHERE ${where}`,
      values,
    );
    const result = await this.pool.query(
      `${cte} SELECT * FROM latest WHERE ${where} ORDER BY published_at DESC,creation_id LIMIT 12 OFFSET $6`,
      [...values, (f.page - 1) * 12],
    );
    return {
      items: result.rows.map((r) => ({ ...summary(r), preview: r.document })),
      total: Number(total.rows[0].count),
      page: f.page,
      pageSize: 12,
    };
  }
  async detail(
    id: string,
    revision?: number,
    actor?: CommunityActor,
  ): Promise<CreationDetail> {
    const result = await this.pool.query(
      `${select} WHERE r.creation_id=$1 ${revision ? "AND r.revision=$2" : "AND (r.status='published' OR (r.status='withdrawn' AND r.published_at IS NOT NULL))"} ORDER BY CASE WHEN r.status='published' THEN 0 ELSE 1 END,r.revision DESC LIMIT 1`,
      revision ? [id, revision] : [id],
    );
    const r = result.rows[0];
    const privileged =
      r && actor && (actor.id === r.author_id || actor.moderator);
    if (
      !r ||
      (!privileged &&
        r.status !== "published" &&
        !(r.status === "withdrawn" && r.published_at))
    )
      throw new CommunityError(404, "Creación o versión no disponible.");
    const versions = await this.pool.query(
      `SELECT revision,status,published_at FROM golf_community.revisions WHERE creation_id=$1 ${privileged ? "" : "AND (status='published' OR (status='withdrawn' AND published_at IS NOT NULL))"} ORDER BY revision DESC`,
      [id],
    );
    return {
      ...summary(r),
      ...(r.status === "published" || privileged
        ? { document: r.document }
        : {}),
      versions: versions.rows.map((v) => ({
        revision: v.revision,
        status: v.status,
        publishedAt: v.published_at
          ? new Date(v.published_at).toISOString()
          : null,
      })),
    };
  }
  async mine(actor: CommunityActor) {
    const r = await this.pool.query(
      `${select} WHERE c.author_id=$1 ORDER BY r.created_at DESC LIMIT 100`,
      [actor.id],
    );
    return r.rows.map(summary);
  }
  async report(
    actor: CommunityActor,
    id: string,
    revision: number,
    value: unknown,
  ) {
    const p = value as Record<string, unknown>;
    if (
      !p ||
      !["offensive", "broken", "plagiarism", "other"].includes(
        String(p.category),
      )
    )
      throw Error("Categoría inválida.");
    const details = textField(p.details, "Motivo", 15, 1200);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT id FROM golf_community.authors WHERE id=$1 FOR UPDATE",
        [actor.id],
      );
      const count = await client.query(
        "SELECT count(*) FROM golf_community.reports WHERE reporter_id=$1 AND created_at>now()-interval '1 day'",
        [actor.id],
      );
      if (Number(count.rows[0].count) >= 20)
        throw new CommunityError(429, "Límite diario de denuncias alcanzado.");
      const target = await client.query(
        "SELECT status FROM golf_community.revisions WHERE creation_id=$1 AND revision=$2 AND status='published' FOR SHARE",
        [id, revision],
      );
      if (!target.rows.length)
        throw new CommunityError(404, "Versión no disponible para denunciar.");
      const r = await client.query(
        "INSERT INTO golf_community.reports(id,creation_id,revision,reporter_id,category,details) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(creation_id,revision,reporter_id) DO NOTHING RETURNING id",
        [randomUUID(), id, revision, actor.id, p.category, details],
      );
      if (!r.rows.length)
        throw new CommunityError(409, "Ya denunciaste esta versión.");
      await client.query("COMMIT");
      return { id: r.rows[0].id };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  async queue(actor: CommunityActor) {
    if (!actor.moderator) throw new CommunityError(403, "Solo moderación.");
    const pending = await this.pool.query(
      `${select} WHERE r.status='pending' ORDER BY r.created_at LIMIT 100`,
    );
    const reports = await this.pool.query(
      `SELECT p.*,a.display_name AS reporter FROM golf_community.reports p JOIN golf_community.authors a ON a.id=p.reporter_id WHERE p.resolved_at IS NULL ORDER BY p.created_at LIMIT 100`,
    );
    return { pending: pending.rows.map(summary), reports: reports.rows };
  }
  async moderate(
    actor: CommunityActor,
    id: string,
    revision: number,
    value: unknown,
  ) {
    if (!actor.moderator) throw new CommunityError(403, "Solo moderación.");
    const p = value as Record<string, unknown>;
    if (
      !p ||
      !["published", "rejected", "withdrawn"].includes(String(p.status))
    )
      throw Error("Decisión inválida.");
    const reason = textField(p.reason, "Motivo de revisión", 10, 600);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const r = await client.query(
        "SELECT * FROM golf_community.revisions WHERE creation_id=$1 AND revision=$2 FOR UPDATE",
        [id, revision],
      );
      if (!r.rows.length) throw new CommunityError(404, "Versión inexistente.");
      const row = r.rows[0];
      const next = p.status as RevisionStatus;
      if (!(
        (next === "published" &&
          ["pending", "withdrawn"].includes(row.status)) ||
        (next === "rejected" && row.status === "pending") ||
        (next === "withdrawn" && row.status === "published")
      ))
        throw new CommunityError(
          409,
          "La versión cambió o esa transición no está permitida.",
        );
      if (next === "published") {
        const valid = publicationInput({
          document: row.document,
          difficulty: row.difficulty,
          description: row.description,
          authorName: row.author_name,
        });
        if (
          createHash("sha256").update(valid.canonical).digest("hex") !==
          row.hash
        )
          throw Error("La revisión perdió su integridad.");
      }
      await client.query(
        `UPDATE golf_community.revisions SET status=$3,reason=$4,published_at=CASE WHEN $3='published' THEN COALESCE(published_at,now()) ELSE published_at END WHERE creation_id=$1 AND revision=$2`,
        [id, revision, next, reason],
      );
      await client.query(
        "INSERT INTO golf_community.moderation(id,creation_id,revision,actor_id,previous_status,next_status,reason) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [randomUUID(), id, revision, actor.id, row.status, next, reason],
      );
      await client.query("COMMIT");
      return { id, revision, status: next };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  async resolveReport(actor: CommunityActor, id: string, reason: unknown) {
    if (!actor.moderator) throw new CommunityError(403, "Solo moderación.");
    const text = textField(reason, "Resolución", 10, 600);
    const r = await this.pool.query(
      "UPDATE golf_community.reports SET resolved_at=now(),resolution=$2,resolved_by=$3 WHERE id=$1 AND resolved_at IS NULL RETURNING id",
      [id, text, actor.id],
    );
    if (!r.rows.length)
      throw new CommunityError(409, "Denuncia inexistente o ya resuelta.");
    return { id };
  }
  async audit(actor: CommunityActor, id: string, revision: number) {
    if (!actor.moderator) throw new CommunityError(403, "Solo moderación.");
    const r = await this.pool.query(
      "SELECT actor_id,previous_status,next_status,reason,created_at FROM golf_community.moderation WHERE creation_id=$1 AND revision=$2 ORDER BY created_at",
      [id, revision],
    );
    return r.rows;
  }
}
export function communityPool(url: string) {
  return new pg.Pool({
    connectionString: url,
    max: 5,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
  });
}
