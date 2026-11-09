import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { courseSize, type Course } from "../shared/courses";

/** Instanced landmarks sit outside the recoverable play area. */
export function AdventureScenery({
  course,
  detail,
}: {
  course: Course;
  detail: number;
}) {
  const kind = course.ambience!;
  const size = courseSize(course);
  const count =
    kind === "forest"
      ? detail === 0
        ? 8
        : detail === 1
          ? 14
          : 22
      : detail === 0
        ? 4
        : detail === 1
          ? 8
          : 12;
  const body = useRef<THREE.InstancedMesh>(null),
    cap = useRef<THREE.InstancedMesh>(null),
    lamp = useRef<THREE.Group>(null);
  const layout = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const side = i % 2 ? -1 : 1;
        const spread = kind === "forest" ? 1.2 : kind === "mountain" ? 2.4 : 1.8;
        return {
          x: side * (size.width / 2 + 7 + (i % 3) * spread),
          z:
            -size.length / 2 +
            (size.length * (Math.floor(i / 2) + 0.5)) / (count / 2),
          height:
            kind === "glacier"
              ? 7 + (i % 3) * 2
              : kind === "lighthouse" || kind === "coast"
                ? 5 + (i % 3) * 2
                : kind === "forest"
                  ? 8 + (i % 4) * 2
                  : kind === "desert"
                    ? 5 + (i % 3) * 2
                    : 7 + (i % 4) * 2,
          yaw: i * 2.39996,
          scale: 0.82 + ((i * 7) % 5) * 0.13,
        };
      }),
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
      const forest = kind === "forest";
      const broadRock = kind === "desert" || kind === "mountain";
      dummy.position.set(p.x, p.height / 2 - 1.3, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.set(
        forest ? 0.9 * p.scale : broadRock ? 3.2 * p.scale : 1.8 * p.scale,
        p.height * p.scale,
        forest ? 0.9 * p.scale : broadRock ? 3.2 * p.scale : 1.8 * p.scale,
      );
      dummy.updateMatrix();
      body.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.y =
        kind === "forest"
          ? p.height * 0.86 - 1.3
          : kind === "desert"
            ? p.height * 0.55 - 1.3
            : p.height * 0.8 - 1.3;
      dummy.scale.set(
        kind === "forest" ? 2.8 * p.scale : kind === "desert" ? 2.5 * p.scale : 2.1 * p.scale,
        kind === "forest"
          ? 2.7 * p.scale
          : kind === "desert"
            ? 1.3 * p.scale
            : kind === "mountain"
              ? 2.2 * p.scale
              : 0.35 * p.scale,
        kind === "forest" ? 2.8 * p.scale : kind === "desert" ? 2.5 * p.scale : 2.1 * p.scale,
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

  const beacon = kind === "lighthouse" || kind === "coast";
  return (
    <group>
      <instancedMesh
        key={`body-${count}-${kind}`}
        ref={body}
        args={[undefined, undefined, count]}
        castShadow={detail > 0}
      >
        {kind === "forest" || kind === "coast" || kind === "aqueduct" || kind === "lighthouse" ? (
          <cylinderGeometry args={kind === "forest" ? [0.18, 0.34, 1, 7] : [0.8, 1, 1, 8]} />
        ) : kind === "desert" ? (
          <icosahedronGeometry args={[1, 1]} />
        ) : (
          <coneGeometry args={[1, 1, 7]} />
        )}
        <meshStandardMaterial
          color={
            kind === "forest"
              ? "#76624a"
              : kind === "desert"
                ? "#a67b4e"
                : kind === "coast"
                  ? "#738e8b"
                  : kind === "mountain"
                    ? "#747b73"
                    : kind === "glacier"
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
        {kind === "forest" ? (
          <icosahedronGeometry args={[1, 1]} />
        ) : kind === "desert" ? (
          <coneGeometry args={[1, 1, 7]} />
        ) : kind === "coast" ? (
          <cylinderGeometry args={[1.2, 1.5, 1, 10]} />
        ) : kind === "mountain" ? (
          <icosahedronGeometry args={[1, 1]} />
        ) : kind === "glacier" ? (
          <coneGeometry args={[1, 1, 7]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        <meshStandardMaterial
          color={
            kind === "forest"
              ? "#47764b"
              : kind === "desert"
                ? "#c39a63"
                : kind === "coast"
                  ? "#b8b2a1"
                  : kind === "mountain"
                    ? "#a4a79a"
                    : kind === "glacier"
                      ? "#e4edf0"
                      : kind === "lighthouse"
                        ? "#d3cba9"
                        : "#cfb38b"
          }
          roughness={0.9}
        />
      </instancedMesh>
      {beacon && (
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
