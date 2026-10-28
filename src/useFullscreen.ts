import { useEffect, useState } from "react";
export function useFullscreen(onError: (message: string) => void) {
  const [fullscreen, setFullscreen] = useState(
    Boolean(document.fullscreenElement),
  );
  const supported = Boolean(document.documentElement.requestFullscreen);
  useEffect(() => {
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      onError(
        "El navegador no permitió la pantalla completa. Puedes seguir jugando en esta vista.",
      );
    }
  }
  return { fullscreen, supported, toggle };
}
