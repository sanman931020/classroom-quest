/**
 * 原創合成音效（Web Audio API 即時產生，無外部音檔、無授權問題）。
 * 只在使用者手勢後建立 AudioContext，遵守瀏覽器自動播放限制。
 * 任何錯誤都靜默略過，不阻擋學習流程。
 */
export type SfxName =
  | "tap"
  | "pick"
  | "drop"
  | "invalid"
  | "success"
  | "complete"
  | "whoosh"
  | "hand"
  | "tick"
  | "page"
  | "open";

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

class Sfx {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.6;
  configure(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = volume;
  }
  play(name: SfxName) {
    if (!this.enabled || this.volume <= 0) return;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      const ctx = this.ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      for (const n of recipes[name]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type ?? "sine";
        osc.frequency.setValueAtTime(n.f, now + n.t);
        if (name === "whoosh")
          osc.frequency.exponentialRampToValueAtTime(900, now + n.t + n.d);
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
}
export const sfx = new Sfx();
