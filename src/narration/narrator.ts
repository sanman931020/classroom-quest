import { useEffect } from "react";
import { sfx } from "../ui/sfx";
import { speakLine } from "../shorts/voice";
import { lineKey, spoken, type NarrLine } from "./lines";

/**
 * 遊戲朗讀：開場說明、選主題與角色、做決定、看影響都會念出來。
 * - 優先播放預錄的臺灣口音音檔（BreezyVoice，public/voice/game）。
 * - 找不到音檔時改用裝置的 zh-TW 語音，並記錄在 window.__narration（產生音檔用）。
 * - 依序播放；學生點按鈕時，正在念的句子會停下，改念新的內容。
 * - 「聲音關」或「朗讀關」時不念；念的時候背景音樂自動變小聲。
 */
type Item = NarrLine & { key: string };
export type SayOpts = { replace?: boolean; force?: boolean };

let manifest: Record<string, number> | null = null;
let loading: Promise<void> | null = null;
function loadManifest() {
  if (!loading)
    loading = fetch("./voice/game/manifest.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((m: Record<string, number>) => {
        manifest = m;
      })
      .catch(() => {
        manifest = {};
      });
  return loading;
}

const FALLBACK = { host: "boy", teacher: "teacher", narrator: "narrator", chorus: "narrator", anan: "girl", mi: "girl", girl: "girl", hao: "boy", zhe: "boy", yu: "boy", boy: "boy" } as const;

let enabled = true;
/** 開場說明顯示時，只念說明（其他畫面的朗讀先不念） */
let locked = 0;
let names = { me: "", cls: "" };
/** 朗讀時把學生的名字念成「你」、班級念成「我們班」（音檔可共用） */
function personal(text: string) {
  let t = text;
  if (names.me && !/^(安安|小米|浩浩|阿哲|小宇|小芸)$/.test(names.me)) t = t.split(names.me).join("你");
  if (names.cls) t = t.split(names.cls).join("我們班");
  return t.replace(/你（(主席|司儀|記錄|學生)）/g, "$1").replace(/^你，/, "");
}
let queue: Item[] = [];
let current: HTMLAudioElement | null = null;
let busy = false;
let gen = 0;
const heard = new Map<string, NarrLine>();
declare global {
  interface Window {
    __narration?: Record<string, NarrLine>;
  }
}

/** 記下要念的每一句（測試用來檢查都有音檔） */
function record(it: Item) {
  heard.set(it.key, { part: it.part, text: spoken(it.text) });
  if (typeof window !== "undefined") {
    window.__narration ??= {};
    window.__narration[it.key] = { part: it.part, text: spoken(it.text) };
  }
}

function canSpeak() {
  if (!enabled || !sfx.on || sfx.level <= 0) return false;
  // 瀏覽器規定：使用者互動前不能自動播放聲音
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return !ua || ua.hasBeenActive;
}

function finishAll() {
  busy = false;
  sfx.duck(false);
}

async function pump(myGen: number) {
  if (busy) return;
  const it = queue.shift();
  if (!it) {
    finishAll();
    return;
  }
  busy = true;
  sfx.duck(true);
  await loadManifest();
  if (myGen !== gen) return;
  const done = () => {
    if (myGen !== gen) return;
    busy = false;
    window.setTimeout(() => {
      if (myGen === gen) void pump(myGen);
    }, 160);
  };
  const has = !!manifest?.[it.key];
  if (!has) {
    speakLine(spoken(it.text), FALLBACK[it.part], done);
    return;
  }
  const a = new Audio(`./voice/game/${it.key}.mp3`);
  current = a;
  a.volume = Math.min(1, sfx.level + 0.3);
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    done();
  };
  a.onended = end;
  a.onerror = end;
  a.play().catch(end);
  window.setTimeout(end, ((manifest?.[it.key] ?? 8) + 2) * 1000);
}

export const narrator = {
  /** 接在目前句子後面念；replace＝先停下目前的；force＝開場說明專用 */
  say(lines: NarrLine[] | NarrLine, opts: SayOpts = {}) {
    const list = (Array.isArray(lines) ? lines : [lines]).filter((l) => spoken(l.text));
    if (!list.length || !canSpeak() || (locked && !opts.force)) return;
    if (opts.replace) narrator.stop();
    const items = list.map((l) => {
      const p = { part: l.part, text: personal(l.text) };
      return { ...p, key: lineKey(p) };
    });
    items.forEach(record);
    queue.push(...items);
    void pump(gen);
  },
  /** 停止並清空 */
  stop() {
    gen++;
    queue = [];
    if (current) {
      current.onended = null;
      current.onerror = null;
      current.pause();
      current = null;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* 無需處理 */
    }
    finishAll();
  },
  lock(on: boolean) {
    locked = Math.max(0, locked + (on ? 1 : -1));
  },
  setNames(me: string, cls: string) {
    names = { me: me.trim(), cls: cls.trim() };
  },
  setEnabled(on: boolean) {
    enabled = on;
    if (!on) narrator.stop();
  },
  /** 目前聽過的句子（測試與產生音檔用） */
  heard: () => [...heard.values()],
};

/** 畫面上的一段內容出現（或改變）時念出來；key 相同不重念 */
export function useSay(lines: NarrLine[] | null | undefined | false, key: string, delay = 0, opts?: SayOpts) {
  useEffect(() => {
    if (!lines || !lines.length) return;
    const t = window.setTimeout(() => narrator.say(lines, opts), delay);
    return () => window.clearTimeout(t);
    // 只在 key 改變時念（同一段內容重繪不重念）
  }, [key]);
}

/** 點任何按鈕：停下舊的朗讀，接著念新的內容 */
export function installNarrationInterrupt() {
  const onDown = (e: PointerEvent | KeyboardEvent) => {
    if (e instanceof KeyboardEvent && e.key !== "Enter" && e.key !== " ") return;
    const t = e.target as HTMLElement | null;
    if (t?.closest("button, [role=button], a")) narrator.stop();
  };
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("keydown", onDown, true);
  return () => {
    window.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("keydown", onDown, true);
  };
}
