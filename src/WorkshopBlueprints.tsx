import {
  workshopBlueprints,
  workshopBlueprint,
  type WorkshopBlueprintId,
} from "../shared/workshopBlueprints";
import { CommunityPreview } from "./CommunityPreview";
export function WorkshopBlueprints({
  onOpen,
}: {
  onOpen: (id: WorkshopBlueprintId) => void;
}) {
  return (
    <section className="workshop-blueprints" aria-label="Ideas para crear">
      <div>
        <h2>Parte de una idea. Hazla tuya.</h2>
        <p>
          Diseños editables con decisiones de riesgo y construcción. Tu borrador
          anterior se conserva en la biblioteca antes de abrirlos.
        </p>
      </div>
      <div className="workshop-blueprint-grid">
        {workshopBlueprints.map((b) => (
          <button key={b.id} onClick={() => onOpen(b.id)}>
            <CommunityPreview document={workshopBlueprint(b.id)} />
            <span>
              <strong>{b.name}</strong>
              <p>{b.description}</p>
              <small>Abrir diseño editable →</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
