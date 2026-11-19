import { paletteOf, type Look } from "../art/Character";

/**
 * 短片人聲：每句台詞一個音檔 public/voice/shorts/<id>.mp3。
 * 角色聲音分配（Kokoro-82M 本機產生，Apache-2.0）：
 *   teacher 林老師 zf_xiaoxiao｜narrator 旁白 zf_xiaoni｜anan 安安 zf_xiaoyi｜mi 小米 zf_xiaobei
 *   hao 浩浩 zm_yunxia｜zhe 阿哲 zm_yunxi｜npc0 小宇 zm_yunjian｜chorus 大家 zm_yunyang｜其他同學依性別
 * 之後若有真人錄音，用相同檔名覆蓋即可。
 */
export type VoicePart = "teacher" | "narrator" | "anan" | "mi" | "hao" | "zhe" | "yu" | "chorus" | "girl" | "boy";

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
/** 轉成朗讀用文字：去掉括號說明、數字改中文、斜線改「比」 */
export function speakText(text: string) {
  return text
    .replace(/（.*?）/g, "")
    .replace(/(\d+)\s*／\s*(\d+)\s*／\s*(\d+)/g, (_, a, b, c) => `${num(+a)}、${num(+b)}、${num(+c)}`)
    .replace(/\d+/g, (d) => num(+d))
    .replace(/[\u{E01E0}-\u{E01EF}]/gu, "")
    .trim();
}

export const voiceUrl = (id: string) => `./voice/shorts/${id}.mp3`;
