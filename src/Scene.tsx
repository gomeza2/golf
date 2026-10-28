import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  getCourse,
  getCircuit,
  geometry,
  cupGreen,
  cupWalls,
  courseSize,
  CUP_RADIUS,
  CUP_DEPTH,
  blockPose,
  colors,
  type Block,
} from "../shared/courses";
import type { State } from "../shared/game";
import { wrapAngle, type ShotStyle } from "../shared/shot";
import {
  AimLine,
  CourseWater,
  ImpactEffect,
  useGrassTexture,
} from "./CourseEffects";
import { followPose, turnAngle } from "./camera";
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
    const result = new THREE.BoxGeometry(...b.size);
    if (grass) {
      const uv = result.attributes.uv,
        vertices = result.attributes.position;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, vertices.getX(i) / 4, vertices.getZ(i) / 4);
    }
    return result;
  }, [b.size[0], b.size[1], b.size[2], grass]);
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
}: {
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
  const active = s.players.find((p) => p.id === focusId) || s.players[s.turn];
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
    let position: THREE.Vector3, look: THREE.Vector3;
    if (overview) {
      position = new THREE.Vector3(19, 28, 26).multiplyScalar(
        (Math.max(1, 1.05 / (size.width / size.height)) *
          courseSize(getCourse(s)).length) /
          24,
      );
      look = new THREE.Vector3(0, 0, 0);
    } else {
      const pose = followPose(
        ball.current,
        heading.current,
        size.width / size.height,
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
  power,
  style,
  overview,
  onPower,
  focusId,
  onAim,
}: {
  s: State;
  angle: number;
  power: number;
  style: ShotStyle;
  onPower: (p: number) => void;
  overview: boolean;
  focusId?: string;
  onAim: (a: number) => void;
}) {
  const c = getCourse(s),
    theme = getCircuit(s.circuit),
    shape = geometry(c),
    dimensions = courseSize(c);
  const grass = useGrassTexture();
  const drag = useRef<{
    x: number;
    y: number;
    angle: number;
    power: number;
  } | null>(null);
  const p = s.players[s.turn]?.pos || c.start;
  const blocks = shape.walls
    .map((b) => ({ ...b, color: theme.edge }))
    .concat(
      c.blocks.map((b) => ({
        ...b,
        color: b.color || (b.moving ? theme.accent : theme.edge),
      })),
    );
  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.background, 100, 230]} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#e9fff5", "#6b7050", 1.3]} />
      <directionalLight
        position={[-12, 25, 8]}
        intensity={s.circuit === "moonlight" ? 2 : 3}
        color={s.circuit === "moonlight" ? "#a6d8ff" : "#ffe2b2"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Camera s={s} overview={overview} angle={angle} focusId={focusId} />
      <SceneReady />
      <CourseWater course={c} />
      <ImpactEffect event={s.event} time={s.time} />
      <mesh position={[0, -1.7, 0]} receiveShadow>
        <boxGeometry
          args={[dimensions.width + 2, 1.3, dimensions.length + 2]}
        />
        <meshStandardMaterial
          color={s.circuit === "moonlight" ? "#284658" : "#234b43"}
        />
      </mesh>
      <Green course={c} color={theme.ground} />
      {cupWalls(c).map((b, i) => (
        <Box key={`cup-${i}`} b={{ ...b, color: "#132e2b" }} time={s.time} />
      ))}
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
          <ringGeometry args={[CUP_RADIUS, CUP_RADIUS + 0.035, 64]} />
          <meshStandardMaterial color="#eee6cc" roughness={0.4} />
        </mesh>
        <mesh
          position={[0, -CUP_DEPTH - 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[CUP_RADIUS, 40]} />
          <meshBasicMaterial color="#071918" />
        </mesh>
        <mesh position={[0.66, 1.2, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 2.4, 8]} />
          <meshStandardMaterial color="#f8ead3" />
        </mesh>
        <mesh position={[1.13, 2.1, 0]}>
          <boxGeometry args={[0.9, 0.55, 0.04]} />
          <meshStandardMaterial color={theme.accent} />
        </mesh>
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
        <AimLine
          course={c}
          from={p}
          angle={angle}
          power={power}
          time={s.time}
          style={style}
        />
      )}
      <mesh
        position={[0, p.y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          if (!drag.current || !e.buttons) return;
          const dx = e.clientX - drag.current.x,
            dy = e.clientY - drag.current.y;
          if (Math.hypot(dx, dy) < 8) return;
          onAim(wrapAngle(drag.current.angle + dx * 0.008));
          onPower(Math.max(0.03, Math.min(1, drag.current.power - dy * 0.003)));
        }}
        onPointerUp={(e) => {
          drag.current = null;
          (e.target as unknown as Element).releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
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
      {Array.from({ length: 18 }, (_, i) => {
        const x = (i % 2 ? 1 : -1) * (dimensions.width / 2 + 3 + (i % 3) * 2),
          z = ((i * 7) % (dimensions.length + 9)) - (dimensions.length + 8) / 2;
        return (
          <group key={i} position={[x, -0.2, z]}>
            <mesh position={[0, 1, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.22, 2, 6]} />
              <meshStandardMaterial color="#806950" />
            </mesh>
            <mesh position={[0, 2.5, 0]} castShadow>
              <icosahedronGeometry args={[1.4, 0]} />
              <meshStandardMaterial
                color={
                  s.circuit === "moonlight"
                    ? i % 2
                      ? "#557c94"
                      : "#689d9b"
                    : i % 2
                      ? "#638f68"
                      : "#8aa472"
                }
              />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={theme.background} roughness={0.9} />
      </mesh>
    </>
  );
}
export function Scene(props: Parameters<typeof World>[0]) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="webgl-error">
        Necesitas un navegador con WebGL 2 para jugar. Activa la aceleración
        gráfica.
      </div>
    );
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [19, 28, 26], fov: 43, near: 0.1, far: 300 }}
      onCreated={({ gl }) =>
        gl.domElement.addEventListener("webglcontextlost", () =>
          setFailed(true),
        )
      }
      fallback={<NoGraphics />}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
