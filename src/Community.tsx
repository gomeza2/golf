import { workshopPhysicsLabel } from "../shared/workshop";
import {
  readCommunityIntent,
  readPublicationTarget,
  saveCommunityIntent,
  clearCommunityIntent,
} from "./communityIntent";
import "./community.css";
import { useEffect, useState } from "react";
import type { WorkshopDocument } from "../shared/workshop";
import {
  difficultyLabels,
  featureLabels,
  isCreationId,
  type CommunityConfig,
  type CreationDetail,
  type CreationSummary,
  type Feature,
} from "../shared/community";
import { communityRequest, loadCommunityConfig } from "./communityApi";
import { useCommunityAuth } from "./useCommunityAuth";
import { CommunityPreview } from "./CommunityPreview";
import {
  CommunityPublisher,
  type PublicationTarget,
} from "./CommunityPublisher";
import { CommunityDetails, revisionLabels } from "./CommunityDetails";
import { CommunityModeration } from "./CommunityModeration";
import { WorkshopPlay } from "./WorkshopPlay";
import { readWorkshopDraft } from "./workshopStorage";
import type { GraphicsMode } from "./graphics";
function selection() {
  const p = new URLSearchParams(location.search);
  return {
    id: p.get("creation") || "",
    revision: p.has("revision") ? Number(p.get("revision")) : undefined,
    authorId: p.get("authorId") || "",
  };
}
export function Community({
  base,
  graphicsMode,
  draft,
  target,
  onClose,
  onInvite,
  onEdit,
  onPublicationSent,
}: {
  base: string;
  graphicsMode: GraphicsMode;
  draft: WorkshopDocument | null;
  target?: PublicationTarget;
  onClose: () => void;
  onPublicationSent: () => void;
  onInvite: (entry: CreationDetail) => void;
  onEdit: (doc: WorkshopDocument, target: PublicationTarget) => void;
}) {
  useEffect(() => {
    let alive = true;
    void document.fonts.ready.then(() => {
      if (alive)
        requestAnimationFrame(() =>
          window.dispatchEvent(new Event("club:community-ready")),
        );
    });
    return () => {
      alive = false;
    };
  }, []);
  const [config, setConfig] = useState<CommunityConfig | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState(selection),
    [entry, setEntry] = useState<CreationDetail | null>(null),
    [loading, setLoading] = useState(false),
    [play, setPlay] = useState(false),
    [tab, setTab] = useState<"gallery" | "mine" | "moderation">("gallery");
  const [publication, setPublication] = useState<WorkshopDocument | null>(
    () =>
      draft ||
      (readCommunityIntent("club-community-publish") === "1"
        ? readWorkshopDraft()
        : null),
  );
  const [editTarget] = useState<PublicationTarget | undefined>(
    () => target || readPublicationTarget(),
  );
  const auth = useCommunityAuth(base, config, setError);
  const [q, setQ] = useState(""),
    [author, setAuthor] = useState(""),
    [difficulty, setDifficulty] = useState(""),
    [physics, setPhysics] = useState(""),
    [features, setFeatures] = useState<Feature[]>([]),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [gallery, setGallery] = useState<{
      items: CreationSummary[];
      total: number;
      page: number;
      pageSize: number;
    } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setConfig(null);
    loadCommunityConfig(base, controller.signal)
      .then(setConfig)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            "No se pudo consultar la comunidad. Revisa el servidor e intenta otra vez.",
          );
      });
    return () => controller.abort();
  }, [base, refresh]);
  useEffect(() => {
    const changed = () => {
      setSelected(selection());
      setEntry(null);
      setPlay(false);
      setTab("gallery");
      setPage(1);
    };
    window.addEventListener("popstate", changed);
    return () => window.removeEventListener("popstate", changed);
  }, []);
  function open(id: string, revision?: number) {
    const u = new URL(location.pathname, location.origin);
    u.searchParams.set("community", "1");
    u.searchParams.set("creation", id);
    if (revision) u.searchParams.set("revision", String(revision));
    history.pushState(null, "", u);
    setSelected({ id, revision, authorId: "" });
    setEntry(null);
    setPlay(false);
    setPublication(null);
  }
  function back() {
    setTab("gallery");
    const u = new URL(location.pathname, location.origin);
    u.searchParams.set("community", "1");
    history.pushState(null, "", u);
    setSelected({ id: "", revision: undefined, authorId: "" });
    setEntry(null);
    setPlay(false);
    setPublication(null);
  }
  useEffect(() => {
    if (!config?.available || selected.id) return;
    const c = new AbortController();
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    if (selected.authorId) params.set("authorId", selected.authorId);
    setLoading(true);
    setGallery(null);
    setError("");
    communityRequest<typeof gallery>(
      base,
      "/creations?" + params,
      undefined,
      undefined,
      c.signal,
    )
      .then(setGallery)
      .catch((e) => {
        if (!c.signal.aborted) setError((e as Error).message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [
    config?.available,
    base,
    query,
    page,
    selected.id,
    selected.authorId,
    refresh,
  ]);
  useEffect(() => {
    if (!config?.available || !selected.id) return;
    if (
      !isCreationId(selected.id) ||
      (selected.revision !== undefined &&
        (!Number.isInteger(selected.revision) || selected.revision < 1))
    ) {
      setError("El enlace de creación no es válido.");
      return;
    }
    const c = new AbortController();
    setLoading(true);
    setEntry(null);
    setPlay(false);
    setError("");
    communityRequest<CreationDetail>(
      base,
      `/creations/${selected.id}${selected.revision ? `/revisions/${selected.revision}` : ""}`,
      auth.token,
      undefined,
      c.signal,
    )
      .then(setEntry)
      .catch((e) => {
        if (!c.signal.aborted) setError((e as Error).message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [
    config?.available,
    base,
    selected.id,
    selected.revision,
    auth.token,
    refresh,
  ]);
  async function login() {
    if (publication) {
      saveCommunityIntent("club-community-publish", "1");
      if (editTarget)
        saveCommunityIntent(
          "club-community-target",
          JSON.stringify(editTarget),
        );
    }
    await auth.login();
  }
  if (play && entry?.document)
    return (
      <WorkshopPlay
        doc={entry.document}
        graphicsMode={graphicsMode}
        onBack={() => setPlay(false)}
        label={`COMUNIDAD · REVISIÓN ${entry.revision}`}
        playerName="Golfista"
        backLabel="Volver a la creación"
        context="community"
      />
    );
  return (
    <section className="community-page">
      <div className="community-heading">
        <div>
          <small>EL CLUB LO CONSTRUIMOS ENTRE TODOS</small>
          <h1>Comunidad de canchas</h1>
          <p>
            Descubre ideas. Encuentra tu próximo desafío. Juega una revisión o
            compártela con amigos.
          </p>
        </div>
        <button className="secondary" onClick={onClose}>
          Volver al club
        </button>
      </div>
      {error && (
        <p role="alert" className="community-notice">
          {error}
        </p>
      )}
      {!config ? (
        <div role="status">
          <p>Consultando el servicio de comunidad…</p>
          <button onClick={() => setRefresh((v) => v + 1)}>
            Reintentar conexión
          </button>
        </div>
      ) : !config.available ? (
        <div className="community-empty">
          <h2>La comunidad aún no está activada</h2>
          <p>{config.reason}</p>
          <p>
            Puedes seguir creando, exportando y jugando canchas en las salas
            privadas del taller. La galería requiere una base de datos
            configurada por el propietario.
          </p>
          <button
            className="secondary"
            onClick={() => setRefresh((v) => v + 1)}
          >
            Comprobar de nuevo
          </button>
        </div>
      ) : (
        <>
          <div className="community-account">
            <div>
              {auth.actor ? (
                <>
                  <strong>{auth.actor.name}</strong>
                  <small>
                    {auth.actor.moderator ? "Moderación" : "Autor con cuenta"}
                  </small>
                </>
              ) : (
                <p>
                  Explora y juega sin cuenta. Inicia sesión para publicar o
                  denunciar.
                </p>
              )}
            </div>
            {config.publishing ? (
              auth.actor ? (
                <button
                  className="text-button"
                  onClick={() => void auth.logout()}
                >
                  Cerrar sesión en el club
                </button>
              ) : (
                <button
                  className="secondary"
                  disabled={auth.working || !auth.prepared}
                  onClick={() => void login()}
                >
                  {auth.working ? "Abriendo acceso…" : "Entrar para publicar"}
                </button>
              )
            ) : (
              <p>{config.reason}</p>
            )}
          </div>
          {publication ? (
            <>
              {config.publishing ? (
                auth.actor && auth.token ? (
                  <CommunityPublisher
                    base={base}
                    token={auth.token}
                    document={publication}
                    supportedVersions={config.documentVersions ?? [1]}
                    target={editTarget}
                    author={auth.actor.name}
                    onCancel={() => {
                      setPublication(null);
                      clearCommunityIntent("club-community-publish");
                    }}
                    onPublished={(id, revision) => {
                      onPublicationSent();
                      setPublication(null);
                      void auth.refresh();
                      open(id, revision);
                    }}
                  />
                ) : (
                  <div className="community-empty">
                    <h2>{publication.name}</h2>
                    <p>
                      Tu borrador está listo. Entra con tu cuenta para enviarlo
                      a revisión.
                    </p>
                  </div>
                )
              ) : (
                <p>La publicación todavía no está configurada.</p>
              )}
            </>
          ) : (
            <>
              <nav
                className="community-tabs"
                aria-label="Secciones de comunidad"
              >
                <button
                  aria-pressed={tab === "gallery"}
                  onClick={() => {
                    setTab("gallery");
                    back();
                  }}
                >
                  Explorar canchas
                </button>
                {auth.actor && (
                  <button
                    aria-pressed={tab === "mine"}
                    onClick={() => {
                      back();
                      setTab("mine");
                      void auth.refresh();
                    }}
                  >
                    Mis publicaciones
                  </button>
                )}
                {auth.actor?.moderator && (
                  <button
                    aria-pressed={tab === "moderation"}
                    onClick={() => {
                      back();
                      setTab("moderation");
                    }}
                  >
                    Moderación
                  </button>
                )}
              </nav>
              {selected.id ? (
                <>
                  {loading ? (
                    <p role="status">Cargando revisión…</p>
                  ) : (
                    entry && (
                      <CommunityDetails
                        key={`${entry.id}:${entry.revision}:${entry.status}`}
                        entry={entry}
                        base={base}
                        actor={auth.actor}
                        token={auth.token}
                        mine={auth.mine}
                        onOpen={open}
                        onSolo={() => setPlay(true)}
                        onInvite={() => onInvite(entry)}
                        onEdit={onEdit}
                        onLogin={() => void login()}
                        onChanged={() => setRefresh((v) => v + 1)}
                      />
                    )
                  )}
                  <button className="text-button" onClick={back}>
                    Volver a la galería
                  </button>
                </>
              ) : tab === "moderation" &&
                auth.actor?.moderator &&
                auth.token ? (
                <CommunityModeration
                  base={base}
                  token={auth.token}
                  onOpen={open}
                />
              ) : tab === "mine" ? (
                <section>
                  <h2>Mis publicaciones y revisiones</h2>
                  <p>
                    Las versiones pendientes y rechazadas solo son visibles para
                    su autor y moderación.
                  </p>
                  {auth.mine.length === 0 ? (
                    <p>
                      Todavía no enviaste creaciones. Abre el taller para
                      preparar una.
                    </p>
                  ) : (
                    auth.mine.map((r) => (
                      <button
                        className="community-own-row"
                        key={`${r.id}:${r.revision}`}
                        onClick={() => open(r.id, r.revision)}
                      >
                        <strong>
                          {r.title} · v{r.revision}
                        </strong>
                        <span>{revisionLabels[r.status]}</span>
                        {r.reason && <small>{r.reason}</small>}
                      </button>
                    ))
                  )}
                </section>
              ) : (
                <>
                  <form
                    className="community-search"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const params = new URLSearchParams();
                      if (q.trim()) params.set("q", q.trim());
                      if (author.trim()) params.set("author", author.trim());
                      if (difficulty) params.set("difficulty", difficulty);
                      if (physics) params.set("physics", physics);
                      features.forEach((f) => params.append("feature", f));
                      setPage(1);
                      setQuery(params.toString());
                    }}
                  >
                    <label>
                      Buscar por nombre
                      <input
                        aria-label="Buscar creaciones"
                        maxLength={80}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Una idea, un lugar, un desafío…"
                      />
                    </label>
                    <label>
                      Autor
                      <input
                        aria-label="Filtrar por autor"
                        maxLength={64}
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                      />
                    </label>
                    <label>
                      Dificultad
                      <select
                        aria-label="Filtrar dificultad"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {Object.entries(difficultyLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Física
                      <select
                        aria-label="Filtrar física"
                        disabled={!config.documentVersions?.includes(2)}
                        value={physics}
                        onChange={(e) => setPhysics(e.target.value)}
                      >
                        <option value="">Todas</option>
                        <option value="1">Original</option>
                        <option value="2">Actual</option>
                      </select>
                    </label>
                    <button className="primary">Buscar canchas</button>
                    <fieldset>
                      <legend>Características del diseño</legend>
                      {Object.entries(featureLabels).map(([key, label]) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={features.includes(key as Feature)}
                            onChange={(e) =>
                              setFeatures((v) =>
                                e.target.checked
                                  ? [...v, key as Feature]
                                  : v.filter((f) => f !== key),
                              )
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                  </form>
                  {selected.authorId && (
                    <p>
                      Mostrando creaciones del autor seleccionado.{" "}
                      <button className="text-button" onClick={back}>
                        Ver todos los autores
                      </button>
                    </p>
                  )}
                  {loading ? (
                    <p role="status">Buscando creaciones…</p>
                  ) : (
                    gallery && (
                      <>
                        <div className="community-results-count">
                          {gallery.total}{" "}
                          {gallery.total === 1
                            ? "creación publicada"
                            : "creaciones publicadas"}{" "}
                          · Más recientes primero
                        </div>
                        {gallery.items.length === 0 ? (
                          <div className="community-empty">
                            <h2>Aún no hay canchas para esta búsqueda</h2>
                            <p>
                              Prueba otros filtros o prepara tu creación en el
                              taller.
                            </p>
                          </div>
                        ) : (
                          <div className="community-grid">
                            {gallery.items.map((r) => (
                              <button
                                className="community-card"
                                key={`${r.id}:${r.revision}`}
                                onClick={() => open(r.id, r.revision)}
                              >
                                {r.preview && (
                                  <CommunityPreview document={r.preview} />
                                )}
                                <div>
                                  <small>
                                    v{r.revision} ·{" "}
                                    {difficultyLabels[r.difficulty]}
                                  </small>
                                  <h2>{r.title}</h2>
                                  <p>Por {r.author.name}</p>
                                  <span className="community-physics">
                                    {workshopPhysicsLabel(r.physics ?? 1)}
                                  </span>
                                  <p>{r.description}</p>
                                  <div className="community-tags">
                                    {r.features.map((f) => (
                                      <span key={f}>{featureLabels[f]}</span>
                                    ))}
                                  </div>
                                  <strong>
                                    Un hoyo · Par {r.par} · Explorar →
                                  </strong>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="community-pagination">
                          <button
                            disabled={page === 1}
                            onClick={() => setPage((v) => v - 1)}
                          >
                            Página anterior
                          </button>
                          <span>Página {page}</span>
                          <button
                            disabled={page * gallery.pageSize >= gallery.total}
                            onClick={() => setPage((v) => v + 1)}
                          >
                            Página siguiente
                          </button>
                        </div>
                      </>
                    )
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
