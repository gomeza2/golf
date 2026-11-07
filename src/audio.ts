let context: AudioContext | undefined;
export function tone(
  kind: "shot" | "cup" | "turn" | "bounce" | "splash",
  volume: number,
) {
  if (!volume) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const now = context.currentTime;
    const o = context.createOscillator(),
      g = context.createGain();
    o.connect(g);
    g.connect(context.destination);
    o.type =
      kind === "shot" ? "triangle" : kind === "splash" ? "triangle" : "sine";
    const duration = kind === "shot" ? 0.095 : kind === "bounce" ? 0.07 : 0.24;
    const frequency =
      kind === "cup"
        ? 740
        : kind === "shot"
          ? 410
          : kind === "bounce"
            ? 210
            : kind === "splash"
              ? 280
              : 440;
    o.frequency.setValueAtTime(frequency, now);
    o.frequency.exponentialRampToValueAtTime(
      kind === "cup" ? 1200 : 65,
      now + duration,
    );
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(
      volume * (kind === "shot" ? 0.22 : 0.13),
      now + 0.003,
    );
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start(now);
    o.stop(now + duration + 0.02);
    if (kind === "shot" || kind === "splash") {
      // Short, filtered contact noise adds texture without external audio assets.
      const seconds = kind === "shot" ? 0.035 : 0.32;
      const buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * seconds),
        context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        contact = context.createGain();
      source.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value = kind === "shot" ? 1700 : 950;
      contact.gain.setValueAtTime(volume * 0.12, now);
      contact.gain.exponentialRampToValueAtTime(0.001, now + seconds);
      source.connect(filter);
      filter.connect(contact);
      contact.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        contact.disconnect();
      };
      source.start(now);
    }
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
