import { useEffect, useRef, useState } from "react";
import {
  workshopPhysics,
  workshopPhysicsLabel,
  type WorkshopDocument,
} from "../shared/workshop";
import type { PhysicsEdition } from "../shared/rules";
export function WorkshopPhysics({
  document,
  onChange,
}: {
  document: WorkshopDocument;
  onChange: (physics: PhysicsEdition) => void;
}) {
  const current = workshopPhysics(document);
  const [pending, setPending] = useState<PhysicsEdition | null>(null);
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
          <option value={1}>Original · alcance y aterrizajes anteriores</option>
          <option value={2}>Actual · drives largos y rebote por terreno</option>
        </select>
      </label>
      <p>
        {current === 2
          ? "Más alcance por encima del 75 % y aterrizajes según el terreno. Siempre golpe normal."
          : "Conserva el comportamiento de las creaciones anteriores. Puedes probar la física actual sin cambiar las versiones publicadas."}
      </p>
      {pending !== null && (
        <dialog
          ref={dialog}
          className="workshop-physics-dialog"
          aria-labelledby="physics-confirm-title"
          onCancel={() => setPending(null)}
        >
          <h2 id="physics-confirm-title">
            ¿Usar {workshopPhysicsLabel(pending).toLocaleLowerCase("es")}?
          </h2>
          <p>
            Cambiará el alcance y la respuesta de los aterrizajes. Las versiones
            publicadas y las copias de la biblioteca permanecen intactas.
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
                onChange(pending);
                setPending(null);
              }}
            >
              Cambiar física
            </button>
          </div>
        </dialog>
      )}
    </section>
  );
}
