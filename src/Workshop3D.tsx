import { Manipulator } from "./WorkshopGizmo";
import {
  Canvas,
  useThree,
  useFrame,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { compileWorkshop, type WorkshopDocument } from "../shared/workshop";
import { Box, Green, GreenSupport, CourseCup } from "./Scene";
import { CourseWater, useGrassTexture } from "./CourseEffects";
import { renderProfile, type GraphicsMode } from "./graphics";
export type EditorCameraMemory = {
  position: [number, number, number];
  target: [number, number, number];
};
export type EditorView = "perspective" | "top" | "front" | "side";
type Props = {
  cameraMemory: MutableRefObject<EditorCameraMemory | null>;
  doc: WorkshopDocument;
  selection: string[];
  selected: string | null;
  locked: string[];
  step: number;
  graphicsMode: GraphicsMode;
  placing: boolean;
  buildHeight: number;
  onSelect: (id: string, multiple: boolean) => void;
  onPlace: (x: number, z: number) => void;
  onPreview: (doc: WorkshopDocument | null) => void;
  onCommit: (doc: WorkshopDocument) => void;
  onError: (message: string) => void;
};
type Command = {
  id: number;
  view?: EditorView;
  pan?: [number, number, number];
  zoom?: number;
};
function ConstructionGrid({ height, step }: { height: number; step: number }) {
  const shape = useMemo(() => {
    const points: number[] = [];
    for (let x = -12; x <= 12 + 0.001; x += step)
      points.push(x, height, -24, x, height, 24);
    for (let z = -24; z <= 24 + 0.001; z += step)
      points.push(-12, height, z, 12, height, z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    return geometry;
  }, [height, step]);
  const labels = useMemo(
    () =>
      Array.from({ length: 5 }, (_, n) => {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#e9d395";
        ctx.font = "bold 42px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${n} m`, 64, 32);
        return new THREE.CanvasTexture(canvas);
      }),
    [],
  );
  useEffect(() => () => shape.dispose(), [shape]);
  useEffect(() => () => labels.forEach((t) => t.dispose()), [labels]);
  return (
    <group>
      <lineSegments geometry={shape}>
        <lineBasicMaterial color="#4c766b" transparent opacity={0.65} />
      </lineSegments>
      <mesh position={[-12, 2, 23.5]}>
        <boxGeometry args={[0.045, 4, 0.045]} />
        <meshBasicMaterial color="#e9d395" />
      </mesh>
      {labels.map((texture, n) => (
        <group key={n}>
          <mesh position={[-12, n, 23.5]}>
            <boxGeometry args={[0.5, 0.03, 0.03]} />
            <meshBasicMaterial color="#e9d395" />
          </mesh>
          <sprite position={[-13, n, 23.5]} scale={[1.5, 0.75, 1]}>
            <spriteMaterial map={texture} depthTest={false} />
          </sprite>
        </group>
      ))}
    </group>
  );
}
function Navigation({
  navigation,
  command,
  orbit,
  drag,
  cameraMemory,
}: {
  cameraMemory: Props["cameraMemory"];
  navigation: boolean;
  command: Command;
  orbit: MutableRefObject<OrbitControls | null>;
  drag: MutableRefObject<boolean>;
}) {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const control = new OrbitControls(camera, gl.domElement);
    control.enableDamping = true;
    control.dampingFactor = 0.12;
    control.minDistance = 5;
    control.maxDistance = 150;
    control.maxPolarAngle = Math.PI * 0.96;
    control.target.set(0, 1, 0);
    if (cameraMemory.current) {
      camera.position.set(...cameraMemory.current.position);
      control.target.set(...cameraMemory.current.target);
    }
    control.update();
    const update = () => {
      const pose: EditorCameraMemory = {
        position: camera.position.toArray() as [number, number, number],
        target: control.target.toArray() as [number, number, number],
      };
      cameraMemory.current = pose;
      gl.domElement.dataset.editorCamera = JSON.stringify(pose);
      invalidate();
    };
    control.addEventListener("change", update);
    orbit.current = control;
    update();
    return () => {
      control.removeEventListener("change", update);
      control.dispose();
      orbit.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const c = orbit.current;
    if (!c) return;
    c.mouseButtons.LEFT = navigation ? THREE.MOUSE.ROTATE : undefined;
    c.mouseButtons.RIGHT = navigation ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    c.touches.ONE = navigation
      ? THREE.TOUCH.ROTATE
      : (undefined as unknown as THREE.TOUCH);
    c.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  }, [navigation]);
  useEffect(() => {
    const c = orbit.current;
    if (!c) return;
    if (command.view) {
      c.target.set(0, 1, 0);
      const positions: Record<EditorView, [number, number, number]> = {
        perspective: [32, 35, 46],
        top: [0, 70, 0.01],
        front: [0, 6, 70],
        side: [75, 6, 0],
      };
      camera.position.set(...positions[command.view]);
      camera.lookAt(c.target);
    }
    if (command.pan) {
      const delta = new THREE.Vector3(...command.pan);
      camera.position.add(delta);
      c.target.add(delta);
    }
    if (command.zoom)
      camera.position.sub(c.target).multiplyScalar(command.zoom).add(c.target);
    c.update();
    invalidate();
  }, [command]);
  useFrame(() => {
    if (orbit.current) {
      orbit.current.enabled = !drag.current;
      orbit.current.update();
    }
  });
  return null;
}
function World(
  p: Props & {
    navigation: boolean;
    mode: "translate" | "rotate" | "scale";
    command: Command;
    isolate: boolean;
    showGrid: boolean;
  },
) {
  const { invalidate, gl, camera } = useThree(),
    orbit = useRef<OrbitControls | null>(null),
    drag = useRef(false);
  const course = useMemo(() => compileWorkshop(p.doc), [p.doc]),
    grass = useGrassTexture();
  const pieces = useMemo(
    () =>
      p.doc.pieces.map((piece) => ({
        piece,
        course: compileWorkshop({ ...p.doc, pieces: [piece] }),
      })),
    [p.doc],
  );
  const lastHit = useRef<string | null>(null);
  const click = useRef<{ id: string; x: number; y: number } | null>(null);
  const down = (e: ThreeEvent<PointerEvent>, id: string) => {
    e.stopPropagation();
    click.current = { id, x: e.clientX, y: e.clientY };
  };
  const up = (e: ThreeEvent<PointerEvent>, id: string) => {
    e.stopPropagation();
    const start = click.current;
    click.current = null;
    if (
      p.navigation ||
      drag.current ||
      !start ||
      start.id !== id ||
      Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5
    )
      return;
    if (p.placing) {
      p.onPlace(e.point.x, e.point.z);
      return;
    }
    let chosen = id;
    if (e.altKey) {
      const ids = [
        ...new Set(
          e.intersections
            .map((hit) => {
              let obj: THREE.Object3D | null = hit.object;
              while (obj && !obj.userData.editorId) obj = obj.parent;
              return obj?.userData.editorId as string | undefined;
            })
            .filter((id): id is string => !!id),
        ),
      ];
      if (ids.length)
        chosen =
          ids[
            (ids.indexOf(lastHit.current ?? p.selected ?? "") + 1) % ids.length
          ];
    }
    lastHit.current = chosen;
    p.onSelect(chosen, e.shiftKey || e.ctrlKey || e.metaKey);
  };
  useEffect(() => {
    gl.domElement.dataset.editorReady = "true";
    invalidate();
  }, [p.doc, p.selection, p.locked, p.isolate, p.showGrid, p.navigation]);
  useFrame(() => {
    camera.updateMatrixWorld();
    const coords: Record<string, { x: number; y: number }> = {};
    for (const piece of p.doc.pieces) {
      const v = new THREE.Vector3(
        piece.x,
        piece.kind === "ramp"
          ? (piece.height + piece.endHeight) / 2
          : piece.height + 0.2,
        piece.z,
      ).project(camera);
      coords[piece.id] = {
        x: ((v.x + 1) * gl.domElement.clientWidth) / 2,
        y: ((1 - v.y) * gl.domElement.clientHeight) / 2,
      };
    }
    gl.domElement.dataset.editorPieces = JSON.stringify(coords);
  });
  return (
    <>
      <color attach="background" args={["#102f35"]} />
      <ambientLight intensity={1.6} />
      <hemisphereLight args={["#e4fff5", "#465a48", 1.3]} />
      <directionalLight position={[-15, 35, 20]} intensity={2.5} />
      <Navigation
        navigation={p.navigation}
        command={p.command}
        orbit={orbit}
        drag={drag}
        cameraMemory={p.cameraMemory}
      />
      {p.showGrid && (
        <ConstructionGrid height={p.buildHeight - 0.015} step={p.step} />
      )}
      {pieces.map(({ piece, course: single }) => (
        <group
          key={piece.id}
          userData={{ editorId: piece.id }}
          visible={!p.isolate || p.selection.includes(piece.id)}
          onPointerDown={(e) => down(e, piece.id)}
          onPointerUp={(e) => up(e, piece.id)}
        >
          {single.terrain?.map((b, i) => (
            <Box
              key={i}
              b={{ ...b, color: piece.kind === "ramp" ? "#a2b97c" : "#549476" }}
              time={0}
              grass={grass}
              surfaceLayer={i + 1}
            />
          ))}
          {single.blocks.map((b, i) => (
            <Box
              key={`b${i}`}
              b={{
                ...b,
                color: p.locked.includes(piece.id)
                  ? "#849795"
                  : b.moving
                    ? "#efc97c"
                    : "#c6bba0",
              }}
              time={0}
            />
          ))}
          <CourseWater course={single} detail={0} />
          {p.selection.includes(piece.id) && (
            <mesh
              position={[
                piece.x,
                (piece.kind === "ramp"
                  ? (piece.height + piece.endHeight) / 2
                  : piece.height) + 0.03,
                piece.z,
              ]}
              rotation={[0, (piece.angle * Math.PI) / 180, 0]}
            >
              <boxGeometry
                args={[
                  piece.width + 0.06,
                  piece.kind === "wall" ||
                  piece.kind === "gate" ||
                  piece.kind === "rotor" ||
                  piece.kind === "lift"
                    ? 1
                    : 0.12,
                  piece.length + 0.06,
                ]}
              />
              <meshBasicMaterial
                wireframe
                color={p.locked.includes(piece.id) ? "#b4c9ce" : "#ffe08c"}
                depthTest={false}
              />
            </mesh>
          )}
        </group>
      ))}
      <group
        userData={{ editorId: "cup" }}
        onPointerDown={(e) => down(e, "cup")}
        onPointerUp={(e) => up(e, "cup")}
      >
        <Green course={course} color="#609c79" />
        <GreenSupport course={course} />
        <CourseCup course={course} accent="#f0ca74" animated={false} />
      </group>
      <mesh
        position={[course.start.x, course.start.y, course.start.z]}
        userData={{ editorId: "start" }}
        onPointerDown={(e) => down(e, "start")}
        onPointerUp={(e) => up(e, "start")}
      >
        <sphereGeometry args={[0.22, 20, 12]} />
        <meshStandardMaterial color="#ffe29a" />
      </mesh>
      <mesh
        position={[0, p.buildHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => down(e, "ground")}
        onPointerUp={(e) => {
          if (p.placing) up(e, "ground");
        }}
      >
        <planeGeometry args={[24, 48]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {!p.navigation &&
        !p.placing &&
        p.selection.length > 0 &&
        !p.selection.some((id) => p.locked.includes(id)) && (
          <Manipulator
            doc={p.doc}
            ids={p.selection}
            mode={p.mode}
            step={p.step}
            orbit={orbit}
            drag={drag}
            onPreview={p.onPreview}
            onCommit={p.onCommit}
            onError={p.onError}
          />
        )}
    </>
  );
}
export function Workshop3D(p: Props) {
  const [navigation, setNavigation] = useState(false),
    [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate"),
    [command, setCommand] = useState<Command>({
      id: 0,
      ...(p.cameraMemory.current ? {} : { view: "perspective" as const }),
    }),
    [isolate, setIsolate] = useState(false),
    [showGrid, setShowGrid] = useState(true),
    [failed, setFailed] = useState(false);
  const profile = renderProfile(p.graphicsMode, 1, window.devicePixelRatio);
  const send = (c: Omit<Command, "id">) =>
    setCommand((v) => ({ ...c, id: v.id + 1 }));
  return (
    <section
      className="workshop-editor3d"
      aria-label="Construcción tridimensional"
    >
      <div className="editor3d-bar">
        <strong>CONSTRUIR EN 3D</strong>
        <button aria-pressed={!navigation} onClick={() => setNavigation(false)}>
          Editar escena
        </button>
        <button aria-pressed={navigation} onClick={() => setNavigation(true)}>
          Navegar cámara
        </button>
        <label>
          Vista
          <select
            aria-label="Vista del editor"
            value={command.view ?? "custom"}
            onChange={(e) => send({ view: e.target.value as EditorView })}
          >
            <option value="custom" disabled>
              Vista libre
            </option>
            <option value="perspective">Perspectiva</option>
            <option value="top">Superior</option>
            <option value="front">Frontal</option>
            <option value="side">Lateral</option>
          </select>
        </label>
        <button onClick={() => send({ view: "perspective" })}>
          Encuadrar cancha
        </button>
      </div>
      <div
        className="editor3d-transform"
        role="group"
        aria-label="Manipuladores 3D"
      >
        {(
          [
            ["translate", "Mover en 3D"],
            ["rotate", "Girar en 3D"],
            ["scale", "Escalar en 3D"],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setNavigation(false);
            }}
          >
            {name}
          </button>
        ))}
        <label>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Cuadrícula
        </label>
        <label>
          <input
            type="checkbox"
            checked={isolate}
            disabled={!p.selection.length}
            onChange={(e) => setIsolate(e.target.checked)}
          />
          Aislar selección
        </label>
      </div>
      <div className="editor3d-stage">
        {failed ? (
          <p role="alert">
            No se pudo iniciar WebGL. El plano 2D y tus diseños siguen
            disponibles.
          </p>
        ) : (
          <Canvas
            dpr={profile.ratio}
            frameloop="demand"
            camera={{ position: [32, 35, 46], fov: 43, near: 0.1, far: 500 }}
            onCreated={({ gl }) =>
              gl.domElement.addEventListener("webglcontextlost", () =>
                setFailed(true),
              )
            }
            fallback={
              <p>
                Activa WebGL para construir en 3D. El plano sigue disponible.
              </p>
            }
          >
            <World
              {...p}
              navigation={navigation}
              mode={mode}
              command={command}
              isolate={isolate && p.selection.length > 0}
              showGrid={showGrid}
            />
          </Canvas>
        )}
      </div>
      <div
        className="editor3d-camera-tools"
        aria-label="Desplazar y acercar la cámara"
      >
        {(
          [
            ["←", [-2, 0, 0]],
            ["→", [2, 0, 0]],
            ["↑", [0, 0, -2]],
            ["↓", [0, 0, 2]],
          ] as const
        ).map(([name, pan]) => (
          <button
            key={name}
            aria-label={`Desplazar cámara ${name}`}
            onClick={() => send({ pan: [...pan] })}
          >
            {name}
          </button>
        ))}
        <button onClick={() => send({ zoom: 0.85 })}>Acercar</button>
        <button onClick={() => send({ zoom: 1.18 })}>Alejar</button>
      </div>
      <p className="editor3d-help">
        {navigation
          ? "Arrastra para orbitar. Dos dedos o botón derecho para desplazar; pellizca o usa la rueda para acercar."
          : p.placing
            ? `Toca la escena para construir a ${p.buildHeight} m. Arrastrar no coloca una pieza.`
            : "Toca para seleccionar; usa los ejes para transformar. Shift añade piezas; Alt alterna objetos superpuestos. Esc cancela el arrastre."}
      </p>
    </section>
  );
}
