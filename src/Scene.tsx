import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  getCourse,
  getCircuit,
  geometry,
  cupGreen,
  greenArea,
  courseSize,
  CUP_RADIUS,
  CUP_DEPTH,
  blockPose,
  colors,
  type Block,
} from "../shared/courses";
import type { State } from "../shared/game";
import { wrapAngle } from "../shared/shot";
import {
  AimLine,
  CourseWater,
  ImpactEffect,
  useGrassTexture,
} from "./CourseEffects";
import type { ControlMode } from "./shotControls";
import type { useShotControls } from "./useShotControls";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  followPose,
  overviewPose,
  overviewFrame,
  overviewBounds,
  turnAngle,
  type CameraLook,
} from "./camera";
import {
  renderProfile,
  updateShadow,
  type GraphicsMode,
  type QualityTier,
  type RenderProfile,
} from "./graphics";
import { RenderQuality } from "./RenderQuality";
import { ClubFlag, CourseScenery } from "./CourseScenery";
function Box({
  b,
  time,
  grass,
}: {
  b: Block;
  time: number;
  grass?: THREE.Texture;
}) {
  const pose = blockPose(b, time);
  const box = useMemo(() => {
    const result = b.bevel
      ? new RoundedBoxGeometry(...b.size, 2, b.bevel)
      : new THREE.BoxGeometry(...b.size);
    if (grass) {
      const uv = result.attributes.uv,
        vertices = result.attributes.position;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, vertices.getX(i) / 4, vertices.getZ(i) / 4);
    }
    return result;
  }, [b.size[0], b.size[1], b.size[2], b.bevel, grass]);
  useEffect(() => () => box.dispose(), [box]);
  return (
    <mesh
      position={pose.pos}
      rotation={[b.rotation || 0, pose.yaw, 0]}
      castShadow
      receiveShadow
    >
      <primitive object={box} attach="geometry" />
      <meshStandardMaterial
        color={b.color || "#dbc89f"}
        roughness={0.8}
        map={grass}
      />
    </mesh>
  );
}
function Green({
  course,
  color,
}: {
  course: ReturnType<typeof getCourse>;
  color: string;
}) {
  const grass = useGrassTexture();
  const mesh = useMemo(() => {
    const data = cupGreen(course),
      result = new THREE.BufferGeometry();
    result.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(data.vertices, 3),
    );
    result.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        data.vertices.flatMap((_, i) =>
          i % 3 === 0 ? [data.vertices[i] / 4, data.vertices[i + 2] / 4] : [],
        ),
        2,
      ),
    );
    result.setIndex(data.indices);
    result.computeVertexNormals();
    return result;
  }, [course]);
  useEffect(() => () => mesh.dispose(), [mesh]);
  return (
    <mesh geometry={mesh} receiveShadow>
      <meshStandardMaterial
        color={color}
        map={grass}
        roughness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
function CupLiner() {
  const shape = useMemo(() => {
    const shape = new THREE.CylinderGeometry(
      CUP_RADIUS,
      CUP_RADIUS,
      CUP_DEPTH,
      64,
      1,
      true,
    );
    const positions = shape.attributes.position,
      colors: number[] = [];
    const bottom = new THREE.Color("#758b93"),
      top = new THREE.Color("#d0d8db");
    for (let i = 0; i < positions.count; i++) {
      const color = bottom
        .clone()
        .lerp(top, positions.getY(i) / CUP_DEPTH + 0.5);
      colors.push(color.r, color.g, color.b);
    }
    shape.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return shape;
  }, []);
  useEffect(() => () => shape.dispose(), [shape]);
  return (
    <mesh geometry={shape} position={[0, -CUP_DEPTH / 2, 0]}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} />
    </mesh>
  );
}
function GreenSupport({ course }: { course: ReturnType<typeof getCourse> }) {
  const b = greenArea(course),
    height = course.cup.y + 1.05,
    y = (course.cup.y - 1.05) / 2;
  return (
    <group>
      {[
        {
          pos: [b.minX + 0.075, y, (b.minZ + b.maxZ) / 2],
          size: [0.15, height, b.maxZ - b.minZ],
        },
        {
          pos: [b.maxX - 0.075, y, (b.minZ + b.maxZ) / 2],
          size: [0.15, height, b.maxZ - b.minZ],
        },
        {
          pos: [(b.minX + b.maxX) / 2, y, b.minZ + 0.075],
          size: [b.maxX - b.minX, height, 0.15],
        },
        {
          pos: [(b.minX + b.maxX) / 2, y, b.maxZ - 0.075],
          size: [b.maxX - b.minX, height, 0.15],
        },
      ].map((b, i) => (
        <mesh
          key={i}
          position={b.pos as [number, number, number]}
          receiveShadow
        >
          <boxGeometry args={b.size as [number, number, number]} />
          <meshStandardMaterial color="#51746b" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}
function Ball({
  pos,
  color,
  active,
}: {
  pos: { x: number; y: number; z: number };
  color: string;
  active: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current)
      ref.current.position.lerp(
        new THREE.Vector3(pos.x, pos.y, pos.z),
        Math.min(1, dt * 18),
      );
  });
  return (
    <group>
      <mesh ref={ref} position={[pos.x, pos.y, pos.z]} castShadow>
        <sphereGeometry args={[0.22, 20, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.27}
          metalness={0.12}
          transparent
          opacity={active ? 1 : 0.55}
        />
      </mesh>
      {active && (
        <mesh
          position={[pos.x, 0.025 + Math.max(0, pos.y - 0.22), pos.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.32, 0.38, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}
function Camera({
  s,
  overview,
  angle,
  focusId,
  cameraLook,
}: {
  cameraLook: CameraLook;
  s: State;
  overview: boolean;
  angle: number;
  focusId?: string;
}) {
  const { camera, size, gl } = useThree();
  const target = useRef(new THREE.Vector3()),
    ball = useRef(new THREE.Vector3()),
    heading = useRef(0),
    desiredHeading = useRef(0),
    wasMoving = useRef(false);
  const projectedPoint = useRef(new THREE.Vector3()),
    projectionTime = useRef(0);
  const active = s.players.find((p) => p.id === focusId) || s.players[s.turn];
  const course = getCourse(s),
    inMatch = s.phase === "playing";
  const overviewTarget = useMemo(
    () => overviewPose(course, size.width, size.height, cameraLook, inMatch),
    [course, size.width, size.height, cameraLook, inMatch],
  );
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (overview) {
      const frame = overviewFrame(size.width, size.height, inMatch);
      perspective.setViewOffset(
        size.width,
        size.height,
        frame.offsetX,
        frame.offsetY,
        size.width,
        size.height,
      );
    } else perspective.clearViewOffset();
  }, [camera, overview, size.width, size.height, inMatch]);
  useEffect(() => {
    gl.domElement.dataset.cameraMode = overview ? "overview" : "follow";
    gl.domElement.dataset.focusPlayer = active?.id || "";
  }, [overview, active?.id, gl]);
  useFrame((_, dt) => {
    const p = active?.pos || getCourse(s).start;
    if (
      active?.id === s.players[s.turn]?.id &&
      (!s.moving || !wasMoving.current)
    )
      desiredHeading.current = angle;
    wasMoving.current = s.moving;
    heading.current = turnAngle(
      heading.current,
      desiredHeading.current,
      1 - Math.exp(-dt * 4),
    );
    ball.current.lerp(new THREE.Vector3(p.x, p.y, p.z), 1 - Math.exp(-dt * 9));
    gl.domElement.dataset.lookYaw = String(cameraLook.yaw);
    gl.domElement.dataset.lookPitch = String(cameraLook.pitch);
    let position: THREE.Vector3, look: THREE.Vector3;
    if (overview) {
      position = new THREE.Vector3(
        overviewTarget.position.x,
        overviewTarget.position.y,
        overviewTarget.position.z,
      );
      look = new THREE.Vector3(
        overviewTarget.target.x,
        overviewTarget.target.y,
        overviewTarget.target.z,
      );
    } else {
      const pose = followPose(
        ball.current,
        heading.current,
        size.width / size.height,
        cameraLook,
      );
      position = new THREE.Vector3(
        pose.position.x,
        pose.position.y,
        pose.position.z,
      );
      look = new THREE.Vector3(pose.target.x, pose.target.y, pose.target.z);
    }
    camera.position.lerp(position, 1 - Math.exp(-dt * 3.2));
    target.current.lerp(look, 1 - Math.exp(-dt * 5));
    camera.lookAt(target.current);
    // A bounded diagnostic makes framing verifiable in a real WebGL browser.
    projectionTime.current += dt;
    if (overview && projectionTime.current > 0.25) {
      projectionTime.current = 0;
      camera.updateMatrixWorld();
      const bounds = overviewBounds(course),
        xs: number[] = [],
        ys: number[] = [];
      for (const x of [-bounds.width / 2, bounds.width / 2])
        for (const y of [0, bounds.height])
          for (const z of [-bounds.length / 2, bounds.length / 2]) {
            const v = projectedPoint.current.set(x, y, z).project(camera);
            xs.push(((v.x + 1) * size.width) / 2);
            ys.push(((1 - v.y) * size.height) / 2);
          }
      gl.domElement.dataset.fieldRect = JSON.stringify({
        left: Math.min(...xs),
        right: Math.max(...xs),
        top: Math.min(...ys),
        bottom: Math.max(...ys),
      });
    }
  });
  return null;
}
function SceneReady() {
  const sent = useRef(false);
  useFrame(() => {
    if (!sent.current) {
      sent.current = true;
      requestAnimationFrame(() => {
        void document.fonts.ready.then(() =>
          window.dispatchEvent(new Event("club:scene-ready")),
        );
      });
    }
  });
  return null;
}
function NoGraphics() {
  return (
    <p>El campo necesita WebGL 2. Activa la aceleración gráfica para jugar.</p>
  );
}
function World({
  s,
  angle,
  cameraAngle,
  cameraLook,
  lookMode,
  onLook,
  controlMode,
  canShoot,
  shotInput,
  power,
  overview,
  onPower,
  focusId,
  onAim,
  rendering,
  trainingTarget,
}: {
  s: State;
  angle: number;
  cameraAngle: number;
  cameraLook: CameraLook;
  lookMode: boolean;
  onLook: (delta: Partial<CameraLook>) => void;
  controlMode: ControlMode;
  canShoot: boolean;
  shotInput: ReturnType<typeof useShotControls>;
  power: number;
  onPower: (p: number) => void;
  overview: boolean;
  focusId?: string;
  onAim: (a: number) => void;
  rendering: RenderProfile;
  trainingTarget?: { x: number; y: number; z: number; radius: number };
}) {
  const c = getCourse(s),
    theme = getCircuit(s.circuit);
  const shape = useMemo(() => geometry(c), [c]);
  const dimensions = useMemo(() => courseSize(c), [c]);
  const grass = useGrassTexture();
  const drag = useRef<{
    x: number;
    y: number;
    angle: number;
    power: number;
  } | null>(null);
  const activePointer = useRef<number | null>(null);
  const orbitDrag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    activePointer.current = null;
    drag.current = null;
    orbitDrag.current = null;
  }, [lookMode]);
  useEffect(() => {
    if (!canShoot || (controlMode === "pull" && !shotInput.active)) {
      activePointer.current = null;
      drag.current = null;
    }
  }, [canShoot, controlMode, shotInput.active]);
  useEffect(() => {
    const reset = () => {
      activePointer.current = null;
      drag.current = null;
    };
    window.addEventListener("blur", reset);
    return () => window.removeEventListener("blur", reset);
  }, []);
  const p = s.players[s.turn]?.pos || c.start;
  const blocks = useMemo(
    () =>
      shape.walls
        .map((b): Block => ({ ...b, color: theme.edge }))
        .concat(
          c.blocks.map((b) => ({
            ...b,
            color: b.color || (b.moving ? theme.accent : theme.edge),
          })),
        ),
    [shape, c, theme],
  );
  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog
        attach="fog"
        args={[
          theme.background,
          Math.max(100, dimensions.length * 6),
          Math.max(230, dimensions.length * 12),
        ]}
      />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#e9fff5", "#6b7050", 1.3]} />
      <directionalLight
        onUpdate={updateShadow}
        position={[-12, 25, 8]}
        intensity={s.circuit === "moonlight" ? 2 : 3}
        color={s.circuit === "moonlight" ? "#a6d8ff" : "#ffe2b2"}
        castShadow={rendering.shadowSize > 0}
        shadow-mapSize={[
          Math.max(1, rendering.shadowSize),
          Math.max(1, rendering.shadowSize),
        ]}
        shadow-camera-left={
          -Math.max(dimensions.width, dimensions.length) * 0.65 - 4
        }
        shadow-camera-right={
          Math.max(dimensions.width, dimensions.length) * 0.65 + 4
        }
        shadow-camera-top={
          Math.max(dimensions.width, dimensions.length) * 0.65 + 4
        }
        shadow-camera-bottom={
          -Math.max(dimensions.width, dimensions.length) * 0.65 - 4
        }
        shadow-normalBias={0.025}
      />
      <Camera
        s={s}
        overview={overview}
        angle={cameraAngle}
        focusId={focusId}
        cameraLook={cameraLook}
      />
      <SceneReady />
      {trainingTarget && (
        <group
          position={[trainingTarget.x, trainingTarget.y, trainingTarget.z]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[trainingTarget.radius - 0.08, trainingTarget.radius, 48]}
            />
            <meshBasicMaterial
              color="#ffdb85"
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.08, 16]} />
            <meshBasicMaterial color="#ffdb85" />
          </mesh>
        </group>
      )}
      <CourseWater course={c} detail={rendering.detail} />
      <ImpactEffect event={s.event} time={s.time} detail={rendering.detail} />
      <CourseScenery course={c} circuit={s.circuit} detail={rendering.detail} />
      {s.circuit !== "skyruins" && (
        <mesh position={[0, -1.7, 0]} receiveShadow>
          <boxGeometry
            args={[dimensions.width + 2, 1.3, dimensions.length + 2]}
          />
          <meshStandardMaterial
            color={s.circuit === "moonlight" ? "#284658" : "#234b43"}
          />
        </mesh>
      )}
      <GreenSupport course={c} />
      <Green course={c} color={theme.ground} />
      <group position={[c.start.x, c.start.y - 0.21, c.start.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.57, 0.6, 32, 1, 0, Math.PI]} />
          <meshBasicMaterial color="#d1d9be" transparent opacity={0.65} />
        </mesh>
        {[-0.85, 0.85].map((x) => (
          <mesh key={x} position={[x, 0.04, 0]}>
            <cylinderGeometry args={[0.09, 0.1, 0.08, 10]} />
            <meshStandardMaterial color="#f5d69b" />
          </mesh>
        ))}
      </group>

      {shape.surfaces.map((b, i) => (
        <Box
          key={i}
          b={{ ...b, color: theme.ground }}
          time={s.time}
          grass={grass}
        />
      ))}
      {blocks.map((b, i) => (
        <Box key={i} b={b} time={s.time} />
      ))}
      <group position={[c.cup.x, c.cup.y + 0.015, c.cup.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CUP_RADIUS, CUP_RADIUS + 0.12, 64]} />
          <meshStandardMaterial
            color="#cbd0d0"
            roughness={0.35}
            metalness={0.25}
          />
        </mesh>
        <mesh
          position={[0, -CUP_DEPTH - 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[CUP_RADIUS, 40]} />
          <meshBasicMaterial color="#81969e" />
        </mesh>
        <CupLiner />
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 2.4, 8]} />
          <meshStandardMaterial color="#f8ead3" />
        </mesh>
        <ClubFlag
          color={theme.accent}
          animated={
            rendering.detail > 0 &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          }
        />
      </group>
      {s.players.length ? (
        s.players.map((p, i) => (
          <Ball
            key={p.id}
            pos={p.pos}
            color={colors[i]}
            active={i === s.turn && !p.done}
          />
        ))
      ) : (
        <Ball pos={c.start} color={colors[0]} active />
      )}
      {!s.moving && s.phase === "playing" && (
        <AimLine course={c} from={p} angle={angle} power={power} />
      )}
      <mesh
        position={[0, p.y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          if (activePointer.current !== e.pointerId) return;
          if (lookMode && orbitDrag.current) {
            onLook({
              yaw: -(e.clientX - orbitDrag.current.x) * 0.006,
              pitch: (e.clientY - orbitDrag.current.y) * 0.004,
            });
            orbitDrag.current = { x: e.clientX, y: e.clientY };
            return;
          }
          if (controlMode === "pull") {
            shotInput.move(e.clientX, e.clientY);
            return;
          }
          if (!drag.current || !e.buttons) return;
          const dx = e.clientX - drag.current.x,
            dy = e.clientY - drag.current.y;
          if (Math.hypot(dx, dy) < 8) return;
          onAim(wrapAngle(drag.current.angle + dx * 0.008));
          onPower(Math.max(0.03, Math.min(1, drag.current.power - dy * 0.003)));
        }}
        onPointerUp={(e) => {
          if (activePointer.current !== e.pointerId) return;
          activePointer.current = null;
          if (lookMode) {
            orbitDrag.current = null;
            (e.target as unknown as Element).releasePointerCapture(e.pointerId);
            return;
          }
          if (controlMode === "pull") shotInput.release();
          drag.current = null;
          (e.target as unknown as Element).releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          if (activePointer.current !== e.pointerId) return;
          activePointer.current = null;
          shotInput.cancel();
          drag.current = null;
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (lookMode) {
            if (activePointer.current !== null) return;
            activePointer.current = e.pointerId;
            orbitDrag.current = { x: e.clientX, y: e.clientY };
            (e.target as unknown as Element).setPointerCapture(e.pointerId);
            return;
          }
          if (
            !canShoot ||
            activePointer.current !== null ||
            (controlMode === "pulse" && shotInput.active)
          )
            return;
          activePointer.current = e.pointerId;
          if (controlMode === "pull") {
            (e.target as unknown as Element).setPointerCapture(e.pointerId);
            shotInput.start(e.clientX, e.clientY);
            return;
          }
          const aimed = Math.atan2(e.point.x - p.x, -(e.point.z - p.z));
          drag.current = { x: e.clientX, y: e.clientY, angle: aimed, power };
          (e.target as unknown as Element).setPointerCapture(e.pointerId);
          onAim(aimed);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial
          side={THREE.DoubleSide}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {s.circuit !== "skyruins" && (
        <mesh
          position={[0, -2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={theme.background} roughness={0.9} />
        </mesh>
      )}
    </>
  );
}
export function Scene({
  graphicsMode,
  ...props
}: Omit<Parameters<typeof World>[0], "rendering"> & {
  graphicsMode: GraphicsMode;
}) {
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [tier, setTier] = useState<QualityTier>(2);
  const profile = renderProfile(graphicsMode, tier, window.devicePixelRatio);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  if (failed)
    return (
      <div className="webgl-error">
        Necesitas un navegador con WebGL 2 para jugar. Activa la aceleración
        gráfica.
      </div>
    );
  return (
    <Canvas
      shadows={profile.shadowSize > 0 ? "soft" : false}
      dpr={profile.ratio}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [19, 28, 26], fov: 43, near: 0.1, far: 1000 }}
      onCreated={({ gl }) =>
        gl.domElement.addEventListener("webglcontextlost", () =>
          setFailed(true),
        )
      }
      fallback={<NoGraphics />}
    >
      <Suspense fallback={null}>
        <RenderQuality
          mode={graphicsMode}
          tier={tier}
          visible={visible}
          onTier={setTier}
        />
        <World {...props} rendering={profile} />
      </Suspense>
    </Canvas>
  );
}
