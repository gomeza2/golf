import type { SelectionAction } from "../shared/workshopTools";
export function WorkshopSelection({
  count,
  step,
  onAction,
  canDuplicate,
}: {
  count: number;
  step: number;
  onAction: (action: SelectionAction) => void;
  canDuplicate: boolean;
}) {
  const actions: [SelectionAction, string][] = [
    ["left", "Mover grupo a la izquierda"],
    ["right", "Mover grupo a la derecha"],
    ["up", "Mover grupo hacia arriba"],
    ["down", "Mover grupo hacia abajo"],
    ["rotate", "Girar grupo 90°"],
    ["alignX", "Alinear centros X"],
    ["alignZ", "Alinear centros Z"],
    ["alignHeight", "Alinear alturas"],
    ["duplicate", "Duplicar grupo"],
    ["delete", "Eliminar grupo"],
  ];
  return (
    <div className="workshop-selection" aria-label="Herramientas de selección">
      <h3>{count} piezas seleccionadas</h3>
      <p>Movimiento de {step} m. Cada operación se deshace en un paso.</p>
      {actions.map(([id, label]) => (
        <button
          key={id}
          disabled={id === "duplicate" && !canDuplicate}
          onClick={() => onAction(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
