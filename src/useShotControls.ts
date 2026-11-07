import { useEffect, useRef, useState } from "react";
import {
  pullShot,
  pulseShot,
  shotReview,
  shotEventTime,
  type ShotReview,
  type ControlMode,
} from "./shotControls";
export type Shot = { angle: number; power: number };
export function useShotControls(options: {
  mode: ControlMode;
  canShoot: boolean;
  turnKey: string | null;
  angle: number;
  power: number;
  setAngle: (a: number) => void;
  setPower: (p: number) => void;
  fire: (shot?: Shot) => void;
}) {
  const latest = useRef(options);
  latest.current = options;
  const anchor = useRef<{
    x: number;
    y: number;
    angle: number;
    power: number;
    started: number;
    shot?: Shot;
    fine: boolean;
  } | null>(null);
  const [fine, setFine] = useState(false);
  const [review, setReview] = useState<ShotReview | null>(null);
  const [active, setActive] = useState(false),
    [pointer, setPointer] = useState<{
      x: number;
      y: number;
      ox: number;
      oy: number;
    } | null>(null);
  const frame = useRef(0);
  function cancel() {
    cancelAnimationFrame(frame.current);
    const saved = anchor.current;
    anchor.current = null;
    setActive(false);
    setPointer(null);
    if (saved) {
      latest.current.setAngle(saved.angle);
      latest.current.setPower(saved.power);
    }
  }
  function start(x = 0, y = 0, stamp?: number) {
    const o = latest.current;
    if (!o.canShoot || o.mode === "classic" || anchor.current) return;
    anchor.current = {
      x,
      y,
      angle: o.angle,
      power: o.power,
      started: shotEventTime(stamp, performance.now()),
      fine,
    };
    setReview(null);
    setActive(true);
    if (o.mode === "pull") {
      o.setPower(0.03);
      setPointer({ x, y, ox: x, oy: y });
    } else {
      let lastPaint = 0;
      const loop = (now: number) => {
        const a = anchor.current;
        if (!a) return;
        if (now - lastPaint > 30) {
          const shot = pulseShot(now - a.started, a.angle);
          latest.current.setAngle(shot.angle);
          latest.current.setPower(shot.power);
          lastPaint = now;
        }
        frame.current = requestAnimationFrame(loop);
      };
      frame.current = requestAnimationFrame(loop);
    }
  }
  function move(x: number, y: number) {
    const a = anchor.current,
      o = latest.current;
    if (!a || o.mode !== "pull" || !o.canShoot) return;
    const shot = pullShot(x - a.x, y - a.y, a.angle, a.fine);
    a.shot = shot.valid ? shot : undefined;
    if (shot.valid) o.setAngle(shot.angle);
    o.setPower(Math.max(0.03, shot.power));
    setPointer({ x, y, ox: a.x, oy: a.y });
  }
  function release(stamp?: number) {
    const a = anchor.current,
      o = latest.current;
    if (!a) return;
    const elapsed = Math.max(
      0,
      shotEventTime(stamp, performance.now()) - a.started,
    );
    const shot =
      o.mode === "pulse"
        ? elapsed >= 150
          ? pulseShot(elapsed, a.angle)
          : undefined
        : a.shot;
    cancelAnimationFrame(frame.current);
    anchor.current = null;
    setActive(false);
    setPointer(null);
    if (o.canShoot && shot) {
      setReview(shotReview(shot, { angle: a.angle, power: a.power }));
      o.setAngle(o.mode === "pulse" ? a.angle : shot.angle);
      o.setPower(o.mode === "pulse" ? a.power : shot.power);
      o.fire(shot);
    } else {
      o.setAngle(a.angle);
      o.setPower(a.power);
    }
  }
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => {
    cancelRef.current();
  }, [options.mode, options.turnKey, options.canShoot]);
  useEffect(() => {
    setReview(null);
    setFine(false);
  }, [options.mode, options.turnKey]);
  useEffect(() => {
    const abort = () => cancelRef.current();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") abort();
    };
    const pointerEnd = () => {
      // The button normally consumes release first. If capture was lost before
      // gotpointercapture, the release can land elsewhere: cancel that gesture.
      if (latest.current.mode === "pulse") cancelRef.current();
    };
    window.addEventListener("pointerup", pointerEnd);
    window.addEventListener("pointercancel", pointerEnd);
    window.addEventListener("lostpointercapture", pointerEnd);
    window.addEventListener("blur", abort);
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("pointerup", pointerEnd);
      window.removeEventListener("pointercancel", pointerEnd);
      window.removeEventListener("lostpointercapture", pointerEnd);
      window.removeEventListener("blur", abort);
      window.removeEventListener("keydown", key);
    };
  }, []);
  return {
    active,
    fine,
    toggleFine: () => {
      if (!anchor.current && latest.current.canShoot) {
        if (!fine)
          latest.current.setPower(Math.min(0.35, latest.current.power));
        setFine(!fine);
      }
    },
    armed: active && Boolean(anchor.current?.shot),
    review,
    pointer,
    targetPower: anchor.current?.power ?? options.power,
    cameraAngle: anchor.current?.angle ?? options.angle,
    start,
    move,
    release,
    cancel,
  };
}
