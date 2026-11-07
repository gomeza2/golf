import { useEffect, useState } from "react";
import type { CreationSummary, RevisionStatus } from "../shared/community";
import { communityRequest } from "./communityApi";
type Report = {
  id: string;
  creation_id: string;
  revision: number;
  category: string;
  details: string;
  reporter: string;
  created_at: string;
};
export function CommunityModeration({
  base,
  token,
  onOpen,
}: {
  base: string;
  token: string;
  onOpen: (id: string, revision: number) => void;
}) {
  const [queue, setQueue] = useState<{
      pending: CreationSummary[];
      reports: Report[];
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState("");
  async function load() {
    try {
      setQueue(await communityRequest(base, "/moderation", token));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [base, token]);
  async function decide(id: string, revision: number, status: RevisionStatus) {
    setBusy(true);
    setError("");
    try {
      await communityRequest(
        base,
        `/creations/${id}/revisions/${revision}/moderate`,
        token,
        { status, reason },
      );
      setReason("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Moderación de creaciones">
      <h2>Revisión y denuncias</h2>
      <p>
        Inspecciona y prueba cada diseño antes de decidir. La decisión y su
        motivo quedan registrados. Retirar afecta a esa revisión y bloquea
        nuevas cargas y salas desde su enlace.
      </p>
      <button className="secondary" onClick={() => void load()}>
        Actualizar cola
      </button>
      {error && <p role="alert">{error}</p>}
      <label className="field">
        Motivo de moderación
        <textarea
          value={reason}
          minLength={10}
          maxLength={600}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo visible para el autor; al retirar una versión publicada también será público."
        />
      </label>
      <h3>Pendientes de revisión</h3>
      {!queue ? (
        <p role="status">Cargando cola…</p>
      ) : queue.pending.length === 0 ? (
        <p>No hay revisiones pendientes.</p>
      ) : (
        queue.pending.map((r) => (
          <article className="community-review" key={`${r.id}:${r.revision}`}>
            <strong>
              {r.title} · v{r.revision}
            </strong>
            <p>
              {r.author.name} · {r.description}
            </p>
            <button onClick={() => onOpen(r.id, r.revision)}>
              Inspeccionar revisión
            </button>
            <button
              disabled={busy || reason.trim().length < 10}
              onClick={() => void decide(r.id, r.revision, "published")}
            >
              Aprobar publicación
            </button>
            <button
              disabled={busy || reason.trim().length < 10}
              onClick={() => void decide(r.id, r.revision, "rejected")}
            >
              Rechazar revisión
            </button>
          </article>
        ))
      )}
      <h3>Denuncias abiertas</h3>
      {queue?.reports.length === 0 && <p>No hay denuncias abiertas.</p>}
      {queue?.reports.map((r) => (
        <article className="community-review" key={r.id}>
          <strong>
            {r.category} · v{r.revision}
          </strong>
          <p>{r.details}</p>
          <small>Enviada por {r.reporter}</small>
          <button onClick={() => onOpen(r.creation_id, r.revision)}>
            Abrir versión denunciada
          </button>
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={() => void decide(r.creation_id, r.revision, "withdrawn")}
          >
            Retirar versión
          </button>
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={async () => {
              setBusy(true);
              try {
                await communityRequest(
                  base,
                  `/reports/${r.id}/resolve`,
                  token,
                  { reason },
                );
                setReason("");
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Cerrar denuncia con motivo
          </button>
        </article>
      ))}
    </section>
  );
}
