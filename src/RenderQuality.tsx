import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdaptiveQuality,
  type GraphicsMode,
  type QualityTier,
} from "./graphics";
export function RenderQuality({
  mode,
  visible,
  tier,
  onTier,
}: {
  mode: GraphicsMode;
  visible: boolean;
  tier: QualityTier;
  onTier: (tier: QualityTier) => void;
}) {
  const governor = useRef(new AdaptiveQuality());
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    governor.current.resetSampling();
  }, [mode, visible]);
  useEffect(() => {
    gl.domElement.dataset.renderMode = mode;
    gl.domElement.dataset.renderTier = String(tier);
    gl.domElement.dataset.renderLoop = visible ? "active" : "paused";
  }, [mode, visible, tier, gl]);
  useFrame((_, delta) => {
    if (mode !== "auto" || !visible) return;
    const next = governor.current.sample(delta);
    if (next !== tier) onTier(next);
  });
  return null;
}
