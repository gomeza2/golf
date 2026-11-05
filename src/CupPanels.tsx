import { useEffect, useRef } from "react";
import { getCircuit } from "../shared/courses";
import type { State } from "../shared/game";
import {
  cupPlans,
  getCupPlan,
  cupStandings,
  cupWinnerLabel,
} from "../shared/cups";
export function CupPicker({
  state,
  disabled,
  onChange,
}: {
  state: State;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const plan = getCupPlan(state.cup?.plan);
  return (
    <section className="cup-picker" aria-label="Preparación de copa">
      <label>
        Tipo de encuentro
        <select
          aria-label="Tipo de encuentro"
          value={plan?.id ?? "single"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="single">Partida única</option>
          {cupPlans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.circuits.length} vueltas
            </option>
          ))}
        </select>
      </label>
      {plan && (
        <>
          <p>{plan.description}</p>
          <ol>
            {plan.circuits.map((id) => (
              <li key={id}>
                {getCircuit(id).name} · {getCircuit(id).courses.length} hoyos
              </li>
            ))}
          </ol>
          <small>
            La copa queda fijada al comenzar. El servidor suma todas las
            vueltas; los empates se resuelven por ases y, si persisten, victoria
            compartida.
          </small>
        </>
      )}
    </section>
  );
}
export function CupTable({ state }: { state: State }) {
  const cup = state.cup;
  if (!cup || cup.phase === "setup") return null;
  const plan = getCupPlan(cup.plan)!,
    rows = cupStandings(cup, state),
    points = cup.format === "stableford";
  return (
    <section className="cup-results" aria-label="Clasificación de la copa">
      <div className="eyebrow">
        {plan.name} · VUELTA {cup.round + 1}/{plan.circuits.length}
      </div>
      <h3>
        {cup.phase === "finished"
          ? cupWinnerLabel(cup)
          : "La copa sigue abierta."}
      </h3>
      <p>
        {points ? "Más puntos gana" : "Menos golpes gana"} · Ases como desempate
        · Retirados fuera del podio.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Puesto / Jugador</th>
              {plan.circuits.map((c, i) => (
                <th key={c} title={getCircuit(c).name}>
                  V{i + 1}
                </th>
              ))}
              <th>{points ? "Puntos" : "Golpes"}</th>
              <th>Ases</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} data-cup-player={p.id}>
                <td>
                  <strong>
                    {p.withdrawn ? "RET" : p.place} · {p.name}
                  </strong>
                  {p.withdrawn && (
                    <small>Retirado · resultados conservados</small>
                  )}
                </td>
                {plan.circuits.map((_, i) => {
                  const r = cup.rounds[i]?.players.find((v) => v.id === p.id);
                  return (
                    <td key={i}>{r ? (points ? r.points : r.strokes) : "—"}</td>
                  );
                })}
                <td>
                  <b>{points ? p.points : p.strokes}</b>
                </td>
                <td>{p.aces}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <small>
        {cup.phase === "playing"
          ? "El total incluye los golpes actuales; cada columna se confirma al cerrar una vuelta. "
          : "Copa cerrada: los resultados ya no cambian. "}
        Solo esta sala · Los reinicios del servidor eliminan las salas; no es un
        ranking global.
      </small>
    </section>
  );
}
export function CupDialog({
  state,
  onClose,
}: {
  state: State;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => {
      if (d.open) d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="panel cup-dialog"
      aria-label="Marcador de la copa"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button className="close" onClick={onClose} aria-label="Cerrar marcador">
        ×
      </button>
      <CupTable state={state} />
      <p>El reloj online sigue corriendo mientras consultas el marcador.</p>
      <button className="secondary" onClick={onClose}>
        Volver a jugar
      </button>
    </dialog>
  );
}
