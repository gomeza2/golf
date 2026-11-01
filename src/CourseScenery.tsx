import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CircuitId, Course } from "../shared/courses";
import { sceneryLayout, sceneryTheme } from "./scenery";

export function CourseScenery({
  course,
  circuit,
  detail,
}: {
  course: Course;
  circuit: CircuitId;
  detail: number;
}) {
  const layout = useMemo(() => sceneryLayout(course, detail), [course, detail]);
  const trunks = useRef<THREE.InstancedMesh>(null),
    crowns = useRef<THREE.InstancedMesh>(null),
    bases = useRef<THREE.InstancedMesh>(null);
  const theme = sceneryTheme(circuit);
  const { gl } = useThree();
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    layout.forEach((p, i) => {
      const ruins = theme === "ruins";
      dummy.position.set(p.x, ruins ? 1.1 : 0.8, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.updateMatrix();
      trunks.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.y = ruins ? 2.6 : 2.9;
      dummy.scale.set(
        p.scale * (ruins ? 1.4 : 1.5),
        p.scale * (ruins ? 0.25 : 1.7),
        p.scale * (ruins ? 1.4 : 1.5),
      );
      dummy.updateMatrix();
      crowns.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.y = -0.8;
      dummy.scale.set(p.scale * 2, ruins ? 0.8 : 0.6, p.scale * 2);
      dummy.updateMatrix();
      bases.current!.setMatrixAt(i, dummy.matrix);
    });
    for (const ref of [trunks, crowns, bases]) {
      ref.current!.instanceMatrix.needsUpdate = true;
      ref.current!.computeBoundingSphere();
    }
    gl.domElement.dataset.scenery = theme;
    gl.domElement.dataset.sceneryCount = String(layout.length);
  }, [layout, theme, gl]);
  const ruins = theme === "ruins";
  return (
    <group>
      <instancedMesh
        key={`trunks-${layout.length}`}
        ref={trunks}
        args={[undefined, undefined, layout.length]}
        castShadow={detail > 0}
      >
        <cylinderGeometry
          args={ruins ? [0.42, 0.55, 3, 8] : [0.16, 0.28, 2.6, 6]}
        />
        <meshStandardMaterial
          color={ruins ? "#b5bda9" : "#71624e"}
          roughness={0.95}
        />
      </instancedMesh>
      <instancedMesh
        key={`crowns-${layout.length}`}
        ref={crowns}
        args={[undefined, undefined, layout.length]}
        castShadow={detail > 0}
      >
        {ruins ? (
          <boxGeometry args={[1, 1, 1]} />
        ) : (
          <icosahedronGeometry args={[1, 1]} />
        )}
        <meshStandardMaterial
          color={ruins ? "#d3cfb5" : theme === "lunar" ? "#417f82" : "#527b52"}
          roughness={0.95}
        />
      </instancedMesh>
      <instancedMesh
        key={`bases-${layout.length}`}
        ref={bases}
        args={[undefined, undefined, layout.length]}
        receiveShadow
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={ruins ? "#76857d" : "#52685c"}
          roughness={1}
        />
      </instancedMesh>
    </group>
  );
}

/** Cloth is visual; the existing centred shaft remains the physical obstacle. */
export function ClubFlag({
  color,
  animated,
}: {
  color: string;
  animated: boolean;
}) {
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(0.9, 0.55, 12, 3),
    [animated],
  );
  // Dispose owned resources when a course or rendering context unmounts.
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    if (!animated) return;
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) + 0.45) / 0.9;
      pos.setZ(
        i,
        animated
          ? Math.sin(clock.elapsedTime * 2.6 - u * 5 + pos.getY(i) * 2) *
              u *
              0.09
          : 0,
      );
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  return (
    <mesh position={[0.47, 2.1, 0]} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.85}
      />
    </mesh>
  );
}
