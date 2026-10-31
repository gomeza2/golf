import { getCircuit } from "../shared/courses";
import { controlModes } from "./shotControls";
import type { LocalSave } from "./localRound";

export function SavedRound({
  save,
  ready,
  onResume,
  onDiscard,
}: {
  save: LocalSave;
  ready: boolean;
  onResume: () => void;
  onDiscard: () => void;
}) {
  if (save.kind === "empty") return null;
  if (save.kind !== "saved")
    return (
      <section className="saved-round" aria-label="Recuperación local">
        <strong>
          {save.kind === "invalid"
            ? "La partida guardada no se puede recuperar."
            : "Guardado local no disponible."}
        </strong>
        <p>
          {save.kind === "invalid"
            ? "El archivo está dañado o pertenece a otras reglas. Puedes descartarlo y empezar otra partida."
            : "El navegador no permitió guardar. Puedes jugar, pero no cerrar esta pestaña si quieres conservar la partida."}
        </p>
        {save.kind === "invalid" && (
          <button className="text-button" onClick={onDiscard}>
            Descartar guardado
          </button>
        )}
      </section>
    );
  const { state, control, savedAt } = save.round,
    circuit = getCircuit(state.circuit);
  return (
    <section className="saved-round" aria-label="Partida local guardada">
      <div className="eyebrow">TU VUELTA TE ESPERA</div>
      <strong>{circuit.name}</strong>
      <p>
        {state.practice
          ? "Entrenamiento"
          : `${state.players.length} ${state.players.length === 1 ? "jugador" : "jugadores"}`}{" "}
        · Hoyo {state.hole + 1}/{circuit.courses.length} ·{" "}
        {controlModes.find((m) => m.id === control)!.name}
      </p>
      <span>{state.players.map((p) => p.name).join(" · ")}</span>
      <small>
        Guardada{" "}
        {new Date(savedAt).toLocaleString("es-AR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
        . Se abrirá en pausa.
      </small>
      <div>
        <button className="primary" disabled={!ready} onClick={onResume}>
          Reanudar partida
        </button>
        <button className="text-button" onClick={onDiscard}>
          Descartar guardado
        </button>
      </div>
      <small>Empezar otra partida local sustituye este guardado.</small>
    </section>
  );
}
