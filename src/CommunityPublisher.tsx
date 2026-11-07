import { clearCommunityIntent } from "./communityIntent";
import { useState } from "react";
import type { WorkshopDocument } from "../shared/workshop";
import { difficultyLabels, type Difficulty } from "../shared/community";
import { CommunityPreview } from "./CommunityPreview";
import { communityRequest } from "./communityApi";
export type PublicationTarget = { id: string; expectedVersion: number };
export function CommunityPublisher({
  base,
  token,
  document,
  target,
  author,
  onPublished,
  onCancel,
}: {
  base: string;
  token: string;
  document: WorkshopDocument;
  target?: PublicationTarget;
  author: string;
  onPublished: (id: string, revision: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(author === "Sin alias" ? "" : author),
    [description, setDescription] = useState(""),
    [difficulty, setDifficulty] = useState<Difficulty>("medium"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section
      className="community-publisher"
      aria-label="Enviar creación a revisión"
    >
      <div>
        <small>
          {target
            ? `NUEVA REVISIÓN · ${target.expectedVersion + 1}`
            : "PRIMERA PUBLICACIÓN"}
        </small>
        <h2>{document.name}</h2>
        <CommunityPreview document={document} />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await communityRequest<{
              id: string;
              revision: number;
            }>(base, "/creations", token, {
              document,
              authorName: name,
              description,
              difficulty,
              ...(target
                ? {
                    creationId: target.id,
                    expectedVersion: target.expectedVersion,
                  }
                : {}),
            });
            clearCommunityIntent("club-community-publish");
            onPublished(result.id, result.revision);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Compartí la idea de tu cancha</h3>
        <p>
          Esta revisión queda fija. Se enviará a moderación; aparecerá en la
          galería cuando sea aprobada.
        </p>
        <label className="field">
          Nombre de autor
          <input
            required
            minLength={2}
            maxLength={48}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          Descripción
          <textarea
            required
            minLength={15}
            maxLength={1200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explica las rutas, los riesgos y lo que hace especial a tu cancha."
          />
        </label>
        <label className="field">
          Dificultad indicada por el autor
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {Object.entries(difficultyLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <p>
          Las características se calculan a partir del diseño. La revisión de
          contenido no certifica que todas sus rutas se puedan completar.
        </p>
        {error && <p role="alert">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Enviando…" : "Enviar a revisión"}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={onCancel}
          disabled={busy}
        >
          Cancelar publicación
        </button>
      </form>
    </section>
  );
}
