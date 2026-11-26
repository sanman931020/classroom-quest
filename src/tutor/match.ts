import { SAFETY_WORDS, TUTOR_QA, type TutorQA } from "../data/tutorQA";

/**
 * 小老師的問題比對（不連網、不使用外部 AI）：
 * 1. 關鍵詞：學生的問題裡出現題庫的說法，越長的詞分數越高。
 * 2. 相似度：兩個字一組（bigram）比對學生問題和題目，補足說法不同的情況。
 * 分數太低就回「還不會回答」，並推薦相關問題。
 */
export function normalize(text: string) {
  return text
    .replace(/[\u{E01E0}-\u{E01EF}]/gu, "")
    .replace(/臺/g, "台")
    .replace(/紀錄/g, "記錄")
    .replace(/[\s，。、？！?!,.：:；;「」『』（）()…~～]/g, "")
    .toLowerCase();
}

const bigrams = (s: string) => {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
};

export function isSafetyQuestion(text: string) {
  const t = normalize(text);
  return SAFETY_WORDS.some((w) => t.includes(w));
}

export type Match = { qa: TutorQA; score: number };

export function rank(text: string): Match[] {
  const t = normalize(text);
  if (!t) return [];
  const tb = bigrams(t);
  return TUTOR_QA.map((qa) => {
    let score = 0;
    for (const k of qa.keys) {
      const nk = normalize(k);
      if (nk && t.includes(nk)) score += nk.length * 2;
    }
    const qb = bigrams(normalize(qa.q));
    let common = 0;
    qb.forEach((b) => tb.has(b) && common++);
    score += (common / Math.max(1, Math.min(qb.size, tb.size))) * 6;
    if (normalize(qa.q) === t) score += 20;
    return { qa, score };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** 最符合的答案；分數不夠回 null */
export function answer(text: string): Match | null {
  const best = rank(text)[0];
  return best && best.score >= 4 ? best : null;
}

/** 推薦問題：比對到的其他高分題目，沒有就用常見問題 */
export function suggestions(text: string, exclude?: string): TutorQA[] {
  const picks = rank(text)
    .filter((m) => m.qa.id !== exclude)
    .slice(0, 3)
    .map((m) => m.qa);
  if (picks.length) return picks;
  return ["steps", "elect-steps", "tie", "how-play"].map((id) => TUTOR_QA.find((q) => q.id === id)!).filter((q) => q.id !== exclude);
}
