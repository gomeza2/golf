import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  getCourse,
  getCircuit,
  geometry,
  blockPose,
  colors,
  type Block,
} from "../shared/courses";
import type { State } from "../shared/game";
import { followPose, turnAngle } from "./camera";
function Box({ b, time }: { b: Block; time: number }) {
  const pose = blockPose(b, time);
  return (
    <mesh
      position={pose.pos}
      rotation={[b.rotation || 0, pose.yaw, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={b.size} />
      <meshStandardMaterial color={b.color || "#dbc89f"} roughness={0.65} />
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
        Math.max(1, 1.05 / (size.width / size.height)),
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
  overview,
  focusId,
  onAim,
}: {
  s: State;
  angle: number;
  power: number;
  overview: boolean;
  focusId?: string;
  onAim: (a: number) => void;
}) {
  const c = getCourse(s),
    theme = getCircuit(s.circuit),
    shape = geometry(c);
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
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[14, 1.5, 26]} />
        <meshStandardMaterial
          color={s.circuit === "moonlight" ? "#284658" : "#234b43"}
        />
      </mesh>
      {shape.surfaces.map((b, i) => (
        <Box key={i} b={{ ...b, color: theme.ground }} time={s.time} />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          position={[0, 0.006, i * 2 - 11]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[11.8, 0.98]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={c.ramp ? 0 : 0.035}
          />
        </mesh>
      ))}
      {blocks.map((b, i) => (
        <Box key={i} b={b} time={s.time} />
      ))}
      <group position={[c.cup.x, c.cup.y + 0.015, c.cup.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.46, 40]} />
          <meshBasicMaterial color="#0c2325" />
        </mesh>
        <mesh position={[0.48, 1.2, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 2.4, 8]} />
          <meshStandardMaterial color="#f8ead3" />
        </mesh>
        <mesh position={[0.95, 2.1, 0]}>
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
            active={i === s.turn}
          />
        ))
      ) : (
        <Ball pos={c.start} color={colors[0]} active />
      )}
      {!s.moving && s.phase === "playing" && (
        <group position={[p.x, p.y, p.z]} rotation={[0, -angle, 0]}>
          <mesh
            position={[0, 0, -(0.7 + power * 2)]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.025, 0.045, 1 + power * 4, 8]} />
            <meshBasicMaterial color="#ffdc85" />
          </mesh>
          <mesh
            position={[0, 0, -(1.3 + power * 4)]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.18, 0.5, 12]} />
            <meshBasicMaterial color="#ffdc85" />
          </mesh>
        </group>
      )}
      <mesh
        position={[0, p.y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onAim(Math.atan2(e.point.x - p.x, -(e.point.z - p.z)));
        }}
      >
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial
          side={THREE.DoubleSide}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => {
        const x = (i % 2 ? 1 : -1) * (9 + (i % 3) * 2),
          z = ((i * 7) % 33) - 16;
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
