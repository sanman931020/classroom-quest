import { paletteOf, type Look } from "../art/Character";

/**
 * 短片人聲：每句台詞一個音檔 public/voice/shorts/<id>.mp3。
 * 人聲以 BreezyVoice（MediaTek Research，Apache-2.0，臺灣華語）本機產生（scripts/gen_voices_breezy.py）：
 *   以臺灣女聲為基準，林老師原聲；旁白、安安、小米、浩浩、阿哲、小宇、大家各用不同升調與語速。
 * 之後若有真人錄音，用相同檔名覆蓋即可。
 */
/** host：念標題的男聲 */
export type VoicePart = "host" | "teacher" | "narrator" | "anan" | "mi" | "hao" | "zhe" | "yu" | "chorus" | "girl" | "boy";

export const lineId = (shortId: string, scene: number, cap: number) => `${shortId}-${scene + 1}-${cap + 1}`;

export function voicePart(look: Look | undefined, who: string): VoicePart {
  if (look === "teacher" || who === "林老師") return "teacher";
  if (!look) return who === "大家" ? "chorus" : "narrator";
  if (look === "anan" || look === "mi" || look === "hao" || look === "zhe") return look;
  if (look === "npc0") return "yu";
  return paletteOf(look).girl ? "girl" : "boy";
}

const DIGITS = "零一二三四五六七八九";
function num(n: number): string {
  if (n < 10) return DIGITS[n];
  if (n < 20) return "十" + (n % 10 ? DIGITS[n % 10] : "");
  if (n < 100) return DIGITS[Math.floor(n / 10)] + "十" + (n % 10 ? DIGITS[n % 10] : "");
  return String(n);
}
/**
 * 語音合成的破音字修正（只影響聲音，畫面字幕不變）：以同音字取代合成器會念錯的詞。
 * 經 misaki 中文拼音檢查：仔細(zǎi→zǐ)、忘了還(hái→huán)、照著(zhù→zhe)。
 */
const TTS_FIX: [RegExp, string][] = [
  [/仔細/g, "子細"],
  [/忘了還/g, "忘了環"],
  [/照著/g, "照着"],
];
/** 轉成朗讀用文字：去掉括號說明、數字改中文、修正破音字 */
export function speakText(text: string) {
  let t = text;
  for (const [re, to] of TTS_FIX) t = t.replace(re, to);
  return t
    .replace(/（.*?）/g, "")
    .replace(/(\d+)\s*／\s*(\d+)\s*／\s*(\d+)/g, (_, a, b, c) => `${num(+a)}、${num(+b)}、${num(+c)}`)
    .replace(/\d+/g, (d) => num(+d))
    .replace(/[\u{E01E0}-\u{E01EF}]/gu, "")
    .trim();
}

export const voiceUrl = (id: string) => `./voice/shorts/${id}.mp3`;
