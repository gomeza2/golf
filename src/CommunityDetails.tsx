import { useEffect, useState } from "react";
import {
  difficultyLabels,
  featureLabels,
  type CreationDetail,
  type CommunityActor,
  type CreationSummary,
} from "../shared/community";
import {
  validateRoomWorkshop,
  workshopFingerprint,
} from "../shared/roomWorkshop";
import type { WorkshopDocument } from "../shared/workshop";
import type { PublicationTarget } from "./CommunityPublisher";
import { communityRequest } from "./communityApi";
import { CommunityPreview } from "./CommunityPreview";
export const revisionLabels = {
  pending: "En revisión",
  published: "Publicada",
  rejected: "Rechazada",
  withdrawn: "Retirada",
};
export function CommunityDetails({
  entry,
  base,
  actor,
  token,
  mine,
  onOpen,
  onSolo,
  onInvite,
  onEdit,
  onLogin,
  onChanged,
}: {
  entry: CreationDetail;
  base: string;
  actor: CommunityActor | null;
  token?: string;
  mine: CreationSummary[];
  onOpen: (id: string, revision: number) => void;
  onSolo: () => void;
  onInvite: () => void;
  onEdit: (doc: WorkshopDocument, target: PublicationTarget) => void;
  onLogin: () => void;
  onChanged: () => void;
}) {
  const [verified, setVerified] = useState(false),
    [error, setError] = useState(""),
    [report, setReport] = useState(false),
    [category, setCategory] = useState("broken"),
    [details, setDetails] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [audit, setAudit] = useState<
      | {
          actor_id: string;
          previous_status: string;
          next_status: string;
          reason: string;
          created_at: string;
        }[]
      | null
    >(null);
  useEffect(() => {
    let alive = true;
    setVerified(false);
    if (entry.document)
      void (async () => {
        try {
          const valid = validateRoomWorkshop(entry.document);
          if ((await workshopFingerprint(valid.canonical)) !== entry.hash)
            throw Error("La revisión no coincide con su contenido.");
          if (alive) setVerified(true);
        } catch (e) {
          if (alive) setError((e as Error).message);
        }
      })();
    return () => {
      alive = false;
    };
  }, [entry.hash, entry.document]);
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set("community", "1");
  url.searchParams.set("creation", entry.id);
  url.searchParams.set("revision", String(entry.revision));
  return (
    <article className="community-detail">
      <div className="community-detail-heading">
        <div>
          <small>
            CREACIÓN · REVISIÓN {entry.revision} ·{" "}
            {revisionLabels[entry.status]}
          </small>
          <h1>{entry.title}</h1>
          <p>
            Por{" "}
            <button
              className="text-button"
              onClick={() => {
                const u = new URL(location.href);
                u.search = "?community=1&authorId=" + entry.author.id;
                history.pushState(null, "", u);
                dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              {entry.author.name}
            </button>{" "}
            · Un hoyo · Par {entry.par}
          </p>
          <span
            className="community-difficulty"
            title="Dificultad indicada por el autor"
          >
            {difficultyLabels[entry.difficulty]}
          </span>
          <p>{entry.description}</p>
          <div className="community-tags">
            {entry.features.map((f) => (
              <span key={f}>{featureLabels[f]}</span>
            ))}
          </div>
          <p>
            {entry.stats.pieces} piezas · {entry.stats.ramps} rampas ·{" "}
            {entry.stats.moving} mecanismos · Altura máxima{" "}
            {entry.stats.maxHeight} m
          </p>
          <p>
            Publicación{" "}
            {entry.publishedAt
              ? new Date(entry.publishedAt).toLocaleDateString("es-AR")
              : "pendiente"}
            . La revisión de contenido no certifica la jugabilidad de todas las
            rutas.
          </p>
        </div>
        {entry.document && <CommunityPreview document={entry.document} />}
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {entry.status === "withdrawn" && (
        <p className="community-notice">
          Esta revisión fue retirada. Su enlace e historial se conservan, pero
          no permite nuevas partidas.
        </p>
      )}
      {entry.reason && (
        <p className="community-notice">Motivo de revisión: {entry.reason}</p>
      )}
      {entry.document && entry.status !== "withdrawn" && (
        <div className="community-actions">
          <button className="primary" disabled={!verified} onClick={onSolo}>
            {verified ? "Jugar en solitario" : "Verificando revisión…"}
          </button>
          {entry.status === "published" && (
            <button
              className="secondary"
              disabled={!verified}
              onClick={onInvite}
            >
              Invitar amigos a esta versión
            </button>
          )}
          {actor?.id === entry.author.id && (
            <button
              className="secondary"
              disabled={!verified}
              onClick={() =>
                onEdit(entry.document!, {
                  id: entry.id,
                  expectedVersion: Math.max(
                    entry.revision,
                    ...mine
                      .filter((r) => r.id === entry.id)
                      .map((r) => r.revision),
                  ),
                })
              }
            >
              Editar nueva versión en el taller
            </button>
          )}
        </div>
      )}
      <label className="field">
        Enlace permanente de esta versión
        <input readOnly value={url.href} onFocus={(e) => e.target.select()} />
      </label>
      <button
        className="text-button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url.href);
            setMessage("Enlace copiado.");
          } catch {
            setMessage("Selecciona y copia el enlace del campo anterior.");
          }
        }}
      >
        Copiar enlace permanente
      </button>
      <section>
        <h2>Historial de versiones</h2>
        <div className="community-version-list">
          {entry.versions.map((v) => (
            <button
              key={v.revision}
              aria-current={v.revision === entry.revision ? "page" : undefined}
              onClick={() => onOpen(entry.id, v.revision)}
            >
              v{v.revision} · {revisionLabels[v.status]}
            </button>
          ))}
        </div>
      </section>
      {entry.status === "published" && (
        <section className="community-report">
          <button
            className="text-button"
            onClick={() => (actor ? setReport(!report) : onLogin())}
          >
            {actor ? "Denunciar esta versión" : "Entrar para denunciar"}
          </button>
          {report && token && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await communityRequest(
                    base,
                    `/creations/${entry.id}/revisions/${entry.revision}/report`,
                    token,
                    { category, details },
                  );
                  setReport(false);
                  setMessage(
                    "Denuncia recibida. Moderación revisará esta versión.",
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                Categoría
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="broken">Diseño no jugable</option>
                  <option value="offensive">Contenido ofensivo</option>
                  <option value="plagiarism">Autoría o copia indebida</option>
                  <option value="other">Otro motivo</option>
                </select>
              </label>
              <label className="field">
                Detalles de la denuncia
                <textarea
                  required
                  minLength={15}
                  maxLength={1200}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </label>
              <button className="secondary" disabled={busy}>
                Enviar denuncia
              </button>
            </form>
          )}
        </section>
      )}
      {actor?.moderator && token && (
        <section className="community-review">
          <h2>Decisión de moderación</h2>
          <label className="field">
            Motivo de la decisión
            <textarea
              value={reason}
              minLength={10}
              maxLength={600}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="community-actions">
            {(entry.status === "pending"
              ? ["published", "rejected"]
              : entry.status === "published"
                ? ["withdrawn"]
                : entry.status === "withdrawn"
                  ? ["published"]
                  : []
            ).map((status) => (
              <button
                className="secondary"
                key={status}
                disabled={busy || reason.trim().length < 10}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await communityRequest(
                      base,
                      `/creations/${entry.id}/revisions/${entry.revision}/moderate`,
                      token,
                      { status, reason },
                    );
                    onChanged();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {status === "published"
                  ? "Aprobar publicación"
                  : status === "rejected"
                    ? "Rechazar revisión"
                    : "Retirar versión"}
              </button>
            ))}
            <button
              className="text-button"
              onClick={async () => {
                try {
                  setAudit(
                    await communityRequest(
                      base,
                      `/creations/${entry.id}/revisions/${entry.revision}/audit`,
                      token,
                    ),
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Ver historial de moderación
            </button>
          </div>
          {audit && (
            <ol>
              {audit.map((a, i) => (
                <li key={i}>
                  {new Date(a.created_at).toLocaleString("es-AR")} ·{" "}
                  {a.previous_status} → {a.next_status}: {a.reason}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </article>
  );
}
