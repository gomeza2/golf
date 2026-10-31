import { expect, it, vi } from "vitest";
import { DirectionalLight, WebGLRenderTarget } from "three";
import {
  AdaptiveQuality,
  renderProfile,
  isGraphicsMode,
  updateShadow,
} from "../src/graphics";
function frames(g: AdaptiveQuality, fps: number, seconds: number) {
  for (let i = 0; i < Math.ceil(fps * seconds); i++) g.sample(1 / fps);
}
it("accepts only the three quality preferences and bounds the actual pixel ratio", () => {
  for (const mode of ["auto", "low", "high"])
    expect(isGraphicsMode(mode)).toBe(true);
  for (const mode of ["ultra", "", null, 2, {}])
    expect(isGraphicsMode(mode)).toBe(false);
  expect(renderProfile("high", 2, 3).ratio).toBe(2);
  expect(renderProfile("high", 2, 1).ratio).toBe(1);
  expect(renderProfile("auto", 2, NaN).ratio).toBe(1);
  expect(renderProfile("low", 0, 3)).toMatchObject({
    ratio: 0.8,
    shadowSize: 0,
  });
});
it("updates the real shadow projection and frees an old target when changing resolution", () => {
  const light = new DirectionalLight(),
    old = new WebGLRenderTarget(1024, 1024);
  light.shadow.map = old;
  const disposed = vi.spyOn(old, "dispose");
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = -30;
  light.shadow.camera.right = 30;
  updateShadow(light);
  expect(light.shadow.camera.projectionMatrix.elements[0]).toBeCloseTo(1 / 30);
  expect(disposed).toHaveBeenCalledOnce();
  expect(light.shadow.map).toBeNull();
  const current = new WebGLRenderTarget(2048, 2048);
  light.shadow.map = current;
  const retained = vi.spyOn(current, "dispose");
  updateShadow(light);
  expect(retained).not.toHaveBeenCalled();
  expect(light.shadow.map).toBe(current);
  current.dispose();
});
it("reduces visual work after sustained slow frames with a cooldown between steps", () => {
  const g = new AdaptiveQuality();
  frames(g, 30, 5);
  expect(g.tier).toBe(2);
  frames(g, 30, 3);
  expect(g.tier).toBe(1);
  frames(g, 30, 4);
  expect(g.tier).toBe(1);
  frames(g, 30, 8);
  expect(g.tier).toBe(0);
  frames(g, 10, 60);
  expect(g.tier).toBe(0);
});
it("restores detail only after a longer stable interval and never exceeds the balanced tier", () => {
  const g = new AdaptiveQuality();
  frames(g, 30, 22);
  expect(g.tier).toBe(0);
  frames(g, 60, 4);
  expect(g.tier).toBe(0);
  frames(g, 60, 16);
  expect(g.tier).toBeGreaterThan(0);
  frames(g, 60, 60);
  expect(g.tier).toBe(2);
});
it("keeps neutral frame rates steady and does not react to isolated loading stalls", () => {
  const g = new AdaptiveQuality();
  frames(g, 48, 30);
  expect(g.tier).toBe(2);
  g.sample(0.3);
  frames(g, 60, 6);
  expect(g.tier).toBe(2);
  frames(g, 30, 2.2);
  frames(g, 48, 2.2);
  frames(g, 30, 2.2);
  expect(g.tier).toBe(2);
});
it("discards background gaps, resets the observation window and retains the current tier", () => {
  const g = new AdaptiveQuality();
  frames(g, 30, 8);
  expect(g.tier).toBe(1);
  for (const delta of [NaN, Infinity, -1, 0, 12])
    expect(g.sample(delta)).toBe(1);
  g.resetSampling();
  frames(g, 30, 5);
  expect(g.tier).toBe(1);
  frames(g, 30, 5);
  expect(g.tier).toBe(0);
});
it("gives all automatic tiers strictly smaller GPU buffers and shadow budgets as they step down", () => {
  const profiles = [0, 1, 2].map((tier) =>
    renderProfile("auto", tier as 0 | 1 | 2, 2),
  );
  expect(profiles[0].ratio ** 2 / profiles[2].ratio ** 2).toBeCloseTo(0.25);
  expect(profiles[0].shadowSize).toBe(0);
  expect(profiles[1].ratio).toBeLessThan(profiles[2].ratio);
  expect(profiles[1].shadowSize).toBeLessThan(profiles[2].shadowSize);
});
