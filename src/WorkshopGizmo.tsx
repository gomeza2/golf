import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import type { WorkshopDocument } from "../shared/workshop";
import {
  selectionPivot,
  transformWorkshop3D,
} from "../shared/workshopTransform3D";
export function Manipulator({
  doc,
  ids,
  mode,
  step,
  orbit,
  drag,
  onPreview,
  onCommit,
  onError,
  onTransforming,
}: {
  doc: WorkshopDocument;
  ids: string[];
  mode: "translate" | "rotate" | "scale";
  step: number;
  orbit: MutableRefObject<OrbitControls | null>;
  drag: MutableRefObject<boolean>;
  onPreview: (doc: WorkshopDocument | null) => void;
  onCommit: (doc: WorkshopDocument) => void;
  onError: (message: string) => void;
  onTransforming: (active: boolean) => void;
}) {
  const { camera, gl, scene, invalidate } = useThree();
  const latest = useRef({
    doc,
    ids,
    step,
    onPreview,
    onCommit,
    onError,
    onTransforming,
  });
  latest.current = {
    doc,
    ids,
    step,
    onPreview,
    onCommit,
    onError,
    onTransforming,
  };
  const object = useMemo(() => new THREE.Object3D(), []),
    controls = useRef<TransformControls | null>(null),
    initial = useRef<WorkshopDocument | null>(null),
    proposed = useRef<WorkshopDocument | null>(null);
  useEffect(() => {
    const c = new TransformControls(camera, gl.domElement);
    controls.current = c;
    c.setSize(0.85);
    c.attach(object);
    scene.add(object);
    const helper = c.getHelper();
    scene.add(helper);
    const begin = () => {
      initial.current = latest.current.doc;
      proposed.current = null;
      drag.current = true;
      latest.current.onTransforming(true);
      if (orbit.current) orbit.current.enabled = false;
    };
    const move = () => {
      if (!drag.current || !initial.current) return;
      const value = latest.current,
        pivot = selectionPivot(initial.current, value.ids);
      try {
        const next = transformWorkshop3D(
          initial.current,
          value.ids,
          {
            x: object.position.x - pivot.x,
            y: object.position.y - pivot.y,
            z: object.position.z - pivot.z,
            yaw: (object.rotation.y * 180) / Math.PI,
            scaleX: object.scale.x,
            scaleZ: object.scale.z,
          },
          value.step,
        );
        proposed.current = next;
        if (c.mode === "translate") {
          const pivot = selectionPivot(next, value.ids);
          object.position.set(pivot.x, pivot.y, pivot.z);
        }
        value.onPreview(next);
      } catch (e) {
        proposed.current = null;
        value.onPreview(null);
        value.onError((e as Error).message);
      }
      invalidate();
    };
    const finish = () => {
      if (!drag.current) return;
      drag.current = false;
      latest.current.onTransforming(false);
      if (orbit.current) orbit.current.enabled = true;
      const result = proposed.current ?? initial.current ?? latest.current.doc;
      const pivot = selectionPivot(result, latest.current.ids);
      object.position.set(pivot.x, pivot.y, pivot.z);
      object.rotation.set(0, 0, 0);
      object.scale.set(1, 1, 1);
      if (proposed.current) latest.current.onCommit(proposed.current);
      latest.current.onPreview(null);
      initial.current = null;
      proposed.current = null;
      invalidate();
    };
    const cancel = () => {
      if (!drag.current) return;
      drag.current = false;
      latest.current.onTransforming(false);
      c.dragging = false;
      c.axis = null;
      initial.current = null;
      proposed.current = null;
      latest.current.onPreview(null);
      const p = selectionPivot(latest.current.doc, latest.current.ids);
      object.position.set(p.x, p.y, p.z);
      object.rotation.set(0, 0, 0);
      object.scale.set(1, 1, 1);
      if (orbit.current) orbit.current.enabled = true;
      invalidate();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
      if (["Alt", "Shift", "Control", "Meta"].includes(e.key))
        c.enabled = false;
    };
    const keyUp = (e: KeyboardEvent) => {
      if (["Alt", "Shift", "Control", "Meta"].includes(e.key)) c.enabled = true;
    };
    c.addEventListener("mouseDown", begin);
    c.addEventListener("objectChange", move);
    c.addEventListener("mouseUp", finish);
    c.addEventListener("change", () => invalidate());
    gl.domElement.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", keyUp);
    gl.domElement.addEventListener("lostpointercapture", cancel);
    return () => {
      cancel();
      c.detach();
      scene.remove(helper, object);
      c.dispose();
      controls.current = null;
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", keyUp);
      gl.domElement.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("blur", cancel);
      gl.domElement.removeEventListener("pointercancel", cancel);
    };
  }, [camera, gl, scene, object, invalidate]);
  useEffect(() => {
    const c = controls.current;
    if (!c || drag.current) return;
    const p = selectionPivot(doc, ids);
    object.position.set(p.x, p.y, p.z);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    c.setMode(mode);
    // The shared transform snaps deltas once, preserving fractional group offsets.
    c.setTranslationSnap(null);
    c.setRotationSnap(
      doc.pieces.some(
        (p) =>
          ids.includes(p.id) &&
          ["floor", "water", "sand", "rough", "dirt"].includes(p.kind),
      )
        ? Math.PI / 2
        : Math.PI / 36,
    );
    c.showX = mode !== "rotate";
    c.showY = mode !== "scale";
    c.showZ = mode !== "rotate";
    invalidate();
  }, [doc, ids.join(","), mode, step]);
  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    // Read-only projections allow browser tests to use actual rendered handles.
    const points: Record<string, { x: number; y: number }> = {};
    const helper = c.getHelper() as THREE.Object3D & {
      children: THREE.Object3D[];
    };
    const gizmo = helper.children.find(
      (x) => x.type === "TransformControlsGizmo",
    ) as any;
    for (const mesh of gizmo?.picker?.[mode]?.children ?? []) {
      if (!["X", "Y", "Z"].includes(mesh.name) || !mesh.visible) continue;
      const box = new THREE.Box3().setFromObject(mesh),
        world = box.getCenter(new THREE.Vector3()).project(camera);
      if (world.z >= -1 && world.z <= 1)
        points[mesh.name] = {
          x: ((world.x + 1) * gl.domElement.clientWidth) / 2,
          y: ((1 - world.y) * gl.domElement.clientHeight) / 2,
        };
    }
    gl.domElement.dataset.editorHandles = JSON.stringify(points);
    gl.domElement.dataset.editorPivot = JSON.stringify(
      object.position.toArray(),
    );
  });
  return null;
}
