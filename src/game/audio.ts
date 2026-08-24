let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let enabled = true;

function bus(): { ctx: AudioContext; sfx: GainNode } | null {
  if (!enabled || typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    master.gain.value = 0.85;
    sfx.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, sfx: sfx! };
}

export function unlockAudio(): void {
  bus();
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.85 : 0, ctx?.currentTime ?? 0, 0.02);
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.07, slide = 0) {
  const b = bus();
  if (!b) return;
  const { ctx: c, sfx: s } = b;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(s);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export function sfxPick() {
  const jitter = 1 + (Math.random() * 0.12 - 0.06);
  tone(620 * jitter, 0.07, "triangle", 0.05);
  tone(930 * jitter, 0.05, "sine", 0.03);
}

export function sfxBlocked() {
  tone(180, 0.12, "square", 0.04, -40);
}

export function sfxMatch(combo = 1) {
  const base = 520 + Math.min(combo, 6) * 40;
  tone(base, 0.12, "triangle", 0.06);
  tone(base * 1.26, 0.16, "sine", 0.05);
  tone(base * 1.5, 0.2, "sine", 0.03);
}

export function sfxWin() {
  [523, 659, 784, 1046].forEach((f, i) => {
    window.setTimeout(() => tone(f, 0.22, "triangle", 0.06), i * 90);
  });
}

export function sfxLose() {
  tone(240, 0.18, "sawtooth", 0.04, -80);
  window.setTimeout(() => tone(160, 0.28, "triangle", 0.05, -40), 90);
}

export function sfxUi() {
  tone(480, 0.05, "sine", 0.03);
}

export function sfxShuffle() {
  tone(300, 0.08, "triangle", 0.04, 120);
  window.setTimeout(() => tone(420, 0.08, "triangle", 0.04, 80), 70);
}
