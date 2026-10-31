export type GraphicsMode = "auto" | "low" | "high";
export type QualityTier = 0 | 1 | 2;
export const graphicsModes = [
  {
    id: "auto" as const,
    name: "Automática",
    description:
      "Equilibra detalle y fluidez según cómo responde el dispositivo.",
  },
  {
    id: "low" as const,
    name: "Ahorro",
    description:
      "Menor resolución y luz sin sombras dinámicas. Para equipos que se calientan o van lentos.",
  },
  {
    id: "high" as const,
    name: "Alta",
    description:
      "Imagen más nítida y sombras de mayor definición. Exige más al dispositivo.",
  },
];
export const isGraphicsMode = (value: unknown): value is GraphicsMode =>
  graphicsModes.some((mode) => mode.id === value);
export function renderProfile(
  mode: GraphicsMode,
  tier: QualityTier,
  deviceRatio: number,
) {
  const native =
    Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const automatic = [
    { ratio: 0.8, shadowSize: 0, label: "prioridad a la fluidez" },
    { ratio: 1.2, shadowSize: 512, label: "detalle intermedio" },
    { ratio: 1.6, shadowSize: 1024, label: "detalle equilibrado" },
  ][tier];
  const selected =
    mode === "low"
      ? { ratio: 0.8, shadowSize: 0, label: "ahorro" }
      : mode === "high"
        ? { ratio: 2, shadowSize: 2048, label: "detalle alto" }
        : automatic;
  return { ...selected, ratio: Math.min(native, selected.ratio) };
}
export type RenderProfile = ReturnType<typeof renderProfile>;

export function updateShadow(light: DirectionalLight) {
  light.shadow.camera.updateProjectionMatrix();
  const { map, mapSize } = light.shadow;
  if (map && (map.width !== mapSize.x || map.height !== mapSize.y)) {
    map.dispose();
    light.shadow.map = null;
  }
}

/** Real frame intervals; never advances the physics clock or changes a shot. */
export class AdaptiveQuality {
  tier: QualityTier = 2;
  private warmup = 2;
  private elapsed = 0;
  private frames = 0;
  private slow = 0;
  private fast = 0;
  private cooldown = 0;
  resetSampling() {
    this.elapsed = this.frames = this.slow = this.fast = 0;
    this.warmup = 2;
  }
  sample(delta: number): QualityTier {
    if (!Number.isFinite(delta) || delta <= 0 || delta > 1) {
      this.resetSampling();
      return this.tier;
    }
    if (this.warmup > 0 || this.cooldown > 0) {
      this.warmup = Math.max(0, this.warmup - delta);
      this.cooldown = Math.max(0, this.cooldown - delta);
      return this.tier;
    }
    this.elapsed += delta;
    this.frames++;
    if (this.elapsed < 2) return this.tier;
    const fps = this.frames / this.elapsed;
    this.elapsed = this.frames = 0;
    this.slow = fps < 40 ? this.slow + 1 : 0;
    this.fast = fps > 56 ? this.fast + 1 : 0;
    if (this.slow >= 2 && this.tier > 0) {
      this.tier = (this.tier - 1) as QualityTier;
      this.cooldown = 6;
      this.slow = this.fast = 0;
    } else if (this.fast >= 4 && this.tier < 2) {
      this.tier = (this.tier + 1) as QualityTier;
      this.cooldown = 6;
      this.slow = this.fast = 0;
    }
    return this.tier;
  }
}
import type { DirectionalLight } from "three";
