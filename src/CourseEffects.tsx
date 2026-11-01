import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { aimGuide } from "../shared/shot";
import type { Course, V3, Zone } from "../shared/courses";
import type { State } from "../shared/game";
export function useGrassTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 128, 128);
    let seed = 17;
    for (let i = 0; i < 2200; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % 128;
      seed = (seed * 16807) % 2147483647;
      const y = seed % 128;
      ctx.fillStyle = i % 2 ? "rgba(22,64,39,.07)" : "rgba(245,255,211,.08)";
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = "rgba(18,50,30,.07)";
    ctx.fillRect(0, 0, 64, 128);
    const result = new THREE.CanvasTexture(canvas);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
function Water({ zone, detail }: { zone: Zone; detail: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && detail > 0)
      ref.current.position.y =
        zone.y + Math.sin(clock.elapsedTime * 1.2) * 0.015;
  });
  return (
    <group ref={ref} position={[zone.x, zone.y, zone.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[zone.width, zone.length]} />
        <meshStandardMaterial
          color="#208d9c"
          metalness={0.3}
          roughness={0.26}
          transparent
          opacity={0.92}
        />
      </mesh>
      {detail > 0 && <WaterRipples zone={zone} />}
    </group>
  );
}
function WaterRipples({ zone }: { zone: Zone }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(),
      positions: number[] = [];
    for (let i = 0; i < 12; i++) {
      const x =
        ((i * 3.7) % Math.max(0.1, zone.width - 1)) - (zone.width - 1) / 2;
      const z =
        ((i * 5.3) % Math.max(0.1, zone.length - 1)) - (zone.length - 1) / 2;
      const half = (0.6 + (i % 3) * 0.3) / 2;
      for (const [dx, dz] of [
        [-half, -0.018],
        [half, -0.018],
        [half, 0.018],
        [-half, -0.018],
        [half, 0.018],
        [-half, 0.018],
      ])
        positions.push(x + dx, 0.015, z + dz + dx * 0.15);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [zone.width, zone.length]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color="#b8ede4"
        transparent
        opacity={0.24}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
export function CourseWater({
  course,
  detail = 1,
}: {
  course: Course;
  detail?: number;
}) {
  return (
    <>
      {course.water?.map((zone, i) => (
        <Water key={i} zone={zone} detail={detail} />
      ))}
      {[
        ...(course.rough || []).map((z) => ({ ...z, shade: "#536b38" })),
        ...(course.dirt || []).map((z) => ({ ...z, shade: "#967352" })),
        ...(course.sand || []).map((z) => ({ ...z, shade: "#d9bf86" })),
      ].map((zone, i) => (
        <SurfacePatch key={`sand${i}`} zone={zone} />
      ))}
    </>
  );
}
function SurfacePatch({ zone }: { zone: Zone & { shade: string } }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 3 ? "rgba(60,45,30,.13)" : "rgba(255,255,245,.6)";
      ctx.fillRect(
        (i * 31 + Math.floor(i / 17)) % 64,
        (i * 19 + Math.floor(i / 23)) % 64,
        1,
        i % 7 ? 1 : 3,
      );
    }
    const result = new THREE.CanvasTexture(canvas);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(zone.width / 2, zone.length / 2);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [zone.width, zone.length]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      position={[zone.x, zone.y + 0.008, zone.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[zone.width, zone.length]} />
      <meshStandardMaterial color={zone.shade} map={texture} roughness={1} />
    </mesh>
  );
}
export function AimLine({
  course,
  from,
  angle,
  power,
}: {
  course: Course;
  from: V3;
  angle: number;
  power: number;
}) {
  const guide = aimGuide(from, angle, power);
  const length = Math.hypot(
    guide.points[1].x - from.x,
    guide.points[1].z - from.z,
  );
  const color = power > 0.8 ? "#ffae73" : "#fff0b2";
  const head = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.19, 0);
    shape.lineTo(0.19, 0);
    shape.lineTo(0, 0.36);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  useEffect(() => () => head.dispose(), [head]);
  return (
    <group
      position={[from.x, from.y + 0.015, from.z]}
      rotation={[0, -angle, 0]}
    >
      <mesh position={[0, -0.012, -length / 2]} renderOrder={6}>
        <boxGeometry args={[0.13, 0.018, length]} />
        <meshBasicMaterial color="#284b40" depthTest={false} />
      </mesh>
      <mesh position={[0, 0, -length / 2]} renderOrder={7}>
        <boxGeometry args={[0.065, 0.025, length]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      {[0.25, 0.5, 0.75].map((t) => (
        <mesh key={t} position={[0, 0.01, -length * t]} renderOrder={8}>
          <boxGeometry args={[0.21, 0.025, 0.04]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      ))}
      <mesh
        geometry={head}
        position={[0, 0.018, -length + 0.36]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.4, 1, 1]}
        renderOrder={8}
      >
        <meshBasicMaterial
          color="#284b40"
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        geometry={head}
        position={[0, 0.024, -length + 0.36]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={9}
      >
        <meshBasicMaterial
          color={color}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function ImpactEffect({
  event,
  time,
  detail = 1,
}: {
  event: State["event"];
  time: number;
  detail?: number;
}) {
  if (!event || time - event.time > 1 || time < event.time) return null;
  const age = time - event.time;
  return (
    <group
      position={[
        event.pos.x,
        event.kind === "water" ? -0.25 : event.pos.y,
        event.pos.z,
      ]}
    >
      {detail > 0 &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches && (
          <ImpactParticles
            key={`${event.seq}:${detail}`}
            kind={event.kind}
            age={age}
            count={detail === 2 ? 24 : 12}
          />
        )}
      {[0, 0.3].map((offset, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={1 + age * 3 + offset}
        >
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial
            color={event.kind === "water" ? "#c8f6f7" : "#ffdf91"}
            transparent
            opacity={Math.max(0, (1 - age) * 0.8)}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
function ImpactParticles({
  kind,
  age,
  count,
}: {
  kind: NonNullable<State["event"]>["kind"];
  age: number;
  count: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const positions = geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996,
        speed = 0.5 + (i % 5) * 0.18;
      positions.setXYZ(
        i,
        Math.cos(angle) * speed * age,
        Math.max(0, (kind === "water" ? 2.6 : 1.7) * age - 3 * age * age),
        Math.sin(angle) * speed * age,
      );
    }
    positions.needsUpdate = true;
    geometry.computeBoundingSphere();
  }, [geometry, count, age, kind]);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        color={kind === "water" ? "#d7ffff" : "#f3d794"}
        size={kind === "water" ? 0.09 : 0.055}
        transparent
        opacity={Math.max(0, 1 - age)}
        depthWrite={false}
      />
    </points>
  );
}
