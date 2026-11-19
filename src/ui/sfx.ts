/**
 * 原創合成音效、上課鐘聲與背景音樂（Web Audio API 即時產生，無外部音檔、無授權問題）。
 * - 只在使用者手勢後建立 AudioContext，遵守瀏覽器自動播放限制。
 * - 上課鐘聲旋律為西敏寺鐘聲（1793 年，公有領域），以鐘聲音色合成。
 * - 背景音樂為本專案原創的音樂盒風格循環（C 大調 I–vi–IV–V），音量低、不搶話。
 * 任何錯誤都靜默略過，不阻擋學習流程。
 */
export type SfxName = "tap" | "pick" | "drop" | "invalid" | "success" | "complete" | "whoosh" | "hand" | "tick" | "page" | "open";

type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number };

const recipes: Record<SfxName, Note[]> = {
  tap: [{ f: 880, t: 0, d: 0.06, type: "sine", g: 0.35 }],
  pick: [
    { f: 520, t: 0, d: 0.07, type: "triangle", g: 0.35 },
    { f: 780, t: 0.05, d: 0.08, type: "triangle", g: 0.3 },
  ],
  drop: [
    { f: 660, t: 0, d: 0.08, type: "triangle", g: 0.35 },
    { f: 440, t: 0.06, d: 0.12, type: "sine", g: 0.3 },
  ],
  // 溫和的「再試試」：兩個低音，不刺耳
  invalid: [
    { f: 330, t: 0, d: 0.12, type: "sine", g: 0.3 },
    { f: 294, t: 0.1, d: 0.16, type: "sine", g: 0.28 },
  ],
  success: [
    { f: 660, t: 0, d: 0.1, type: "triangle", g: 0.32 },
    { f: 880, t: 0.08, d: 0.16, type: "triangle", g: 0.3 },
  ],
  complete: [
    { f: 523, t: 0, d: 0.14, type: "triangle", g: 0.3 },
    { f: 659, t: 0.12, d: 0.14, type: "triangle", g: 0.3 },
    { f: 784, t: 0.24, d: 0.14, type: "triangle", g: 0.3 },
    { f: 1047, t: 0.36, d: 0.32, type: "sine", g: 0.28 },
  ],
  whoosh: [{ f: 300, t: 0, d: 0.22, type: "sine", g: 0.12 }],
  hand: [{ f: 990, t: 0, d: 0.07, type: "sine", g: 0.25 }],
  tick: [{ f: 1320, t: 0, d: 0.03, type: "square", g: 0.08 }],
  page: [{ f: 1800, t: 0, d: 0.05, type: "triangle", g: 0.08 }],
  open: [
    { f: 440, t: 0, d: 0.06, type: "sine", g: 0.25 },
    { f: 660, t: 0.05, d: 0.09, type: "sine", g: 0.22 },
  ],
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class Audio {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private musicOn = true;
  private volume = 0.6;
  private musicGain: GainNode | null = null;
  private timer = 0;
  private nextTime = 0;
  private step = 0;
  private playing = false;
  private bpm = 88;

  /** 調整背景音樂速度（短片時較輕快） */
  setTempo(bpm: number) {
    this.bpm = bpm;
  }

  configure(enabled: boolean, volume: number, music = true) {
    this.enabled = enabled;
    this.volume = volume;
    this.musicOn = music;
    if (!enabled || !music || volume <= 0) this.stopMusic();
    else if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(this.musicLevel(), this.ctx.currentTime, 0.3);
  }

  private musicLevel() {
    return this.volume * 0.16;
  }

  private context() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  play(name: SfxName) {
    if (!this.enabled || this.volume <= 0) return;
    try {
      const ctx = this.context();
      if (!ctx) return;
      const now = ctx.currentTime;
      for (const n of recipes[name]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type ?? "sine";
        osc.frequency.setValueAtTime(n.f, now + n.t);
        if (name === "whoosh") osc.frequency.exponentialRampToValueAtTime(900, now + n.t + n.d);
        const peak = (n.g ?? 0.3) * this.volume * 0.5;
        gain.gain.setValueAtTime(0.0001, now + n.t);
        gain.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.02);
      }
    } catch {
      /* 音效失敗不影響操作 */
    }
  }

  /** 單一鐘聲音色：基頻＋非整數泛音，長衰減 */
  private bellNote(ctx: AudioContext, f: number, t: number, level: number) {
    const partials: [number, number][] = [
      [1, 1],
      [2, 0.45],
      [2.76, 0.28],
      [5.4, 0.12],
    ];
    for (const [ratio, amp] of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f * ratio;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level * amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / ratio + 0.4);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 2.8);
    }
  }

  /** 上課鐘聲（西敏寺鐘聲兩句），回傳長度（秒） */
  schoolBell() {
    if (!this.enabled || this.volume <= 0) return 0;
    try {
      const ctx = this.context();
      if (!ctx) return 0;
      // E4 C4 D4 G3 ｜ G3 D4 E4 C4
      const seq = [64, 60, 62, 55, 55, 62, 64, 60];
      const t0 = ctx.currentTime + 0.05;
      const gap = 0.62;
      const level = this.volume * 0.22;
      seq.forEach((n, i) => this.bellNote(ctx, midi(n), t0 + i * gap + (i >= 4 ? 0.35 : 0), level));
      // 鐘聲時把背景音樂壓低
      if (this.musicGain) {
        const end = t0 + seq.length * gap + 0.6;
        this.musicGain.gain.setTargetAtTime(this.musicLevel() * 0.15, ctx.currentTime, 0.1);
        this.musicGain.gain.setTargetAtTime(this.musicLevel(), end, 0.8);
      }
      return seq.length * gap + 1.2;
    } catch {
      return 0;
    }
  }

  /* ---------------- 背景音樂：原創音樂盒循環 ---------------- */
  // 每小節 8 個八分音符；0 表示休止
  private melody = [
    [72, 0, 76, 0, 79, 0, 76, 74], // C
    [72, 0, 0, 0, 67, 0, 69, 0], // C
    [69, 0, 72, 0, 76, 0, 74, 72], // Am
    [69, 0, 0, 0, 0, 0, 67, 0], // Am
    [65, 0, 69, 0, 72, 0, 74, 72], // F
    [69, 0, 0, 0, 72, 0, 74, 0], // F
    [74, 0, 71, 0, 67, 0, 69, 71], // G
    [72, 0, 0, 0, 0, 0, 0, 0], // G → C
  ];
  private chords = [
    [48, 55, 64],
    [48, 55, 64],
    [45, 52, 60],
    [45, 52, 60],
    [41, 48, 57],
    [41, 48, 57],
    [43, 50, 59],
    [43, 50, 59],
  ];

  startMusic() {
    if (this.playing || !this.enabled || !this.musicOn || this.volume <= 0) return;
    try {
      const ctx = this.context();
      if (!ctx) return;
      this.musicGain = ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(this.musicLevel(), ctx.currentTime, 1.2);
      this.musicGain.connect(ctx.destination);
      this.playing = true;
      this.step = 0;
      this.nextTime = ctx.currentTime + 0.2;
      const tick = () => {
        if (!this.ctx || !this.musicGain) return;
        const eighth = 60 / this.bpm / 2;
        while (this.nextTime < this.ctx.currentTime + 0.4) {
          const bar = Math.floor(this.step / 8) % this.melody.length;
          const pos = this.step % 8;
          const n = this.melody[bar][pos];
          if (n) this.musicBox(midi(n), this.nextTime);
          if (pos === 0) this.chords[bar].forEach((c, i) => this.pad(midi(c), this.nextTime, eighth * 8, i === 0 ? 0.5 : 0.28));
          if (pos === 4) this.pad(midi(this.chords[bar][0]), this.nextTime, eighth * 4, 0.35);
          this.nextTime += eighth;
          this.step++;
        }
      };
      tick();
      this.timer = window.setInterval(tick, 120);
    } catch {
      this.playing = false;
    }
  }

  private musicBox(f: number, t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    o2.type = "sine";
    o2.frequency.value = f * 4;
    const g2 = ctx.createGain();
    g2.gain.value = 0.08;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.musicGain!);
    o.start(t);
    o2.start(t);
    o.stop(t + 1);
    o2.stop(t + 1);
  }

  private pad(f: number, t: number, d: number, level: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level * 0.35, t + 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.musicGain!);
    o.start(t);
    o.stop(t + d + 0.05);
  }

  stopMusic() {
    if (!this.playing) return;
    this.playing = false;
    window.clearInterval(this.timer);
    const g = this.musicGain;
    const ctx = this.ctx;
    this.musicGain = null;
    if (g && ctx) {
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      window.setTimeout(() => g.disconnect(), 1500);
    }
  }
}

export const sfx = new Audio();
