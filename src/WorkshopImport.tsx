import { useEffect, useRef } from "react";
import { MAX_WORKSHOP_BYTES } from "../shared/workshop";
export function WorkshopImport({
  text,
  onText,
  onImport,
  onClose,
  error,
  onError,
}: {
  text: string;
  onText: (v: string) => void;
  onImport: (v: string) => void;
  onClose: () => void;
  error: string;
  onError: (v: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    node.querySelector("textarea")?.focus();
    return () => node.close();
  }, []);
  const close = () => {
    dialog.current?.close();
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="workshop-import"
      aria-label="Importar diseño"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <h2>Importar cancha</h2>
      <p>
        Archivo .golf.json del taller, hasta 60 KB. Se valida antes de abrir.
      </p>
      <input
        aria-label="Archivo de diseño"
        type="file"
        accept=".json,application/json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > MAX_WORKSHOP_BYTES) {
            onError("El archivo supera 60 KB.");
            return;
          }
          try {
            onImport(await f.text());
          } catch {
            onError("No se pudo leer el archivo. Vuelve a seleccionarlo.");
          }
        }}
      />
      <textarea
        aria-label="JSON del diseño"
        maxLength={MAX_WORKSHOP_BYTES}
        value={text}
        onChange={(e) => onText(e.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <button onClick={() => onImport(text)}>Abrir diseño importado</button>
      <button onClick={close}>Cancelar importación</button>
    </dialog>
  );
}
