import { WorkshopPhysics } from "./WorkshopPhysics";
import type { PublicationTarget } from "./CommunityPublisher";
import { validateRoomWorkshop } from "../shared/roomWorkshop";
import { WorkshopImport } from "./WorkshopImport";
import { diagnoseWorkshop } from "../shared/workshopDiagnostics";
import {
  moveWorkshopPieces,
  transformWorkshopSelection,
  type SelectionAction,
} from "../shared/workshopTools";
import { WorkshopSelection } from "./WorkshopSelection";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  compileWorkshop,
  withWorkshopPhysics,
  workshopPhysics,
  workshopPhysicsLabel,
  exportWorkshop,
  importWorkshop,
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
  onPlayOnline,
  onPublish,
  versionTarget,
  onDetachPublication,
  publicationStatus,
  onRefreshPublication,
}: {
  onClose: () => void;
  graphicsMode: GraphicsMode;
  onPlayOnline?: (document: WorkshopDocument) => void;
  onPublish?: (document: WorkshopDocument) => void;
  versionTarget?: PublicationTarget;
  onDetachPublication?: () => void;
  publicationStatus?: string;
  onRefreshPublication?: () => void;
}) {
  const [history, setHistory] = useState<WorkshopHistory>(() => ({
    past: [],
    present: readWorkshopDraft() ?? newWorkshop(),
    future: [],
  }));
  const [library, setLibrary] = useState(readWorkshopLibrary),
    [saveId, setSaveId] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [groupIds, setGroupIds] = useState<string[]>([]),
    [multiSelect, setMultiSelect] = useState(false),
    [gridStep, setGridStep] = useState(0.5),
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
    ids: string[];
    pointer: number;
    from: { x: number; z: number };
    doc: WorkshopDocument;
    moved: boolean;
  } | null>(null);
  const doc = dragDoc ?? history.present,
    course = useMemo(() => compileWorkshop(doc), [doc]),
    issues = useMemo(() => workshopIssues(doc), [doc]);
  const piece = doc.pieces.find((p) => p.id === selected);
  const selection = groupIds.filter((id) =>
    doc.pieces.some((p) => p.id === id),
  );
  const diagnostics = useMemo(
    () => diagnoseWorkshop(history.present),
    [history.present],
  );
  function groupAction(action: SelectionAction, step = gridStep) {
    try {
      const result = transformWorkshopSelection(
        history.present,
        selection,
        action,
        step,
      );
      edit(result.doc);
      setGroupIds(result.ids);
      setSelected(result.ids[0] ?? null);
    } catch (e) {
      setNotice(`No se aplicó el grupo: ${(e as Error).message}`);
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        testing ||
        json !== null ||
        drag.current ||
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHistory(e.shiftKey ? workshopRedo : workshopUndo);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        setHistory(workshopRedo);
        return;
      }
      if (!selection.length || e.ctrlKey || e.metaKey || e.altKey) return;
      const keys: Record<string, SelectionAction> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        Delete: "delete",
        Backspace: "delete",
      };
      if (keys[e.key]) {
        e.preventDefault();
        groupAction(keys[e.key], e.shiftKey ? 0.1 : gridStep);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [history, groupIds, gridStep, testing, json]);
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
      x: Math.max(-11, Math.min(11, Math.round(q.x / gridStep) * gridStep)),
      z: Math.max(-23, Math.min(23, Math.round(q.y / gridStep) * gridStep)),
    };
  }
  function pointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || !e.isPrimary) return;
    const p = point(e);
    const target = (e.target as Element)
      .closest("[data-piece]")
      ?.getAttribute("data-piece");
    if (tool === "select") {
      if (
        target &&
        doc.pieces.some((v) => v.id === target) &&
        (e.shiftKey || multiSelect)
      ) {
        const ids = selection.includes(target)
          ? selection.filter((id) => id !== target)
          : [...selection, target];
        setGroupIds(ids);
        setSelected(ids[0] ?? null);
        return;
      }
      const ids =
        target && doc.pieces.some((v) => v.id === target)
          ? selection.includes(target)
            ? selection
            : [target]
          : [];
      setGroupIds(ids);
      setSelected(target ?? null);
      if (target) {
        drag.current = {
          id: target,
          ids,
          pointer: e.pointerId,
          from: p,
          doc: history.present,
          moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      return;
    }
    setGroupIds([]);
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
      setGroupIds([id]);
    }
    setTool("select");
  }
  function pointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const active = drag.current;
    if (!active || !e.isPrimary || active.pointer !== e.pointerId) return;
    const p = point(e),
      dx = p.x - active.from.x,
      dz = p.z - active.from.z;
    const move = (v: { x: number; z: number }) => ({
      x: Math.max(-11, Math.min(11, v.x + dx)),
      z: Math.max(-23, Math.min(23, v.z + dz)),
    });
    active.moved ||= dx !== 0 || dz !== 0;
    const d = active.doc;
    try {
      setDragDoc(
        active.id === "start"
          ? { ...d, start: move(d.start) }
          : active.id === "cup"
            ? { ...d, cup: { ...d.cup, ...move(d.cup) } }
            : moveWorkshopPieces(d, active.ids, dx, dz),
      );
    } catch {
      setNotice(
        "El grupo no puede salir de los límites. Su tamaño y separación se conservan.",
      );
    }
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
      setGroupIds([]);
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
          <p>
            Diseña tu riesgo.{" "}
            {workshopPhysicsLabel(workshopPhysics(history.present))} · Guardada
            con tu creación.
          </p>
        </div>
        <button onClick={onClose}>Volver al club</button>
      </div>
      <WorkshopPhysics
        document={history.present}
        onChange={(physics) => {
          edit(withWorkshopPhysics(history.present, physics));
          setNotice(
            "Física cambiada. Prueba tus rutas; puedes deshacer este cambio.",
          );
        }}
      />
      {versionTarget && (
        <div className="private-course-summary">
          <strong>
            Nueva revisión {versionTarget.expectedVersion + 1} de tu creación
          </strong>
          <p>
            El borrador se enviará como una versión adicional; la publicada
            permanece intacta.
          </p>
          <button onClick={onDetachPublication}>
            Publicar como creación nueva
          </button>
        </div>
      )}
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
        <button
          onClick={() => {
            setNotice("");
            setJson("");
          }}
        >
          Importar diseño
        </button>
        <button
          className="primary"
          disabled={!!issues.length}
          onClick={() => setTesting(true)}
        >
          Probar en 3D
        </button>
        {!onPublish && publicationStatus && (
          <div className="publication-service-status">
            <small role="status">{publicationStatus}</small>
            <button onClick={onRefreshPublication}>Comprobar comunidad</button>
          </div>
        )}
        {onPublish && (
          <button
            disabled={!!issues.length}
            onClick={() => {
              try {
                onPublish(validateRoomWorkshop(history.present).document);
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            Publicar en la comunidad
          </button>
        )}
        {onPlayOnline && (
          <button
            disabled={!!issues.length}
            onClick={() => {
              try {
                onPlayOnline(validateRoomWorkshop(history.present).document);
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            Jugar con amigos online
          </button>
        )}
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
          <label>
            Ajuste de cuadrícula
            <select
              aria-label="Ajuste de cuadrícula"
              value={gridStep}
              onChange={(e) => setGridStep(Number(e.target.value))}
            >
              <option value={0.1}>0,1 m · fino</option>
              <option value={0.5}>0,5 m · normal</option>
              <option value={1}>1 m · rápido</option>
            </select>
          </label>
          <button
            aria-pressed={multiSelect}
            onClick={() => {
              setMultiSelect((v) => !v);
              setTool("select");
            }}
          >
            Selección múltiple
          </button>
          <button
            onClick={() => {
              setGroupIds(doc.pieces.map((p) => p.id));
              setSelected(doc.pieces[0]?.id ?? null);
              setTool("select");
            }}
          >
            Seleccionar todas las piezas
          </button>
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
              ? `Toca una pieza para editarla; arrastra para moverla. Cuadrícula de ${gridStep} m. Shift o Selección múltiple para agrupar.`
              : "Toca el mapa para colocar. Después puedes ajustar su tamaño y posición."}
          </p>
          <label>
            Nombre del diseño
            <input
              aria-label="Nombre del diseño"
              maxLength={48}
              key={doc.name}
              defaultValue={doc.name}
              onBlur={(e) => {
                if (e.target.value.trim())
                  edit({ ...doc, name: e.target.value });
                else e.target.value = doc.name;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
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
              onDetachPublication?.();
              edit(newWorkshop());
              setSaveId(null);
              setSelected(null);
              setGroupIds([]);
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
                    setGroupIds([]);
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
            onPointerUp={(e) => {
              if (drag.current?.pointer === e.pointerId) finishDrag();
            }}
            onPointerCancel={(e) => {
              if (drag.current?.pointer === e.pointerId) finishDrag(true);
            }}
            onLostPointerCapture={(e) => {
              if (drag.current?.pointer === e.pointerId) finishDrag(true);
            }}
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
                  stroke={selection.includes(p.id) ? "#ffe19a" : "#b4c6a5"}
                  strokeOpacity={selection.includes(p.id) ? 1 : 0.5}
                  strokeWidth={selection.includes(p.id) ? 0.14 : 0.035}
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
            {selection.length > 1
              ? "Grupo"
              : selected === "start"
                ? "Salida"
                : selected === "cup"
                  ? "Copa"
                  : piece
                    ? names[piece.kind]
                    : "Propiedades"}
          </h2>
          {selection.length > 1 ? (
            <WorkshopSelection
              count={selection.length}
              step={gridStep}
              onAction={groupAction}
              canDuplicate={doc.pieces.length + selection.length <= 80}
            />
          ) : piece ? (
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
                  setGroupIds([]);
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
                  setGroupIds([copy.id]);
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
          {diagnostics.length > 0 && (
            <div className="workshop-diagnostics">
              <h3>Revisar el diseño</h3>
              <ul>
                {diagnostics.map((v, i) => (
                  <li key={i}>{v.message}</li>
                ))}
              </ul>
              <small>
                Son avisos aproximados: no consideran paredes ni resuelven
                tiros. No bloquean las rutas con saltos.
              </small>
            </div>
          )}
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
        <WorkshopImport
          text={json}
          onText={setJson}
          onImport={loadText}
          onClose={() => setJson(null)}
          error={notice}
          onError={setNotice}
        />
      )}
    </section>
  );
}
