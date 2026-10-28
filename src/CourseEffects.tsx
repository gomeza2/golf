import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { aimGuide, type ShotStyle } from "../shared/shot";
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
      ctx.fillStyle = i % 2 ? "rgba(22,64,39,.15)" : "rgba(245,255,211,.16)";
      ctx.fillRect(x, y, 1, 2);
    }
    ctx.fillStyle = "rgba(18,50,30,.035)";
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
      {course.sand?.map((zone, i) => (
        <mesh
          key={`sand${i}`}
          position={[zone.x, zone.y + 0.008, zone.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[zone.width, zone.length]} />
          <meshStandardMaterial color="#d9bf86" roughness={1} />
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
  time,
  style,
}: {
  course: Course;
  from: V3;
  angle: number;
  power: number;
  time: number;
  style: ShotStyle;
}) {
  const guide = aimGuide(course, from, angle, power, time, style);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      guide.points.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    );
    const material = new THREE.LineDashedMaterial({
      color: style === "chip" ? "#a0edeb" : "#ffdd88",
      dashSize: 0.3,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const result = new THREE.Line(geometry, material);
    result.computeLineDistances();
    result.renderOrder = 5;
    return result;
  }, [
    course,
    from.x,
    from.y,
    from.z,
    angle,
    power,
    style,
    guide.hit?.x,
    guide.hit?.z,
  ]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  return (
    <>
      <primitive object={line} />
      {guide.hit && (
        <mesh
          position={[guide.hit.x, guide.hit.y, guide.hit.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.25, 0.31, 24]} />
          <meshBasicMaterial color="#ffdd88" depthTest={false} />
        </mesh>
      )}
    </>
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
