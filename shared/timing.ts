// Fixed physics steps keep real-time turns stable when render/network timers jitter.
export class FixedStepper {
  previous: number | undefined;
  accumulated = 0;
  reset(now: number) {
    this.previous = now;
    this.accumulated = 0;
  }
  advance(now: number, step: () => void) {
    if (this.previous === undefined) {
      this.reset(now);
      return 0;
    }
    this.accumulated += Math.max(0, Math.min(250, now - this.previous)) / 1000;
    this.previous = now;
    let count = 0;
    while (this.accumulated + 1e-9 >= 1 / 60 && count < 15) {
      step();
      this.accumulated -= 1 / 60;
      count++;
    }
    return count;
  }
}
