import { WorkshopOrganization } from "./WorkshopOrganization";
import { WorkshopPlan } from "./WorkshopPlan";
import { names, paletteSections } from "./workshopLabels";
import { Numeric } from "./WorkshopNumeric";
import { transformWorkshop3D } from "../shared/workshopTransform3D";
import { Workshop3D, type EditorCameraMemory } from "./Workshop3D";
import {
  structures,
  insertStructure,
  type StructureId,
} from "../shared/workshopStructures";
import {
  cleanEditor,
  emptyEditor,
  groupSelection,
  selectedGroup,
  assertUnlocked,
  exportWorkshopProject,
  importWorkshopProject,
  type WorkshopEditor,
} from "../shared/workshopProject";
import {
  projectEdit as workshopEdit,
  projectUndo as workshopUndo,
  projectRedo as workshopRedo,
  readEditor,
  saveProject,
  type ProjectHistory as WorkshopHistory,
} from "./workshopProjectStorage";
import { WorkshopBlueprints } from "./WorkshopBlueprints";
import {
  workshopBlueprint,
  type WorkshopBlueprintId,
} from "../shared/workshopBlueprints";
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
  parseWorkshop,
  withWorkshopResources,
  isAdvancedPiece,
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
import { WorkshopPlay } from "./WorkshopPlay";
import {
  readWorkshopDraft,
  readWorkshopLibrary,
  saveWorkshopDraft,
  saveWorkshopLibrary,
} from "./workshopStorage";
import type { GraphicsMode } from "./graphics";
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
  const sectionRef = useRef<HTMLElement>(null),
    toolsRef = useRef<HTMLElement>(null),
    propertiesRef = useRef<HTMLElement>(null),
    stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const change = () =>
      setFullscreen(document.fullscreenElement === sectionRef.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const cameraMemory = useRef<EditorCameraMemory | null>(null);
  const [history, setHistory] = useState<WorkshopHistory>(() => ({
    past: [],
    present: readWorkshopDraft() ?? newWorkshop(),
    future: [],
    editor: readEditor(readWorkshopDraft() ?? newWorkshop()),
    pastEditors: [],
    futureEditors: [],
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
  useEffect(() => {
    propertiesRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selected]);
  const [buildHeight, setBuildHeight] = useState(0),
    [structureTool, setStructureTool] = useState<StructureId | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const clipboard = useRef<WorkshopPiece[] | null>(null);
  useEffect(() => {
    if (deleteIds) deleteDialog.current?.showModal();
  }, [deleteIds]);
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
      if (action !== "duplicate") assertUnlocked(history.editor, selection);
      if (
        action === "delete" &&
        (selection.length > 1 ||
          history.editor.groups.some((g) =>
            g.pieces.some((id) => selection.includes(id)),
          ) ||
          history.present.pieces.some(
            (p) =>
              selection.includes(p.id) && ["floor", "ramp"].includes(p.kind),
          ))
      ) {
        setDeleteIds(selection);
        return;
      }
      const result = transformWorkshopSelection(
        history.present,
        selection,
        action,
        step,
      );
      edit(
        result.doc,
        action === "duplicate" && result.ids.length > 1
          ? groupSelection(result.doc, history.editor, result.ids)
          : undefined,
      );
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
        document.querySelector("dialog[open]") ||
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
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "d"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        if (e.key.toLowerCase() === "c") copySelection();
        else if (e.key.toLowerCase() === "v") pasteSelection();
        else groupAction("duplicate");
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
    setDraftStored(saveProject(history.present, history.editor));
  }, [history.present, history.editor]);
  function edit(d: WorkshopDocument, metadata?: WorkshopEditor) {
    const clean = parseWorkshop(d);
    setHistory((h) => workshopEdit(h, clean, metadata ?? h.editor));
    setNotice("");
  }
  function patchPiece(patch: Partial<WorkshopPiece>) {
    if (selected && history.editor.locked.includes(selected)) {
      setNotice("Desbloquea esta pieza antes de modificarla.");
      return;
    }
    edit({
      ...history.present,
      pieces: history.present.pieces.map((p) =>
        p.id === selected ? { ...p, ...patch } : p,
      ),
    });
  }
  function copySelection() {
    clipboard.current = structuredClone(
      history.present.pieces.filter((p) => selection.includes(p.id)),
    );
    setNotice(
      `${clipboard.current.length} piezas copiadas. Usa Pegar piezas para crear una copia independiente.`,
    );
  }
  function pasteSelection() {
    if (!clipboard.current?.length) {
      setNotice("Primero copia una selección.");
      return;
    }
    try {
      const copies = clipboard.current.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
        x: p.x + gridStep,
        z: p.z + gridStep,
      }));
      const next = {
        ...history.present,
        pieces: [...history.present.pieces, ...copies],
      };
      const validated = parseWorkshop(next);
      edit(
        validated,
        copies.length > 1
          ? groupSelection(
              validated,
              history.editor,
              copies.map((p) => p.id),
            )
          : undefined,
      );
      setGroupIds(copies.map((p) => p.id));
      setSelected(copies[0].id);
    } catch (e) {
      setNotice(`No se pegó la selección: ${(e as Error).message}`);
    }
  }
  function select3D(id: string, multiple: boolean) {
    if (id === "start" || id === "cup") {
      setSelected(id);
      setGroupIds([]);
      return;
    }
    const ids = selectedGroup(history.editor, id);
    const next =
      multiple || multiSelect
        ? selection.includes(id)
          ? selection.filter((p) => !ids.includes(p))
          : [...new Set([...selection, ...ids])]
        : ids;
    setGroupIds(next);
    setSelected(next[0] ?? null);
  }
  function placeAt(x: number, z: number) {
    const point = {
      x: Math.max(-11, Math.min(11, Math.round(x / gridStep) * gridStep)),
      z: Math.max(-23, Math.min(23, Math.round(z / gridStep) * gridStep)),
    };
    try {
      if (structureTool) {
        const result = insertStructure(
          history.present,
          structureTool,
          point.x,
          point.z,
          buildHeight,
        );
        const nextEditor =
          result.ids.length > 1
            ? groupSelection(result.doc, history.editor, result.ids)
            : history.editor;
        edit(result.doc, nextEditor);
        setSelected(result.ids[0]);
        setGroupIds(result.ids);
        setStructureTool(null);
        setTool("select");
        return;
      }
      if (tool === "start") {
        edit({ ...doc, start: point });
        setSelected("start");
        setGroupIds([]);
      } else if (tool === "cup") {
        edit({ ...doc, cup: { ...point, height: buildHeight } });
        setSelected("cup");
        setGroupIds([]);
      } else if (tool !== "select") {
        const thin = ["wall", "gate", "rotor", "lift"].includes(tool),
          id = crypto.randomUUID();
        edit({
          ...doc,
          pieces: [
            ...doc.pieces,
            {
              id,
              kind: tool,
              ...point,
              width: thin ? 4 : 6,
              length: thin ? 0.6 : 8,
              height: buildHeight,
              endHeight:
                tool === "ramp" ? Math.min(4, buildHeight + 2) : buildHeight,
              angle: 0,
            },
          ],
        });
        setSelected(id);
        setGroupIds([id]);
      }
      setTool("select");
    } catch (e) {
      setNotice(`No se construyó la pieza: ${(e as Error).message}`);
    }
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
    if (tool === "select" && !structureTool) {
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
      const grouped =
        target &&
        !multiSelect &&
        history.editor.groups.some((g) => g.pieces.includes(target))
          ? selectedGroup(history.editor, target)
          : ids;
      const nextIds = grouped.length ? grouped : ids;
      setGroupIds(nextIds);
      setSelected(target ?? null);
      if (target && !nextIds.some((id) => history.editor.locked.includes(id))) {
        drag.current = {
          id: target,
          ids: nextIds,
          pointer: e.pointerId,
          from: p,
          doc: history.present,
          moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      return;
    }
    placeAt(p.x, p.z);
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
        {
          id,
          updated: new Date().toISOString(),
          doc: history.present,
          editor: history.editor,
        },
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
  function openBlueprint(id: WorkshopBlueprintId) {
    try {
      const current = history.present;
      const exists = library.some(
        (s) => JSON.stringify(s.doc) === JSON.stringify(current),
      );
      const pristine =
        JSON.stringify(current) === JSON.stringify(newWorkshop());
      if (!exists && !pristine) {
        const next = [
          {
            id: crypto.randomUUID(),
            updated: new Date().toISOString(),
            doc: current,
            editor: history.editor,
          },
          ...library,
        ];
        saveWorkshopLibrary(next);
        setLibrary(next);
      }
      onDetachPublication?.();
      const document = workshopBlueprint(id);
      const editor =
        id === "laboratory"
          ? cleanEditor(document, {
              locked: [],
              groups: [
                {
                  id: "lab-tunnel",
                  name: "Túnel de dos niveles",
                  pieces: document.pieces
                    .filter((p) => p.id.startsWith("tunnel-"))
                    .map((p) => p.id),
                },
                {
                  id: "lab-curve",
                  name: "Curva por tramos",
                  pieces: document.pieces
                    .filter((p) => p.id.startsWith("curve-"))
                    .map((p) => p.id),
                },
              ],
            })
          : emptyEditor();
      edit(document, editor);
      setSaveId(null);
      setSelected(null);
      setGroupIds([]);
      setTool("select");
      setNotice(
        "Diseño editable abierto. Tu trabajo anterior se conserva en la biblioteca; también puedes deshacer.",
      );
    } catch (e) {
      setNotice(`No se reemplazó el borrador: ${(e as Error).message}`);
    }
  }
  function loadText(text: string) {
    try {
      const project = importWorkshopProject(text);
      edit(project.doc, project.editor);
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
    <section ref={sectionRef} className="workshop" aria-label="Taller de hoyos">
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
        <button
          disabled={!document.fullscreenEnabled}
          onClick={async () => {
            try {
              if (document.fullscreenElement === sectionRef.current)
                await document.exitFullscreen();
              else await sectionRef.current?.requestFullscreen();
            } catch {
              setNotice(
                "El navegador no permitió ampliar el editor. Puedes seguir editando aquí.",
              );
            }
          }}
        >
          {fullscreen ? "Salir de pantalla completa" : "Ampliar editor"}
        </button>
      </div>
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
            const blob = new Blob(
                [exportWorkshopProject(history.present, history.editor)],
                { type: "application/json" },
              ),
              url = URL.createObjectURL(blob),
              a = document.createElement("a");
            a.href = url;
            a.download = "cancha.golf.project.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice(
              "Proyecto exportado con grupos y bloqueos; el archivo de cancha sigue disponible por separado.",
            );
          }}
        >
          Exportar proyecto editable
        </button>
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
        <aside ref={toolsRef} className="workshop-tools">
          <div className="workshop-panel-links">
            <button
              onClick={() =>
                stageRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              Volver a la escena 3D
            </button>
          </div>
          <h2>Construir</h2>
          <Numeric
            label="Altura de construcción"
            value={buildHeight}
            min={0}
            max={4}
            onChange={setBuildHeight}
          />
          <p>
            Las estructuras elevadas añaden su altura a este plano. Usa 0 m para
            su posición inicial.
          </p>
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
          {paletteSections.map((category) => (
            <fieldset className="workshop-category" key={category.name}>
              <legend>{category.name}</legend>
              <div className="workshop-palette">
                {category.tools
                  .filter(
                    (k) =>
                      k === "select" ||
                      k === "start" ||
                      k === "cup" ||
                      doc.version === 3 ||
                      !isAdvancedPiece(k),
                  )
                  .map((k) => (
                    <button
                      key={k}
                      aria-pressed={tool === k && !structureTool}
                      onClick={() => {
                        setTool(k);
                        setStructureTool(null);
                        if (k === "cup") setBuildHeight(doc.cup.height);
                      }}
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
            </fieldset>
          ))}
          <fieldset className="workshop-structures">
            <legend>Estructuras combinables</legend>
            {structures.map((s) => (
              <button
                key={s.id}
                title={s.detail}
                aria-pressed={structureTool === s.id}
                onClick={() => {
                  setStructureTool(s.id);
                  setTool("select");
                }}
              >
                {s.name}
              </button>
            ))}
          </fieldset>
          <p>
            {structureTool
              ? structures.find((s) => s.id === structureTool)?.detail
              : tool === "select"
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
              edit(newWorkshop(), emptyEditor());
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
                    edit(s.doc, s.editor ?? emptyEditor());
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
        <div ref={stageRef} className="workshop-map">
          <Workshop3D
            cameraMemory={cameraMemory}
            doc={doc}
            selected={selected}
            selection={selection}
            locked={history.editor.locked}
            step={gridStep}
            graphicsMode={graphicsMode}
            placing={tool !== "select" || !!structureTool}
            buildHeight={buildHeight}
            onSelect={select3D}
            onPlace={placeAt}
            onPreview={setDragDoc}
            onCommit={edit}
            onError={setNotice}
          />
          <div className="workshop-panel-links">
            <button
              onClick={() =>
                toolsRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              Herramientas de construcción
            </button>
            <button
              onClick={() =>
                propertiesRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              Editar selección
            </button>
          </div>
          <h2>Plano 2D de precisión</h2>
          <WorkshopPlan
            doc={doc}
            selection={selection}
            selected={selected}
            pointerDown={pointerDown}
            pointerMove={pointerMove}
            pointerUp={(e) => {
              if (drag.current?.pointer === e.pointerId) finishDrag();
            }}
            pointerCancel={(e) => {
              if (drag.current?.pointer === e.pointerId) finishDrag(true);
            }}
          />
          <p>
            24 × 48 m · Copa gris y salida dorada. Las plataformas se recortan
            alrededor de la copa.
          </p>
        </div>
        <aside ref={propertiesRef} className="workshop-properties">
          <div className="workshop-panel-links">
            <button
              onClick={() =>
                stageRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              Volver a la escena 3D
            </button>
          </div>
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
            <fieldset
              disabled={history.editor.locked.includes(piece.id)}
              className="workshop-piece-fields"
            >
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
              {!["water", "sand", "rough", "dirt"].includes(piece.kind) && (
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
                  if (history.editor.locked.includes(piece.id)) {
                    setNotice("Desbloquea esta pieza antes de eliminarla.");
                    return;
                  }
                  if (
                    ["floor", "ramp"].includes(piece.kind) ||
                    history.editor.groups.some((g) =>
                      g.pieces.includes(piece.id),
                    )
                  ) {
                    setDeleteIds([piece.id]);
                    return;
                  }
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
            </fieldset>
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
          <WorkshopOrganization
            doc={history.present}
            editor={history.editor}
            selection={selection}
            onCopy={copySelection}
            onPaste={pasteSelection}
            onScale={(scale) => {
              try {
                assertUnlocked(history.editor, selection);
                edit(
                  transformWorkshop3D(
                    history.present,
                    selection,
                    { scaleX: scale, scaleZ: scale },
                    gridStep,
                  ),
                );
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
            onEditor={(editor) => edit(history.present, editor)}
            onSelect={(ids) => {
              setGroupIds(ids);
              setSelected(ids[0] ?? null);
              setTool("select");
              setStructureTool(null);
            }}
            onError={setNotice}
          />

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
                Son avisos aproximados de suelo y altura libre, no una
                certificación de jugabilidad. Prueba paredes, pasos y saltos con
                la pelota real.
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
            Puedes guardar y exportar diseños o jugarlos en salas privadas.
            Publicarlos requiere que la comunidad esté configurada.
          </small>
        </aside>
      </div>
      <WorkshopPhysics
        document={history.present}
        onEnableResources={() => {
          edit(withWorkshopResources(history.present));
          setNotice(
            "Recursos avanzados activados. Puedes deshacer esta conversión.",
          );
        }}
        onChange={(physics) => {
          edit(withWorkshopPhysics(history.present, physics));
          setNotice(
            "Física cambiada. Prueba tus rutas; puedes deshacer este cambio.",
          );
        }}
      />
      <WorkshopBlueprints onOpen={openBlueprint} />
      {deleteIds && (
        <dialog
          ref={deleteDialog}
          className="workshop-import"
          aria-label="Confirmar eliminación"
          onCancel={() => setDeleteIds(null)}
        >
          <h2>¿Eliminar {deleteIds.length} piezas?</h2>
          <p>
            Eliminar suelo o grupos puede desconectar el recorrido. Puedes
            deshacer la operación.
          </p>
          <button autoFocus onClick={() => setDeleteIds(null)}>
            Conservar piezas
          </button>
          <button
            onClick={() => {
              try {
                assertUnlocked(history.editor, deleteIds);
                edit({
                  ...history.present,
                  pieces: history.present.pieces.filter(
                    (p) => !deleteIds.includes(p.id),
                  ),
                });
                setGroupIds([]);
                setSelected(null);
              } catch (e) {
                setNotice((e as Error).message);
              }
              setDeleteIds(null);
            }}
          >
            Confirmar eliminación
          </button>
        </dialog>
      )}
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
