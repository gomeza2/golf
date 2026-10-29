let context: AudioContext | undefined;
export function tone(
  kind: "shot" | "cup" | "turn" | "bounce" | "splash",
  volume: number,
) {
  if (!volume) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const o = context.createOscillator(),
      g = context.createGain();
    o.connect(g);
    g.connect(context.destination);
    o.type = kind === "splash" ? "triangle" : "sine";
    o.frequency.setValueAtTime(
      kind === "cup"
        ? 740
        : kind === "shot"
          ? 180
          : kind === "bounce"
            ? 120
            : kind === "splash"
              ? 280
              : 440,
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
export function celebrateOutcome(
  kind: import("../shared/scoring").OutcomeKind,
  volume: number,
) {
  if (!volume) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const notes =
      kind === "ace"
        ? [523, 659, 784, 1047]
        : ["eagle", "albatross"].includes(kind)
          ? [523, 784, 1047]
          : kind === "birdie"
            ? [523, 659, 880]
            : kind === "par"
              ? [523, 659]
              : [392, 330];
    notes.forEach((frequency, i) => {
      const start = context!.currentTime + i * 0.085,
        osc = context!.createOscillator(),
        gain = context!.createGain();
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * 0.1, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    /* Sound is optional; scoring is independent of audio availability. */
  }
}
