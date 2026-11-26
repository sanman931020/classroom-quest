import { voicePart, speakText, type VoicePart } from "../shorts/voiceLines";
import type { Look } from "../art/Character";

/**
 * 遊戲朗讀台詞：每句一個預錄音檔 public/voice/game/<key>.mp3。
 * key 由「聲音角色＋朗讀文字」算出（FNV-1a），程式與產生腳本共用同一個函式，
 * 所以只要文字相同就會找到同一個音檔；文字改了就需要重新產生。
 */
export type NarrLine = { part: VoicePart; text: string };

export function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** 朗讀用文字：沿用短片的處理（去括號說明、數字轉國字、破音字修正），再去掉符號 */
export function spoken(text: string) {
  return speakText(text)
    .replace(/[「」『』]/g, "")
    .replace(/[↑↓・]/g, "，")
    .replace(/……+/g, "……")
    .replace(/\s+/g, " ")
    .trim();
}

export const lineKey = (l: NarrLine) => fnv(`${l.part}|${spoken(l.text)}`);

/** 說話者名字 → 聲音角色 */
const BY_NAME: Record<string, Look | "teacher"> = {
  安安: "anan",
  小米: "mi",
  浩浩: "hao",
  阿哲: "zhe",
  小宇: "npc0",
  小芸: "npc9",
  林老師: "teacher",
  老師: "teacher",
};
export function partOfLook(look: Look | undefined): VoicePart {
  if (!look || look === "player") return "narrator";
  return voicePart(look, "");
}
/** 「安安：……」這種帶說話者的句子，拆成角色聲音 */
export function lineFromText(text: string, fallback: VoicePart = "narrator"): NarrLine {
  const m = text.match(/^(安安|小米|浩浩|阿哲|小宇|小芸|林老師|老師)：(.+)$/s);
  if (m) return { part: partOfLook(BY_NAME[m[1]] as Look), text: m[2] };
  return { part: fallback, text };
}
