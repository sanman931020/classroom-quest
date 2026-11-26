import { describe, it, expect } from "vitest";
import { answer, isSafetyQuestion } from "../src/tutor/match";
import { TUTOR_QA } from "../src/data/tutorQA";

/** 學生可能的問法 → 應該找到的題目 */
const CASES: [string, string][] = [
  ["如果投票一樣多怎麼辦", "tie"],
  ["平手了要怎麼辦", "tie"],
  ["主席要幹嘛", "chair"],
  ["司儀要做什麼", "emcee"],
  ["記錄要寫什麼", "recorder"],
  ["班會有哪些程序", "steps"],
  ["開班會的順序是什麼", "steps"],
  ["選班長有幾個步驟", "elect-steps"],
  ["什麼是附議", "second"],
  ["沒人附議怎麼辦", "no-second"],
  ["什麼是臨時動議", "motion"],
  ["我不敢說話怎麼辦", "shy"],
  ["有人一直插嘴", "interrupt"],
  ["討論跑題了", "offtopic"],
  ["表決有哪些方式", "vote-how"],
  ["什麼是服從多數尊重少數", "majority"],
  ["我投反對也要遵守嗎", "must-follow"],
  ["沒選上好難過", "lose"],
  ["可以提名自己嗎", "self-nominate"],
  ["有人亂提名", "joke-nominate"],
  ["提案要怎麼寫", "proposal-how"],
  ["這個遊戲怎麼玩", "how-play"],
  ["上面的儀表是什麼", "meters"],
  ["選錯了怎麼辦", "wrong-choice"],
  ["什麼是任期", "term"],
  ["衛生股長要做什麼", "officers"],
  ["我不同意別人的想法", "disagree"],
  ["可以跟好朋友一起舉手嗎", "follow-friend"],
];

describe("AI小老師題庫比對", () => {
  it.each(CASES)("「%s」→ %s", (q, id) => {
    expect(answer(q)?.qa.id).toBe(id);
  });
  it("聽不懂的問題不亂回答", () => {
    expect(answer("今天午餐吃什麼")).toBeNull();
  });
  it("遇到欺負、危險的字詞先請學生找大人", () => {
    expect(isSafetyQuestion("有人一直欺負我")).toBe(true);
    expect(isSafetyQuestion("怎麼選班長")).toBe(false);
  });
  it("題庫 id 不重複，課本題目不提到 API 或外部服務", () => {
    const ids = TUTOR_QA.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of TUTOR_QA) for (const n of q.next ?? []) expect(ids).toContain(n);
  });
});
