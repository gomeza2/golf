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
type SurfacePatchKind = "rough" | "dirt" | "sand" | "stone" | "wood" | "wet";
type SurfacePatchData = Zone & { kind: SurfacePatchKind; shade: string };

export function CourseWater({
  course,
  detail = 1,
}: {
  course: Course;
  detail?: number;
}) {
  const patches: SurfacePatchData[] = [
    ...(course.rough || []).map((zone) => ({
      ...zone,
      kind: "rough" as const,
      shade: "#536b38",
    })),
    ...(course.dirt || []).map((zone) => ({
      ...zone,
      kind: "dirt" as const,
      shade: "#967352",
    })),
    ...(course.sand || []).map((zone) => ({
      ...zone,
      kind: "sand" as const,
      shade: "#d9bf86",
    })),
    ...(course.stone || []).map((zone) => ({
      ...zone,
      kind: "stone" as const,
      shade: "#879087",
    })),
    ...(course.wood || []).map((zone) => ({
      ...zone,
      kind: "wood" as const,
      shade: "#9a704b",
    })),
    ...(course.wet || []).map((zone) => ({
      ...zone,
      kind: "wet" as const,
      shade: "#477f83",
    })),
  ];
  return (
    <>
      {course.water?.map((zone, i) => (
        <Water key={i} zone={zone} detail={detail} />
      ))}
      {patches.map((zone, i) => (
        <SurfacePatch key={`${zone.kind}-${i}`} zone={zone} />
      ))}
    </>
  );
}

function SurfacePatch({ zone }: { zone: SurfacePatchData }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(0, 0, 128, 128);

    if (zone.kind === "wood") {
      for (let row = 0; row < 8; row++) {
        const y = row * 16;
        ctx.fillStyle = row % 2 ? "rgba(74,43,22,.16)" : "rgba(255,227,184,.12)";
        ctx.fillRect(0, y, 128, 15);
        ctx.strokeStyle = "rgba(54,37,25,.42)";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(0, y + 15);
        ctx.lineTo(128, y + 15);
        ctx.stroke();
        for (let x = (row % 2) * 13 + 8; x < 128; x += 42) {
          ctx.fillStyle = "rgba(40,31,24,.42)";
          ctx.beginPath();
          ctx.arc(x, y + 7, 1.25, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let grain = 0; grain < 7; grain++) {
          const x = (row * 19 + grain * 31) % 120;
          ctx.strokeStyle = "rgba(80,48,24,.13)";
          ctx.beginPath();
          ctx.moveTo(x, y + 3 + (grain % 3) * 3);
          ctx.lineTo(x + 7 + (grain % 4) * 4, y + 3 + (grain % 3) * 3);
          ctx.stroke();
        }
      }
    } else if (zone.kind === "stone") {
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          const x = col * 23 + (row % 2) * 11 + 3;
          const y = row * 22 + 3;
          const seed = row * 17 + col * 29;
          ctx.fillStyle =
            seed % 3 === 0
              ? "rgba(45,57,55,.22)"
              : seed % 2
                ? "rgba(255,255,255,.14)"
                : "rgba(106,115,105,.18)";
          ctx.beginPath();
          ctx.roundRect(x, y, 19, 18, 4);
          ctx.fill();
          ctx.strokeStyle = "rgba(50,58,54,.18)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    } else if (zone.kind === "wet") {
      for (let i = 0; i < 28; i++) {
        const y = (i * 19) % 124 + 2;
        const x = (i * 37) % 112 + 4;
        ctx.strokeStyle = i % 3 ? "rgba(220,250,245,.22)" : "rgba(22,69,78,.17)";
        ctx.lineWidth = i % 4 === 0 ? 2.2 : 1;
        ctx.beginPath();
        ctx.ellipse(x, y, 5 + (i % 5) * 3, 1.2 + (i % 2), -0.12, 0, Math.PI * 1.65);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 2200; i++) {
        const x = (i * 31 + Math.floor(i / 17) * 7) % 128;
        const y = (i * 19 + Math.floor(i / 23) * 5) % 128;
        ctx.fillStyle =
          zone.kind === "sand"
            ? i % 3
              ? "rgba(115,79,38,.12)"
              : "rgba(255,255,240,.48)"
            : i % 3
              ? "rgba(60,45,30,.13)"
              : "rgba(255,255,245,.6)";
        ctx.fillRect(x, y, 1, i % 7 ? 1 : 2);
      }
    }

    const result = new THREE.CanvasTexture(canvas);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(zone.width / 2, zone.length / 2);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [zone.width, zone.length, zone.kind]);
  useEffect(() => () => texture.dispose(), [texture]);
  const roughness =
    zone.kind === "wet" ? 0.24 : zone.kind === "wood" ? 0.76 : 0.95;
  const metalness = zone.kind === "wet" ? 0.16 : 0;
  // Surface classification has a deterministic priority in surfaceAt().
  // Tiny vertical offsets keep intentionally overlapping coatings from z-fighting.
  const surfaceLayer = {
    rough: 0.008,
    dirt: 0.01,
    sand: 0.012,
    stone: 0.014,
    wood: 0.016,
    wet: 0.018,
  }[zone.kind];
  const renderOrder = {
    rough: 1,
    dirt: 2,
    sand: 3,
    stone: 4,
    wood: 5,
    wet: 6,
  }[zone.kind];
  return (
    <mesh
      position={[zone.x, zone.y + surfaceLayer, zone.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={renderOrder}
      receiveShadow
    >
      <planeGeometry args={[zone.width, zone.length]} />
      <meshStandardMaterial
        color={zone.shade}
        map={texture}
        roughness={roughness}
        metalness={metalness}
      />
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
    <group position={[event.pos.x, event.pos.y, event.pos.z]}>
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
