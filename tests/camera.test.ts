import { it, expect } from "vitest";
import { followPose, turnAngle } from "../src/camera";
import { overviewFrame, overviewPose, overviewBounds } from "../src/camera";
import { uniqueCourses } from "../shared/courses";
import { PerspectiveCamera, Vector3 } from "three";
it("projects every hole's complete bounds inside the usable frame across portrait, desktop, landscape and inspection angles", () => {
  for (const c of uniqueCourses)
    for (const [w, h] of [
      [390, 844],
      [1280, 720],
      [844, 390],
    ])
      for (const yaw of [-0.8, 0, 0.8])
        for (const pitch of [-0.2, 0.3]) {
          const pose = overviewPose(c, w, h, { yaw, pitch, zoom: 1 }),
            frame = overviewFrame(w, h),
            bounds = overviewBounds(c);
          const camera = new PerspectiveCamera(43, w / h, 0.1, 1000);
          camera.position.set(
            pose.position.x,
            pose.position.y,
            pose.position.z,
          );
          camera.lookAt(
            new Vector3(pose.target.x, pose.target.y, pose.target.z),
          );
          camera.setViewOffset(w, h, frame.offsetX, frame.offsetY, w, h);
          camera.updateMatrixWorld();
          const left = (w - frame.width) / 2 - frame.offsetX,
            top = (h - frame.height) / 2 - frame.offsetY;
          for (const x of [-bounds.width / 2, bounds.width / 2])
            for (const y of [0, bounds.height])
              for (const z of [-bounds.length / 2, bounds.length / 2]) {
                const point = new Vector3(x, y, z).project(camera),
                  px = ((point.x + 1) * w) / 2,
                  py = ((1 - point.y) * h) / 2;
                expect(px).toBeGreaterThanOrEqual(left - 0.01);
                expect(px).toBeLessThanOrEqual(left + frame.width + 0.01);
                expect(py).toBeGreaterThanOrEqual(top - 0.01);
                expect(py).toBeLessThanOrEqual(top + frame.height + 0.01);
                expect(point.z).toBeLessThan(1);
              }
        }
});
it("moves the complete follow view with the active ball rather than following a fraction of its position", () => {
  const a = followPose({ x: 0, y: 0.22, z: 9 }, 0, 1.7),
    b = followPose({ x: 4, y: 2.62, z: -8 }, 0, 1.7);
  expect(b.position.x - a.position.x).toBe(4);
  expect(b.position.y - a.position.y).toBeCloseTo(2.4);
  expect(b.position.z - a.position.z).toBe(-17);
  expect(b.target.z - a.target.z).toBe(-17);
});
it("stays behind the shot direction and above the ball in portrait and landscape", () => {
  for (const aspect of [0.46, 1.8])
    for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const ball = { x: 3, y: 2.62, z: -8 },
        pose = followPose(ball, heading, aspect),
        dx = Math.sin(heading),
        dz = -Math.cos(heading);
      expect(
        (pose.position.x - ball.x) * dx + (pose.position.z - ball.z) * dz,
      ).toBeLessThan(0);
      expect(
        (pose.target.x - ball.x) * dx + (pose.target.z - ball.z) * dz,
      ).toBeGreaterThan(0);
      expect(pose.position.y - ball.y).toBeGreaterThan(6);
    }
});
it("crosses the -180/180 boundary without spinning a full revolution", () => {
  const a = Math.PI - 0.02,
    b = -Math.PI + 0.02;
  const next = turnAngle(a, b, 0.5);
  expect(Math.abs(next - a)).toBeCloseTo(0.02);
  expect(turnAngle(0, 1, 10)).toBe(1);
});
it("inspection orbits the ball while keeping its target and a safe height", async () => {
  const { changeLook, defaultLook } = await import("../src/camera");
  const ball = { x: 3, y: 0.22, z: 1 };
  const look = changeLook(defaultLook, { yaw: 0.7, pitch: 0.3, zoom: -0.1 });
  const pose = followPose(ball, 0, 0.46, look);
  expect(pose.position.x).toBeLessThan(ball.x);
  expect(pose.position.y).toBeGreaterThan(ball.y + 6);
  expect(
    Math.hypot(pose.target.x - ball.x, pose.target.z - ball.z),
  ).toBeLessThan(0.4);
});
it("inspection limits pitch and zoom and wraps horizontal rotation", async () => {
  const { changeLook, defaultLook } = await import("../src/camera");
  expect(changeLook(defaultLook, { pitch: 100, zoom: -100 })).toMatchObject({
    pitch: 0.55,
    zoom: 0.75,
  });
  expect(changeLook(defaultLook, { pitch: -100, zoom: 100 })).toMatchObject({
    pitch: -0.22,
    zoom: 1.65,
  });
  expect(
    Math.abs(changeLook(defaultLook, { yaw: 100 }).yaw),
  ).toBeLessThanOrEqual(Math.PI);
});
