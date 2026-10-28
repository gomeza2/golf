let context: AudioContext | undefined;
export function tone(kind: "shot" | "cup" | "turn", volume: number) {
  if (!volume) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const o = context.createOscillator(),
      g = context.createGain();
    o.connect(g);
    g.connect(context.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(
      kind === "cup" ? 740 : kind === "shot" ? 180 : 440,
      context.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(
      kind === "cup" ? 1200 : 80,
      context.currentTime + 0.16,
    );
    g.gain.setValueAtTime(volume * 0.15, context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.24);
    o.start();
    o.stop(context.currentTime + 0.25);
  } catch {
    /* Audio is optional on browsers without Web Audio. */
  }
}
