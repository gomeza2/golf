import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { courses, colors, type Block } from "../shared/courses";
import type { State } from "../shared/game";
function Box({ b, time }: { b: Block; time: number }) {
  const a = b.moving ? Math.sin(time * 0.8) * 1.25 : 0;
  return (
    <mesh
      position={b.pos}
      rotation={[b.rotation || 0, a, 0]}
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
function Camera({ s, overview }: { s: State; overview: boolean }) {
  const { camera, size } = useThree();
  const target = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const p = s.players[s.turn]?.pos || courses[s.hole].start;
    const focus = overview
      ? new THREE.Vector3(0, 0, 0)
      : new THREE.Vector3(p.x * 0.25, p.y * 0.4, p.z * 0.35);
    target.current.lerp(focus, Math.min(1, dt * 3));
    const desired = overview
      ? new THREE.Vector3(19, 28, 26)
      : new THREE.Vector3(
          target.current.x + 14,
          target.current.y + 22,
          target.current.z + 20,
        );
    desired
      .sub(target.current)
      .multiplyScalar(Math.max(1, 1.05 / (size.width / size.height)))
      .add(target.current);
    camera.position.lerp(desired, Math.min(1, dt * 2));
    camera.lookAt(target.current);
  });
  return null;
}
function World({
  s,
  angle,
  power,
  overview,
  onAim,
}: {
  s: State;
  angle: number;
  power: number;
  overview: boolean;
  onAim: (a: number) => void;
}) {
  const c = courses[s.hole];
  const p = s.players[s.turn]?.pos || c.start;
  const blocks: Block[] = [
    { pos: [-6.2, 1, 0], size: [0.4, 2, 24] },
    { pos: [6.2, 1, 0], size: [0.4, 2, 24] },
    { pos: [0, 1, 12.2], size: [12, 2, 0.4] },
    { pos: [0, 1, -12.2], size: [12, 2, 0.4] },
    ...c.blocks,
  ];
  return (
    <>
      <color attach="background" args={["#163d3a"]} />
      <fog attach="fog" args={["#163d3a", 100, 230]} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#e9fff5", "#6b7050", 1.3]} />
      <directionalLight
        position={[-12, 25, 8]}
        intensity={3}
        color="#ffe2b2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Camera s={s} overview={overview} />
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[14, 1.5, 26]} />
        <meshStandardMaterial color="#234b43" />
      </mesh>
      {(c.ramp
        ? [
            { pos: [0, -0.2, 7], size: [12, 0.4, 10] },
            {
              pos: [0, 1, -1],
              size: [12, 0.4, 6.46],
              rotation: Math.atan(0.4),
            },
            { pos: [0, 2.2, -8], size: [12, 0.4, 8] },
          ]
        : [{ pos: [0, -0.2, 0], size: [12, 0.4, 24] }]
      ).map((b, i) => (
        <Box
          key={i}
          b={{
            ...b,
            pos: b.pos as [number, number, number],
            size: b.size as [number, number, number],
            color: i % 2 ? "#419979" : "#36876c",
          }}
          time={s.time}
        />
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
          <meshStandardMaterial color="#ffcc68" />
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
              <meshStandardMaterial color={i % 2 ? "#638f68" : "#8aa472"} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#173f3b" roughness={0.9} />
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
      fallback={<p>WebGL no está disponible en este dispositivo.</p>}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
