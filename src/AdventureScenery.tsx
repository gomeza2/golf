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
  const accentCount = detail === 0 ? 4 : detail === 1 ? 8 : 12;
  const floraCount = detail === 0 ? 4 : detail === 1 ? 8 : 12;
  const body = useRef<THREE.InstancedMesh>(null),
    cap = useRef<THREE.InstancedMesh>(null),
    accent = useRef<THREE.InstancedMesh>(null),
    floraTrunk = useRef<THREE.InstancedMesh>(null),
    floraCrown = useRef<THREE.InstancedMesh>(null),
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
  const accentLayout = useMemo(
    () =>
      Array.from({ length: accentCount }, (_, i) => {
        const side = i % 2 ? -1 : 1;
        const lane = Math.floor(i / 2);
        return {
          x: side * (size.width / 2 + 13 + (i % 3) * 1.6),
          z:
            -size.length / 2 +
            (size.length * (lane + 0.5)) / (accentCount / 2),
          yaw: i * 1.73,
          scale: 0.82 + ((i * 5) % 4) * 0.16,
        };
      }),
    [size.width, size.length, accentCount],
  );
  const floraLayout = useMemo(
    () =>
      Array.from({ length: floraCount }, (_, i) => {
        const side = i % 2 ? -1 : 1;
        const lane = Math.floor(i / 2);
        return {
          x: side * (size.width / 2 + 2.8 + (lane % 3) * 1.2),
          z:
            -size.length / 2 +
            (size.length * (lane + 0.5)) / (floraCount / 2),
          yaw: i * 1.71,
          scale: 0.82 + ((i * 7) % 5) * 0.12,
        };
      }),
    [size.width, size.length, floraCount],
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
    const accentDummy = new THREE.Object3D();
    accentLayout.forEach((p, i) => {
      const forest = kind === "forest";
      const desert = kind === "desert";
      const mountain = kind === "mountain";
      accentDummy.position.set(
        p.x,
        forest ? 0.55 : desert ? 1.05 : mountain ? 1.7 : 0.75,
        p.z,
      );
      accentDummy.rotation.set(
        forest ? 0.12 : mountain ? -0.08 : 0,
        p.yaw,
        desert ? 0.04 : 0,
      );
      accentDummy.scale.set(
        (forest ? 1.45 : desert ? 1.25 : mountain ? 1.8 : 1.65) * p.scale,
        (forest ? 0.85 : desert ? 2.5 : mountain ? 3.8 : 1.05) * p.scale,
        (forest ? 1.5 : desert ? 1.25 : mountain ? 1.75 : 1.8) * p.scale,
      );
      accentDummy.updateMatrix();
      accent.current!.setMatrixAt(i, accentDummy.matrix);
    });
    for (const ref of [body, cap, accent]) {
      ref.current!.instanceMatrix.needsUpdate = true;
      ref.current!.computeBoundingSphere();
    }
    const floraDummy = new THREE.Object3D();
    const crownDummy = new THREE.Object3D();
    floraLayout.forEach((p, i) => {
      const forest = kind === "forest";
      const desert = kind === "desert";
      const coast = kind === "coast";
      const trunkHeight = forest ? 2.8 : desert ? 2.4 : coast ? 4.6 : 2.1;
      floraDummy.position.set(p.x, trunkHeight * p.scale / 2, p.z);
      floraDummy.rotation.set(0, p.yaw, coast ? -0.08 * (i % 3) : 0);
      floraDummy.scale.set(
        (coast ? 0.22 : desert ? 0.48 : forest ? 0.3 : 0.2) * p.scale,
        trunkHeight * p.scale,
        (coast ? 0.22 : desert ? 0.48 : forest ? 0.3 : 0.2) * p.scale,
      );
      floraDummy.updateMatrix();
      floraTrunk.current!.setMatrixAt(i, floraDummy.matrix);

      crownDummy.position.set(
        p.x,
        trunkHeight * p.scale + (forest ? 0.85 : coast ? 0.55 : 0.65),
        p.z,
      );
      crownDummy.rotation.set(
        coast ? 0.22 : 0,
        p.yaw,
        coast ? 0.18 : 0,
      );
      crownDummy.scale.set(
        (forest ? 1.55 : coast ? 1.75 : desert ? 0.92 : 1.15) * p.scale,
        (forest ? 1.35 : coast ? 0.62 : desert ? 1.25 : 2.05) * p.scale,
        (forest ? 1.55 : coast ? 1.75 : desert ? 0.92 : 1.15) * p.scale,
      );
      crownDummy.updateMatrix();
      floraCrown.current!.setMatrixAt(i, crownDummy.matrix);
    });
    for (const ref of [floraTrunk, floraCrown]) {
      ref.current!.instanceMatrix.needsUpdate = true;
      ref.current!.computeBoundingSphere();
    }
    gl.domElement.dataset.scenery = kind;
    gl.domElement.dataset.sceneryDetailCount = String(floraCount);
    gl.domElement.dataset.sceneryCount = String(count);
    gl.domElement.dataset.sceneryAccentCount = String(accentCount);
    gl.domElement.dataset.sceneryLandmark =
      kind === "forest"
        ? "ancient-pine"
        : kind === "desert"
          ? "canyon-arch"
          : kind === "coast"
            ? "lighthouse"
            : kind === "mountain"
              ? "snow-peaks"
              : "none";
  }, [layout, accentLayout, floraLayout, kind, gl, count, accentCount, floraCount]);
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
      <instancedMesh
        key={`accent-${accentCount}-${kind}`}
        ref={accent}
        args={[undefined, undefined, accentCount]}
        castShadow={detail > 1}
        receiveShadow
      >
        {kind === "desert" || kind === "mountain" ? (
          <coneGeometry args={[1, 1, kind === "mountain" ? 6 : 7]} />
        ) : (
          <icosahedronGeometry args={[1, 1]} />
        )}
        <meshStandardMaterial
          color={
            kind === "forest"
              ? "#416545"
              : kind === "desert"
                ? "#b48a5e"
                : kind === "coast"
                  ? "#8aa6a4"
                  : "#c4cfcb"
          }
          roughness={0.96}
        />
      </instancedMesh>
      <instancedMesh
        key={`flora-trunk-${floraCount}-${kind}`}
        ref={floraTrunk}
        args={[undefined, undefined, floraCount]}
        castShadow={detail > 0}
      >
        <cylinderGeometry args={[0.62, 0.78, 1, 7]} />
        <meshStandardMaterial
          color={
            kind === "forest"
              ? "#70563f"
              : kind === "desert"
                ? "#47764f"
                : kind === "coast"
                  ? "#8a694c"
                  : "#625f56"
          }
          roughness={0.96}
        />
      </instancedMesh>
      <instancedMesh
        key={`flora-crown-${floraCount}-${kind}`}
        ref={floraCrown}
        args={[undefined, undefined, floraCount]}
        castShadow={detail > 0}
      >
        {kind === "forest" ? (
          <icosahedronGeometry args={[1, 1]} />
        ) : kind === "desert" ? (
          <coneGeometry args={[1, 1, 7]} />
        ) : kind === "coast" ? (
          <dodecahedronGeometry args={[1, 1]} />
        ) : (
          <coneGeometry args={[1, 1, 7]} />
        )}
        <meshStandardMaterial
          color={
            kind === "forest"
              ? "#46764d"
              : kind === "desert"
                ? "#52834f"
                : kind === "coast"
                  ? "#6c9c8d"
                  : "#526d5c"
          }
          roughness={0.92}
        />
      </instancedMesh>
      {kind === "forest" && (
        <group position={[-size.width / 2 - 13, 0, -size.length / 2 - 13]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.72, 1.15, 7, 8]} />
            <meshStandardMaterial color="#725c43" roughness={0.98} />
          </mesh>
          {[0, 1, 2].map((tier) => (
            <mesh
              key={tier}
              position={[0, 8 + tier * 3.1, 0]}
              castShadow={detail > 0}
            >
              <coneGeometry
                args={[
                  6.2 - tier * 1.5,
                  7.2 - tier * 0.6,
                  detail === 0 ? 6 : 9,
                ]}
              />
              <meshStandardMaterial
                color={tier === 0 ? "#315f42" : tier === 1 ? "#3c7048" : "#4c8051"}
                roughness={0.95}
              />
            </mesh>
          ))}
        </group>
      )}
      {kind === "desert" && (
        <group position={[0, 0, -size.length / 2 - 17]}>
          {[-10, 10].map((x) => (
            <mesh key={x} position={[x, 6, 0]} castShadow>
              <cylinderGeometry args={[2.1, 2.9, 12, 7]} />
              <meshStandardMaterial color="#a8754b" roughness={1} />
            </mesh>
          ))}
          <mesh position={[0, 12, 0]} castShadow>
            <boxGeometry args={[24, 3, 3.6]} />
            <meshStandardMaterial color="#bf8955" roughness={0.98} />
          </mesh>
          <mesh position={[0, 14.1, 0]}>
            <boxGeometry args={[10, 1, 4]} />
            <meshStandardMaterial color="#d2a16c" roughness={0.96} />
          </mesh>
        </group>
      )}
      {kind === "mountain" && (
        <group position={[0, 0, -size.length / 2 - 19]}>
          <mesh position={[0, 11, 0]} castShadow>
            <coneGeometry args={[11, 23, detail === 0 ? 6 : 9]} />
            <meshStandardMaterial color="#69766f" roughness={1} />
          </mesh>
          <mesh position={[0, 20.2, 0]}>
            <coneGeometry args={[5.7, 7.8, detail === 0 ? 6 : 9]} />
            <meshStandardMaterial color="#e5ece8" roughness={0.96} />
          </mesh>
          {[-14, 14].map((x, index) => (
            <mesh
              key={x}
              position={[x, index ? 7 : 8.5, -2]}
              castShadow={detail > 0}
            >
              <coneGeometry args={[7.2, index ? 15 : 17, 7]} />
              <meshStandardMaterial color={index ? "#858e87" : "#78847e"} roughness={1} />
            </mesh>
          ))}
        </group>
      )}
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
