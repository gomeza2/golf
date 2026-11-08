import { useEffect, useRef, useState } from "react";
import {
  workshopPhysics,
  workshopPhysicsLabel,
  isAdvancedPiece,
  type WorkshopDocument,
} from "../shared/workshop";
import type { PhysicsEdition } from "../shared/rules";
export function WorkshopPhysics({
  document,
  onChange,
  onEnableResources,
}: {
  document: WorkshopDocument;
  onChange: (physics: PhysicsEdition) => void;
  onEnableResources?: () => void;
}) {
  const current = workshopPhysics(document);
  const [pending, setPending] = useState<PhysicsEdition | "resources" | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (pending !== null) dialog.current?.showModal();
  }, [pending]);
  return (
    <section className="workshop-physics" aria-label="Físicas de la creación">
      <div>
        <strong>Elige cómo se juega</strong>
        <p>
          La física viaja con tu cancha y se comparte con todos sus jugadores.
        </p>
      </div>
      <label>
        Física de la cancha
        <select
          aria-label="Física de la cancha"
          value={current}
          onChange={(e) => {
            const next = Number(e.target.value) as PhysicsEdition;
            if (next !== current) setPending(next);
          }}
        >
          <option
            value={1}
            disabled={document.pieces.some((p) => isAdvancedPiece(p.kind))}
          >
            Original · alcance y aterrizajes anteriores
          </option>
          <option value={2}>Actual · drives largos y rebote por terreno</option>
        </select>
      </label>
      <p>
        {current === 2
          ? "Más alcance por encima del 75 % y aterrizajes según el terreno. Siempre golpe normal."
          : "Conserva el comportamiento de las creaciones anteriores. Puedes probar la física actual sin cambiar las versiones publicadas."}
      </p>
      {document.version < 3 && onEnableResources && (
        <button className="secondary" onClick={() => setPending("resources")}>
          Activar recursos avanzados
        </button>
      )}
      {document.version === 3 && (
        <p>
          Recursos avanzados activos: giro completo, puertas elevables y tierra.
          Para volver a física original, retira esas piezas.
        </p>
      )}
      {pending !== null && (
        <dialog
          ref={dialog}
          className="workshop-physics-dialog"
          aria-labelledby="physics-confirm-title"
          onCancel={() => setPending(null)}
        >
          <h2 id="physics-confirm-title">
            {pending === "resources"
              ? "¿Activar recursos avanzados?"
              : `¿Usar ${workshopPhysicsLabel(pending).toLocaleLowerCase("es")}?`}
          </h2>
          <p>
            {pending === "resources"
              ? "Se habilitan tres piezas con física actual y un nuevo formato de archivo. "
              : "Cambiará el alcance y la respuesta de los aterrizajes. "}
            Las versiones publicadas y las copias de la biblioteca permanecen
            intactas.
          </p>
          <p>
            El cambio se puede deshacer. Prueba de nuevo tus rutas antes de
            publicar o invitar amigos.
          </p>
          <div className="workshop-actions">
            <button autoFocus onClick={() => setPending(null)}>
              Conservar física
            </button>
            <button
              className="primary"
              onClick={() => {
                if (pending === "resources") onEnableResources?.();
                else onChange(pending);
                setPending(null);
              }}
            >
              {pending === "resources" ? "Activar recursos" : "Cambiar física"}
            </button>
          </div>
        </dialog>
      )}
    </section>
  );
}
