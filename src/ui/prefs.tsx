import { createContext, useContext, useEffect, useState } from "react";
import { sfx } from "./sfx";
import { narrator } from "../narration/narrator";
import { startZhuyinFix } from "./zhuyin";

/**
 * 介面偏好設定（音效、動態、低效能、教學提示）。
 * 與學習進度 Progress（classroom-quest-v1）分開保存，不改動 v1 schema。
 */
export type MotionPref = "auto" | "reduce" | "full";
export interface Prefs {
  sound: boolean;
  /** 背景音樂 */
  music: boolean;
  /** 朗讀（念出說明、對話與影響） */
  narrate: boolean;
  volume: number; // 0–1
  motion: MotionPref;
  lowPower: boolean;
  /** 場景模式：3D 或 2.5D 平面 */
  view: "3d" | "2d";
  /** 國字旁顯示注音（注音字型） */
  zhuyin: boolean;
  hints: boolean;
  seen: Record<string, boolean>;
}
const KEY = "classroom-quest-ui-v1";
const defaults: Prefs = {
  sound: true,
  music: true,
  narrate: true,
  volume: 0.6,
  motion: "auto",
  lowPower: false,
  view: "3d",
  zhuyin: true,
  hints: true,
  seen: {},
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      sound: typeof p.sound === "boolean" ? p.sound : defaults.sound,
      music: typeof p.music === "boolean" ? p.music : true,
      narrate: typeof p.narrate === "boolean" ? p.narrate : true,
      volume:
        typeof p.volume === "number" && p.volume >= 0 && p.volume <= 1
          ? p.volume
          : defaults.volume,
      motion: ["auto", "reduce", "full"].includes(p.motion as string)
        ? (p.motion as MotionPref)
        : "auto",
      lowPower: !!p.lowPower,
      view: p.view === "2d" ? "2d" : "3d",
      zhuyin: typeof p.zhuyin === "boolean" ? p.zhuyin : true,
      hints: typeof p.hints === "boolean" ? p.hints : true,
      seen: p.seen && typeof p.seen === "object" ? p.seen : {},
    };
  } catch {
    return { ...defaults };
  }
}

/** 目前是否應減少動態（考慮 auto 與系統偏好） */
export function reducedMotion(p: Prefs) {
  if (p.motion === "reduce") return true;
  if (p.motion === "full") return false;
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

type Ctx = {
  prefs: Prefs;
  setPrefs: (fn: (p: Prefs) => Prefs) => void;
  reduced: boolean;
};
const PrefsContext = createContext<Ctx>({
  prefs: defaults,
  setPrefs: () => {},
  reduced: false,
});

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, set] = useState(loadPrefs);
  const [systemReduce, setSystemReduce] = useState(
    () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setSystemReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* 偏好無法保存時仍可使用 */
    }
    const root = document.documentElement;
    root.dataset.motion = prefs.motion;
    root.dataset.lowpower = prefs.lowPower ? "on" : "off";
    root.dataset.zhuyin = prefs.zhuyin ? "on" : "off";
    sfx.configure(prefs.sound, prefs.volume, prefs.music);
    narrator.setEnabled(prefs.narrate);
  }, [prefs]);
  // 背景音樂：第一次觸控／點擊後才開始（瀏覽器自動播放限制）
  useEffect(() => {
    if (!prefs.sound || !prefs.music) return;
    const start = () => sfx.startMusic();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [prefs.sound, prefs.music]);
  // 注音模式：自動校正破音字讀音
  useEffect(() => {
    if (!prefs.zhuyin) return;
    return startZhuyinFix(document.body);
  }, [prefs.zhuyin]);
  const reduced =
    prefs.motion === "reduce" || (prefs.motion === "auto" && systemReduce);
  return (
    <PrefsContext.Provider value={{ prefs, setPrefs: set, reduced }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(PrefsContext);
}
