import { useEffect, useMemo, useRef, useState } from "react";
import {
  compileWorkshop,
  exportWorkshop,
  importWorkshop,
  MAX_WORKSHOP_BYTES,
  newWorkshop,
  pieceKinds,
  workshopIssues,
  type PieceKind,
  type WorkshopDocument,
  type WorkshopPiece,
} from "../shared/workshop";
import { CourseFootprint } from "./CourseFootprint";
import { WorkshopPlay } from "./WorkshopPlay";
import {
  readWorkshopDraft,
  readWorkshopLibrary,
  saveWorkshopDraft,
  saveWorkshopLibrary,
  workshopEdit,
  workshopRedo,
  workshopUndo,
  type WorkshopHistory,
} from "./workshopStorage";
import type { GraphicsMode } from "./graphics";
const names: Record<PieceKind, string> = {
  floor: "Plataforma",
  wall: "Pared",
  ramp: "Rampa",
  sand: "Arena",
  rough: "Césped alto",
  water: "Agua",
  gate: "Compuerta",
};
const colors: Record<PieceKind, string> = {
  floor: "#5e9673",
  wall: "#ddcba6",
  ramp: "#b0c47f",
  sand: "#d9bf86",
  rough: "#657541",
  water: "#299bac",
  gate: "#ecb16e",
};
function Numeric({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(Number(value.toFixed(3)))), [value]);
  return (
    <label>
      {label}
      <input
        type="number"
        aria-label={label}
        value={text}
        min={min}
        max={max}
        step="0.5"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = Number(text);
          if (text !== "" && Number.isFinite(n))
            onChange(Math.max(min, Math.min(max, n)));
          else setText(String(value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
export function Workshop({
  onClose,
  graphicsMode,
}: {
  onClose: () => void;
  graphicsMode: GraphicsMode;
}) {
  const [history, setHistory] = useState<WorkshopHistory>(() => ({
    past: [],
    present: readWorkshopDraft() ?? newWorkshop(),
    future: [],
  }));
  const [library, setLibrary] = useState(readWorkshopLibrary),
    [saveId, setSaveId] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [tool, setTool] = useState<"select" | "start" | "cup" | PieceKind>(
      "select",
    ),
    [notice, setNotice] = useState(""),
    [draftStored, setDraftStored] = useState(true),
    [testing, setTesting] = useState(false),
    [json, setJson] = useState<string | null>(null);
  const [dragDoc, setDragDoc] = useState<WorkshopDocument | null>(null);
  const drag = useRef<{
    id: string;
    from: { x: number; z: number };
    doc: WorkshopDocument;
    moved: boolean;
  } | null>(null);
  const doc = dragDoc ?? history.present,
    course = useMemo(() => compileWorkshop(doc), [doc]),
    issues = useMemo(() => workshopIssues(doc), [doc]);
  const piece = doc.pieces.find((p) => p.id === selected);
  useEffect(() => {
    setDraftStored(saveWorkshopDraft(history.present));
  }, [history.present]);
  function edit(d: WorkshopDocument) {
    setHistory((h) => workshopEdit(h, d));
    setNotice("");
  }
  function patchPiece(patch: Partial<WorkshopPiece>) {
    edit({
      ...history.present,
      pieces: history.present.pieces.map((p) =>
        p.id === selected ? { ...p, ...patch } : p,
      ),
    });
  }
  function point(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget,
      p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const matrix = svg.getScreenCTM();
    const q = matrix ? p.matrixTransform(matrix.inverse()) : p;
    return {
      x: Math.max(-11, Math.min(11, Math.round(q.x * 2) / 2)),
      z: Math.max(-23, Math.min(23, Math.round(q.y * 2) / 2)),
    };
  }
  function pointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || !e.isPrimary) return;
    const p = point(e);
    const target = (e.target as Element)
      .closest("[data-piece]")
      ?.getAttribute("data-piece");
    if (tool === "select") {
      setSelected(target ?? null);
      if (target) {
        drag.current = {
          id: target,
          from: p,
          doc: history.present,
          moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      return;
    }
    if (tool === "start") {
      edit({ ...doc, start: p });
      setSelected("start");
    } else if (tool === "cup") {
      edit({ ...doc, cup: { ...p, height: doc.cup.height } });
      setSelected("cup");
    } else {
      if (doc.pieces.length >= 80) {
        setNotice("Máximo de 80 piezas.");
        return;
      }
      const id = crypto.randomUUID();
      const next: WorkshopPiece = {
        id,
        kind: tool,
        ...p,
        width: tool === "wall" || tool === "gate" ? 4 : 6,
        length: tool === "wall" || tool === "gate" ? 0.6 : 8,
        height: 0,
        endHeight: tool === "ramp" ? 2 : 0,
        angle: 0,
      };
      edit({ ...doc, pieces: [...doc.pieces, next] });
      setSelected(id);
    }
    setTool("select");
  }
  function pointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const active = drag.current;
    if (!active || !e.isPrimary) return;
    const p = point(e),
      dx = p.x - active.from.x,
      dz = p.z - active.from.z;
    const move = (v: { x: number; z: number }) => ({
      x: Math.max(-11, Math.min(11, v.x + dx)),
      z: Math.max(-23, Math.min(23, v.z + dz)),
    });
    active.moved ||= dx !== 0 || dz !== 0;
    const d = active.doc;
    setDragDoc(
      active.id === "start"
        ? { ...d, start: move(d.start) }
        : active.id === "cup"
          ? { ...d, cup: { ...d.cup, ...move(d.cup) } }
          : {
              ...d,
              pieces: d.pieces.map((v) =>
                v.id === active.id ? { ...v, ...move(v) } : v,
              ),
            },
    );
  }
  function finishDrag(cancel = false) {
    if (drag.current?.moved && dragDoc && !cancel) edit(dragDoc);
    drag.current = null;
    setDragDoc(null);
  }
  function save() {
    try {
      const id = saveId ?? crypto.randomUUID();
      const next = [
        { id, updated: new Date().toISOString(), doc: history.present },
        ...library.filter((v) => v.id !== id),
      ];
      saveWorkshopLibrary(next);
      setLibrary(next);
      setSaveId(id);
      setNotice("Diseño guardado en este navegador.");
    } catch (e) {
      setNotice(
        `No se pudo guardar. ${(e as Error).message} Puedes exportar el archivo.`,
      );
    }
  }
  function download() {
    const blob = new Blob([exportWorkshop(doc)], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      (doc.name.replace(/[^\p{L}\p{N}-]/gu, "-").slice(0, 40) || "cancha") +
      ".golf.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Archivo exportado. Se puede importar en otro dispositivo; no es un circuito online.",
    );
  }
  function loadText(text: string) {
    try {
      const d = importWorkshop(text);
      edit(d);
      setSaveId(null);
      setSelected(null);
      setJson(null);
      setNotice("Diseño importado. Comprueba las advertencias y pruébalo.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  if (testing)
    return (
      <WorkshopPlay
        doc={history.present}
        graphicsMode={graphicsMode}
        onBack={() => setTesting(false)}
      />
    );
  return (
    <section className="workshop" aria-label="Taller de hoyos">
      <div className="workshop-heading">
        <div>
          <small>CREAR · PROBAR · COMPARTIR ARCHIVO</small>
          <h1>Taller de hoyos</h1>
          <p>Diseña tu riesgo. Cada pieza usa las físicas del club.</p>
        </div>
        <button onClick={onClose}>Volver al club</button>
      </div>
      <div className="workshop-actions">
        <button
          onClick={() => setHistory(workshopUndo)}
          disabled={!history.past.length}
        >
          Deshacer
        </button>
        <button
          onClick={() => setHistory(workshopRedo)}
          disabled={!history.future.length}
        >
          Rehacer
        </button>
        <button onClick={save}>Guardar diseño</button>
        <button onClick={download}>Exportar archivo</button>
        <button onClick={() => setJson("")}>Importar diseño</button>
        <button
          className="primary"
          disabled={!!issues.length}
          onClick={() => setTesting(true)}
        >
          Probar en 3D
        </button>
      </div>
      <p className="workshop-status" role="status">
        {notice ||
          (draftStored
            ? "Borrador recuperable en este navegador. Guarda una copia en la biblioteca o exporta el archivo."
            : "No se puede guardar el borrador. Exporta el archivo para conservarlo.")}
      </p>
      <div className="workshop-layout">
        <aside className="workshop-tools">
          <h2>Construir</h2>
          <div className="workshop-palette">
            {(["select", "start", "cup", ...pieceKinds] as const).map((k) => (
              <button
                key={k}
                aria-pressed={tool === k}
                onClick={() => setTool(k)}
              >
                {k === "select"
                  ? "Seleccionar"
                  : k === "start"
                    ? "Salida"
                    : k === "cup"
                      ? "Copa"
                      : names[k]}
              </button>
            ))}
          </div>
          <p>
            {tool === "select"
              ? "Toca una pieza para editarla; arrastra para moverla. Cuadrícula de 0,5 m."
              : "Toca el mapa para colocar. Después puedes ajustar su tamaño y posición."}
          </p>
          <label>
            Nombre del diseño
            <input
              aria-label="Nombre del diseño"
              maxLength={48}
              value={doc.name}
              onChange={(e) => {
                if (e.target.value.trim())
                  edit({ ...doc, name: e.target.value });
              }}
            />
          </label>
          <Numeric
            label="Par del diseño"
            value={doc.par}
            min={2}
            max={8}
            onChange={(v) => edit({ ...doc, par: Math.round(v) })}
          />
          <h2>Biblioteca local</h2>
          <button
            onClick={() => {
              edit(newWorkshop());
              setSaveId(null);
              setSelected(null);
            }}
          >
            Nuevo borrador
          </button>
          {library.length === 0 ? (
            <p>Todavía no guardaste diseños.</p>
          ) : (
            library.map((s) => (
              <div className="workshop-save" key={s.id}>
                <button
                  onClick={() => {
                    edit(s.doc);
                    setSaveId(s.id);
                    setSelected(null);
                  }}
                >
                  {s.doc.name}
                </button>
                <button
                  aria-label={`Borrar ${s.doc.name}`}
                  onClick={() => {
                    try {
                      const next = library.filter((v) => v.id !== s.id);
                      saveWorkshopLibrary(next);
                      setLibrary(next);
                      if (saveId === s.id) setSaveId(null);
                      setNotice(
                        "Copia borrada de la biblioteca; el borrador sigue abierto.",
                      );
                    } catch {
                      setNotice("No se pudo borrar la copia.");
                    }
                  }}
                >
                  Borrar
                </button>
              </div>
            ))
          )}
        </aside>
        <div className="workshop-map">
          <svg
            aria-label="Plano editable de la cancha"
            role="img"
            viewBox="-12 -24 24 48"
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={() => finishDrag()}
            onPointerCancel={() => finishDrag(true)}
            onLostPointerCapture={() => finishDrag(true)}
          >
            <defs>
              <pattern
                id="workshop-grid"
                width="1"
                height="1"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 1 0 L 0 0 0 1"
                  fill="none"
                  stroke="#aac2bd"
                  strokeOpacity="0.14"
                  strokeWidth="0.025"
                />
              </pattern>
            </defs>
            <rect x="-12" y="-24" width="24" height="48" fill="#173f46" />
            {doc.pieces
              .filter((p) => p.kind === "water")
              .map((p) => (
                <rect
                  key={p.id}
                  x={p.x - p.width / 2}
                  y={p.z - p.length / 2}
                  width={p.width}
                  height={p.length}
                  fill={colors.water}
                />
              ))}
            <CourseFootprint course={course} color="#58896c" />
            {doc.pieces.map((p) => (
              <g
                key={p.id}
                data-piece={p.id}
                transform={`translate(${p.x} ${p.z}) rotate(${-(p.kind === "floor" ? Math.round(p.angle / 90) * 90 : p.kind === "water" || p.kind === "sand" || p.kind === "rough" ? 0 : p.angle)})`}
              >
                <rect
                  x={-p.width / 2}
                  y={-p.length / 2}
                  width={p.width}
                  height={p.length}
                  fill={
                    p.kind === "floor" || p.kind === "ramp"
                      ? "transparent"
                      : colors[p.kind]
                  }
                  fillOpacity={0.8}
                  stroke={selected === p.id ? "#ffe19a" : "#b4c6a5"}
                  strokeOpacity={selected === p.id ? 1 : 0.5}
                  strokeWidth={selected === p.id ? 0.14 : 0.035}
                />
                {p.kind === "ramp" && (
                  <path
                    d={`M0 ${p.length / 3}L0 ${-p.length / 3}M-0.4 ${-p.length / 3 + 0.5}L0 ${-p.length / 3}L0.4 ${-p.length / 3 + 0.5}`}
                    fill="none"
                    stroke="#fae0a2"
                    strokeWidth="0.12"
                  />
                )}
              </g>
            ))}
            <rect
              x="-12"
              y="-24"
              width="24"
              height="48"
              fill="url(#workshop-grid)"
              pointerEvents="none"
            />
            <circle
              data-piece="start"
              cx={doc.start.x}
              cy={doc.start.z}
              r="0.45"
              fill="#ffe19a"
              stroke={selected === "start" ? "white" : "#244743"}
              strokeWidth="0.12"
            />
            <text
              x={doc.start.x + 0.7}
              y={doc.start.z + 0.2}
              fontSize="0.65"
              fill="white"
              pointerEvents="none"
            >
              SALIDA
            </text>
            <g data-piece="cup">
              <circle
                cx={doc.cup.x}
                cy={doc.cup.z}
                r="0.5"
                fill="#c0cacb"
                stroke={selected === "cup" ? "#ffe19a" : "#fff"}
                strokeWidth="0.12"
              />
              <path
                d={`M${doc.cup.x} ${doc.cup.z}v-1.6h1v0.7h-1`}
                stroke="white"
                strokeWidth="0.12"
                fill="#f3ca79"
              />
            </g>
          </svg>
          <p>
            24 × 48 m · Copa gris y salida dorada. Las plataformas se recortan
            alrededor de la copa.
          </p>
        </div>
        <aside className="workshop-properties">
          <h2>
            {selected === "start"
              ? "Salida"
              : selected === "cup"
                ? "Copa"
                : piece
                  ? names[piece.kind]
                  : "Propiedades"}
          </h2>
          {piece ? (
            <>
              <Numeric
                label="Posición X"
                value={piece.x}
                min={-11}
                max={11}
                onChange={(x) => patchPiece({ x })}
              />
              <Numeric
                label="Posición Z"
                value={piece.z}
                min={-23}
                max={23}
                onChange={(z) => patchPiece({ z })}
              />
              <Numeric
                label="Ancho"
                value={piece.width}
                min={0.5}
                max={22}
                onChange={(width) => patchPiece({ width })}
              />
              <Numeric
                label="Largo"
                value={piece.length}
                min={0.5}
                max={44}
                onChange={(length) => patchPiece({ length })}
              />
              {!["water", "sand", "rough"].includes(piece.kind) && (
                <Numeric
                  label={
                    piece.kind === "floor"
                      ? "Rotación (pasos de 90°)"
                      : "Rotación"
                  }
                  value={piece.angle}
                  min={-180}
                  max={180}
                  onChange={(angle) =>
                    patchPiece({
                      angle:
                        piece.kind === "floor"
                          ? Math.round(angle / 90) * 90
                          : angle,
                    })
                  }
                />
              )}{" "}
              {piece.kind !== "water" && (
                <Numeric
                  label={piece.kind === "ramp" ? "Altura inicial" : "Altura"}
                  value={piece.height}
                  min={0}
                  max={4}
                  onChange={(height) => patchPiece({ height })}
                />
              )}{" "}
              {piece.kind === "ramp" && (
                <Numeric
                  label="Altura final"
                  value={piece.endHeight}
                  min={0}
                  max={4}
                  onChange={(endHeight) => patchPiece({ endHeight })}
                />
              )}
              <button
                onClick={() => {
                  edit({
                    ...doc,
                    pieces: doc.pieces.filter((p) => p.id !== selected),
                  });
                  setSelected(null);
                }}
              >
                Eliminar pieza
              </button>
              <button
                disabled={doc.pieces.length >= 80}
                onClick={() => {
                  const copy = {
                    ...piece,
                    id: crypto.randomUUID(),
                    x: Math.min(11, piece.x + 1),
                    z: Math.min(23, piece.z + 1),
                  };
                  edit({ ...doc, pieces: [...doc.pieces, copy] });
                  setSelected(copy.id);
                }}
              >
                Duplicar pieza
              </button>
            </>
          ) : selected === "start" || selected === "cup" ? (
            <>
              <Numeric
                label="Posición X"
                value={doc[selected].x}
                min={-11}
                max={11}
                onChange={(x) =>
                  edit({ ...doc, [selected]: { ...doc[selected], x } })
                }
              />
              <Numeric
                label="Posición Z"
                value={doc[selected].z}
                min={-23}
                max={23}
                onChange={(z) =>
                  edit({ ...doc, [selected]: { ...doc[selected], z } })
                }
              />
              {selected === "cup" && (
                <Numeric
                  label="Altura de la copa"
                  value={doc.cup.height}
                  min={0}
                  max={4}
                  onChange={(height) =>
                    edit({ ...doc, cup: { ...doc.cup, height } })
                  }
                />
              )}
            </>
          ) : (
            <p>Selecciona una pieza, la salida o la copa en el mapa.</p>
          )}
          <h2>Antes de probar</h2>
          {issues.length ? (
            <ul>
              {issues.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <p>
              Salida y límites válidos. Prueba las rutas: esta revisión no
              garantiza que se pueda embocar.
            </p>
          )}
          <p>
            {doc.pieces.length}/80 piezas · {library.length}/12 copias
          </p>
          <small>
            Diseños locales y archivos compartibles. Todavía no se pueden usar
            en salas online ni publicar en una galería.
          </small>
        </aside>
      </div>
      {json !== null && (
        <div
          className="workshop-import"
          role="dialog"
          aria-modal="true"
          aria-label="Importar diseño"
          onKeyDown={(e) => {
            if (e.key === "Escape") setJson(null);
          }}
        >
          <h2>Importar cancha</h2>
          <p>
            Archivo .golf.json del taller, hasta 60 KB. Se valida antes de
            abrir.
          </p>
          <input
            aria-label="Archivo de diseño"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > MAX_WORKSHOP_BYTES) {
                setNotice("El archivo supera 60 KB.");
                return;
              }
              loadText(await f.text());
            }}
          />
          <textarea
            aria-label="JSON del diseño"
            maxLength={MAX_WORKSHOP_BYTES}
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
          {notice && <p role="alert">{notice}</p>}
          <button onClick={() => loadText(json)}>Abrir diseño importado</button>
          <button onClick={() => setJson(null)}>Cancelar importación</button>
        </div>
      )}
    </section>
  );
}
