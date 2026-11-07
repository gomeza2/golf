import type { Pool } from "pg";
export const COMMUNITY_SCHEMA_VERSION = 1;
const schema = `
CREATE SCHEMA IF NOT EXISTS golf_community;
CREATE TABLE IF NOT EXISTS golf_community.migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS golf_community.authors(
 id uuid PRIMARY KEY, issuer text NOT NULL, subject text NOT NULL, display_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(issuer,subject)
);
CREATE TABLE IF NOT EXISTS golf_community.creations(
 id uuid PRIMARY KEY, author_id uuid NOT NULL REFERENCES golf_community.authors(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS golf_community.revisions(
 creation_id uuid NOT NULL REFERENCES golf_community.creations(id), revision integer NOT NULL CHECK(revision>0),
 title text NOT NULL, description text NOT NULL CHECK(length(description)<=1200), difficulty text NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
 author_name text NOT NULL, document jsonb NOT NULL, hash text NOT NULL CHECK(hash ~ '^[a-f0-9]{64}$'),
 features jsonb NOT NULL, stats jsonb NOT NULL, par integer NOT NULL CHECK(par BETWEEN 2 AND 8),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, reason text NOT NULL DEFAULT '',
 PRIMARY KEY(creation_id,revision)
);
CREATE INDEX IF NOT EXISTS revision_public ON golf_community.revisions(status,creation_id,revision DESC);
CREATE INDEX IF NOT EXISTS revision_features ON golf_community.revisions USING gin(features);
CREATE INDEX IF NOT EXISTS creation_author ON golf_community.creations(author_id);
CREATE TABLE IF NOT EXISTS golf_community.reports(
 id uuid PRIMARY KEY, creation_id uuid NOT NULL, revision integer NOT NULL, reporter_id uuid NOT NULL REFERENCES golf_community.authors(id),
 category text NOT NULL CHECK(category IN ('offensive','broken','plagiarism','other')), details text NOT NULL CHECK(length(details) BETWEEN 15 AND 1200),
 created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, resolution text, resolved_by uuid REFERENCES golf_community.authors(id),
 FOREIGN KEY(creation_id,revision) REFERENCES golf_community.revisions(creation_id,revision), UNIQUE(creation_id,revision,reporter_id)
);
CREATE TABLE IF NOT EXISTS golf_community.moderation(
 id uuid PRIMARY KEY, creation_id uuid NOT NULL, revision integer NOT NULL, actor_id uuid NOT NULL REFERENCES golf_community.authors(id),
 previous_status text NOT NULL, next_status text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(creation_id,revision) REFERENCES golf_community.revisions(creation_id,revision)
);
CREATE OR REPLACE FUNCTION golf_community.immutable_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published revision history cannot be deleted'; END IF;
 IF ROW(NEW.creation_id,NEW.revision,NEW.title,NEW.description,NEW.difficulty,NEW.author_name,NEW.document,NEW.hash,NEW.features,NEW.stats,NEW.par,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.creation_id,OLD.revision,OLD.title,OLD.description,OLD.difficulty,OLD.author_name,OLD.document,OLD.hash,OLD.features,OLD.stats,OLD.par,OLD.created_at)
 THEN RAISE EXCEPTION 'Revision content is immutable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS immutable_revision ON golf_community.revisions;
CREATE TRIGGER immutable_revision BEFORE UPDATE OR DELETE ON golf_community.revisions FOR EACH ROW EXECUTE FUNCTION golf_community.immutable_revision();
CREATE OR REPLACE FUNCTION golf_community.immutable_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Moderation history is append-only'; END $$;
DROP TRIGGER IF EXISTS immutable_audit ON golf_community.moderation;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON golf_community.moderation FOR EACH ROW EXECUTE FUNCTION golf_community.immutable_audit();
INSERT INTO golf_community.migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
`;
export async function migrateCommunity(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(17840217)");
    const exists = await client.query(
      "SELECT to_regclass('golf_community.migrations') AS name",
    );
    if (exists.rows[0].name) {
      const version = await client.query(
        "SELECT max(version) AS version FROM golf_community.migrations",
      );
      if (Number(version.rows[0].version) > COMMUNITY_SCHEMA_VERSION)
        throw Error("La base requiere un servidor más nuevo.");
    }
    await client.query(schema);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
