import { useEffect, useRef, useState } from "react";
export function useHoleIntro(key: string | null, enabled: boolean) {
  const seen = useRef<string | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!enabled || !key) {
      setActive(false);
      return;
    }
    if (seen.current === key) return;
    seen.current = key;
    setActive(true);
    timer.current = setTimeout(() => setActive(false), 2600);
    return () => clearTimeout(timer.current);
  }, [key, enabled]);
  return {
    active: Boolean(enabled && key && (active || seen.current !== key)),
    skip: () => {
      seen.current = key;
      clearTimeout(timer.current);
      setActive(false);
    },
  };
}
