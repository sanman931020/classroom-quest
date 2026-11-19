import { paletteOf, type Look } from "../art/Character";

/**
 * 短片人聲：使用裝置內建的臺灣華語（zh-TW）語音，依角色分配聲音與音高。
 * Windows：Microsoft Hanhan／Yating（女）、Zhiwei（男）；iPad：Mei-Jia 等。
 * 沒有 zh-TW 語音時退回任何中文語音；完全不支援時只顯示字幕。
 */
type Part = "teacher" | "girl" | "boy" | "narrator";

let cache: SpeechSynthesisVoice[] = [];
function voices() {
  if (!("speechSynthesis" in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) cache = v;
  return cache;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => voices();
}

const FEMALE = /hanhan|yating|mei-?jia|hsiaochen|hsiaoyu|female|女/i;
const MALE = /zhiwei|yunjhe|male|男/i;

function pick(pref: RegExp, avoid?: RegExp) {
  const all = voices();
  const tw = all.filter((v) => /zh[-_]TW|cmn[-_]Hant[-_]TW/i.test(v.lang));
  const zh = tw.length ? tw : all.filter((v) => /^zh|cmn/i.test(v.lang));
  return zh.find((v) => pref.test(v.name)) ?? zh.find((v) => !avoid || !avoid.test(v.name)) ?? zh[0] ?? null;
}

export function partOf(look: Look | undefined, who: string): Part {
  if (!look) return who === "林老師" ? "teacher" : "narrator";
  if (look === "teacher") return "teacher";
  return paletteOf(look).girl ? "girl" : "boy";
}

export function hasVoice() {
  return "speechSynthesis" in window && voices().some((v) => /^zh|cmn/i.test(v.lang));
}

/** 朗讀一句台詞；回傳估計長度（秒），結束時呼叫 onEnd */
export function speakLine(text: string, part: Part, onEnd: () => void) {
  const clean = text.replace(/（.*?）/g, "").replace(/[\u{E01E0}-\u{E01EF}]/gu, "");
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "zh-TW";
    const cfg: Record<Part, { v: SpeechSynthesisVoice | null; pitch: number; rate: number }> = {
      teacher: { v: pick(/yating|mei-?jia|hsiaochen/i, MALE), pitch: 1.0, rate: 0.98 },
      narrator: { v: pick(/yating|hanhan|mei-?jia|hsiaoyu/i, MALE), pitch: 1.12, rate: 1.06 },
      girl: { v: pick(/hanhan|mei-?jia|hsiaoyu/i, MALE), pitch: 1.4, rate: 1.08 },
      boy: { v: pick(MALE, FEMALE), pitch: 1.45, rate: 1.1 },
    };
    const c = cfg[part];
    if (c.v) u.voice = c.v;
    u.pitch = c.pitch;
    u.rate = c.rate;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onEnd();
    };
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
    // 某些瀏覽器不觸發 onend：以字數估計時間保底
    const est = clean.length * 0.27 + 1.2;
    window.setTimeout(finish, est * 1000);
    return est;
  } catch {
    onEnd();
    return 0;
  }
}

export function stopVoice() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* 無需處理 */
  }
}
