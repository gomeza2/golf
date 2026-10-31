import { useEffect, useRef } from "react";
export function PauseDialog({
  onResume,
  onSettings,
  onRestart,
  onLeave,
  saveStatus,
}: {
  onResume: () => void;
  onSettings: () => void;
  onRestart?: () => void;
  onLeave: () => void;
  saveStatus?: "saved" | "unavailable";
}) {
  const dialog = useRef<HTMLElement>(null),
    resume = useRef(onResume);
  resume.current = onResume;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      element = dialog.current!;
    const buttons = () =>
      Array.from(
        element.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      );
    buttons()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        resume.current();
      }
      if (e.key === "Tab") {
        const list = buttons(),
          first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    element.addEventListener("keydown", key);
    return () => {
      element.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        className="panel pause-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Partida en pausa"
      >
        <div className="eyebrow">PAUSA LOCAL</div>
        <h2>El campo puede esperar.</h2>
        <p>
          La pelota y el reloj están detenidos. Conservas tu turno y tu control.
        </p>
        <button className="primary" onClick={onResume}>
          Continuar partida
        </button>
        <button className="secondary" onClick={onSettings}>
          Sonido y controles
        </button>
        {onRestart && (
          <button className="secondary" onClick={onRestart}>
            Reiniciar práctica
          </button>
        )}
        <button className="text-button" onClick={onLeave}>
          Salir al club
        </button>
        <small>
          {saveStatus === "saved"
            ? "Guardado automático activo. Puedes salir y reanudar desde el club, incluso después de recargar. Una nueva partida local sustituye el guardado."
            : "El navegador no permitió guardar. No cierres esta pestaña si quieres conservar la partida."}
        </small>
      </section>
    </div>
  );
}
