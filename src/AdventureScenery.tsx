import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { courseSize, type Course } from "../shared/courses";
/** Landmarks sit beyond the recovery boundary; all playable obstacles remain in Course. */
export function AdventureScenery({
  course,
  detail,
}: {
  course: Course;
  detail: number;
}) {
  const count = detail === 0 ? 4 : detail === 1 ? 8 : 12,
    kind = course.ambience!,
    size = courseSize(course);
  const body = useRef<THREE.InstancedMesh>(null),
    cap = useRef<THREE.InstancedMesh>(null),
    lamp = useRef<THREE.Group>(null);
  const layout = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (i % 2 ? -1 : 1) * (size.width / 2 + 8 + (i % 3) * 2),
        z:
          -size.length / 2 +
          (size.length * (Math.floor(i / 2) + 0.5)) / (count / 2),
        height:
          kind === "glacier"
            ? 7 + (i % 3) * 2
            : kind === "lighthouse"
              ? 4 + (i % 3)
              : 5 + (i % 2) * 2,
        yaw: i * 2.4,
      })),
    [size.width, size.length, count, kind],
  );
  const { gl } = useThree();
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)"),
    [],
  );
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    layout.forEach((p, i) => {
      dummy.position.set(p.x, p.height / 2 - 1.3, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.set(
        kind === "glacier" ? 4 : 1.8,
        p.height,
        kind === "glacier" ? 4 : 1.8,
      );
      dummy.updateMatrix();
      body.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.y = p.height * 0.8 - 1.3;
      dummy.scale.set(
        kind === "glacier" ? 1.7 : 2.1,
        kind === "glacier" ? p.height * 0.32 : 0.35,
        kind === "glacier" ? 1.7 : 2.1,
      );
      dummy.updateMatrix();
      cap.current!.setMatrixAt(i, dummy.matrix);
    });
    for (const ref of [body, cap]) {
      ref.current!.instanceMatrix.needsUpdate = true;
      ref.current!.computeBoundingSphere();
    }
    gl.domElement.dataset.scenery = kind;
    gl.domElement.dataset.sceneryCount = String(count);
  }, [layout, kind, gl, count]);
  useFrame(({ clock }) => {
    if (lamp.current && detail > 0 && !reducedMotion.matches)
      lamp.current.rotation.y = clock.elapsedTime * 0.15;
  });
  return (
    <group>
      <instancedMesh
        key={`body-${count}-${kind}`}
        ref={body}
        args={[undefined, undefined, count]}
        castShadow={detail > 0}
      >
        {kind === "glacier" ? (
          <coneGeometry args={[1, 1, 7]} />
        ) : (
          <cylinderGeometry args={[0.8, 1, 1, 8]} />
        )}
        <meshStandardMaterial
          color={
            kind === "glacier"
              ? "#829da5"
              : kind === "lighthouse"
                ? "#8b9da1"
                : "#a78d6d"
          }
          roughness={0.95}
        />
      </instancedMesh>
      <instancedMesh
        key={`cap-${count}-${kind}`}
        ref={cap}
        args={[undefined, undefined, count]}
        castShadow={detail > 0}
      >
        {kind === "glacier" ? (
          <coneGeometry args={[1, 1, 7]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        <meshStandardMaterial
          color={
            kind === "glacier"
              ? "#e4edf0"
              : kind === "lighthouse"
                ? "#d3cba9"
                : "#cfb38b"
          }
          roughness={0.9}
        />
      </instancedMesh>
      {kind === "lighthouse" && (
        <group position={[size.width / 2 + 8, 0, 0]}>
          <mesh position={[0, 4.5, 0]} castShadow={detail > 0}>
            <cylinderGeometry args={[1.2, 1.7, 11, 12]} />
            <meshStandardMaterial color="#d9d0b4" roughness={0.8} />
          </mesh>
          <mesh position={[0, 10, 0]}>
            <cylinderGeometry args={[1.6, 1.6, 1.2, 12]} />
            <meshStandardMaterial
              color="#e9bb65"
              emissive="#e9bb65"
              emissiveIntensity={detail === 0 ? 0.2 : 0.7}
            />
          </mesh>
          <group ref={lamp} position={[0, 10, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} position={[4, 0, 0]}>
              <coneGeometry args={[1, 8, 12, 1, true]} />
              <meshBasicMaterial
                color="#f8e1a6"
                transparent
                opacity={detail === 0 ? 0 : 0.06}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
          <mesh position={[0, 11.3, 0]}>
            <coneGeometry args={[1.9, 1.4, 12]} />
            <meshStandardMaterial color="#667f88" />
          </mesh>
        </group>
      )}
    </group>
  );
}
