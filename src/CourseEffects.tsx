import { useEffect, useMemo, useRef } from "react";
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
function Water({ zone }: { zone: Zone }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
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
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, -0.15]}
          position={[
            ((i * 3.7) % (zone.width - 1)) - (zone.width - 1) / 2,
            0.015,
            ((i * 5.3) % (zone.length - 1)) - (zone.length - 1) / 2,
          ]}
        >
          <planeGeometry args={[0.6 + (i % 3) * 0.3, 0.035]} />
          <meshBasicMaterial color="#b8ede4" transparent opacity={0.24} />
        </mesh>
      ))}
    </group>
  );
}
export function CourseWater({ course }: { course: Course }) {
  return (
    <>
      {course.water?.map((zone, i) => (
        <Water key={i} zone={zone} />
      ))}
      {[
        ...(course.rough || []).map((z) => ({ ...z, shade: "#536b38" })),
        ...(course.dirt || []).map((z) => ({ ...z, shade: "#967352" })),
        ...(course.sand || []).map((z) => ({ ...z, shade: "#d9bf86" })),
      ].map((zone, i) => (
        <mesh
          key={`sand${i}`}
          position={[zone.x, zone.y + 0.008, zone.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[zone.width, zone.length]} />
          <meshStandardMaterial color={zone.shade} roughness={1} />
        </mesh>
      ))}
    </>
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
  const color = power > 0.8 ? "#ffba73" : "#ffe4a2";
  return (
    <group
      position={[from.x, from.y + 0.015, from.z]}
      rotation={[0, -angle, 0]}
    >
      <mesh position={[0, -0.012, -length / 2]} renderOrder={6}>
        <boxGeometry args={[0.1, 0.018, length]} />
        <meshBasicMaterial color="#284b40" depthTest={false} />
      </mesh>
      <mesh position={[0, 0, -length / 2]} renderOrder={7}>
        <boxGeometry args={[0.045, 0.025, length]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      {[0.25, 0.5, 0.75].map((t) => (
        <mesh key={t} position={[0, 0.01, -length * t]} renderOrder={8}>
          <boxGeometry args={[0.16, 0.025, 0.035]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      ))}
      <mesh
        position={[0, 0.02, -length + 0.14]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={9}
      >
        <coneGeometry args={[0.13, 0.28, 3]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
    </group>
  );
}

export function ImpactEffect({
  event,
  time,
}: {
  event: State["event"];
  time: number;
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
