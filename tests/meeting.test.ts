import { describe, it, expect } from "vitest";
import { DECISIONS, ROLES, TOPICS } from "../src/data/meetingStory";
import { ELECTION_DECISIONS, HANDBOOK } from "../src/data/electionStory";
import {
  ALL_DECISIONS,
  computeMeters,
  hasTag,
  minorityCared,
  roleEnding,
  simulateElectionWeek,
  simulateWeek,
  weekScore,
} from "../src/simulation/meetingImpact";
import { initialExt, restoreExt } from "../src/storage/meetingExt";
import { simulate } from "../src/simulation/engine";
import { initialProgress } from "../src/data/content";

const best = (topic: string, role: string) =>
  Object.fromEntries(ALL_DECISIONS.filter((d) => d.topic === topic && d.role === role).map((d) => [d.id, d.options.find((o) => o.good)!.id]));
const worst = (topic: string, role: string) =>
  Object.fromEntries(ALL_DECISIONS.filter((d) => d.topic === topic && d.role === role).map((d) => [d.id, d.options.find((o) => !o.good)!.id]));

describe("主題與角色資料", () => {
  it("選舉步驟依課本四步驟、班會依正式六步驟", () => {
    expect(TOPICS[0].steps).toEqual(["提名人選", "徵求附議，進行討論", "舉手表決", "宣布結果"]);
    expect(TOPICS[1].steps).toHaveLength(6);
    expect(TOPICS[1].steps).not.toContain("上次決議執行情形");
  });
  it("每個主題 × 每個角色都有分支，每個決策有好與需再想的選項", () => {
    for (const t of TOPICS)
      for (const r of ROLES) {
        const list = ALL_DECISIONS.filter((d) => d.topic === t.id && d.role === r.id);
        expect(list.length, `${t.id}/${r.id}`).toBeGreaterThanOrEqual(4);
        for (const d of list) {
          expect(d.options.some((o) => o.good)).toBe(true);
          expect(d.options.some((o) => !o.good)).toBe(true);
        }
      }
  });
  it("決策 id 不重複；選舉每個角色都有平票狀況", () => {
    const ids = ALL_DECISIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of ROLES) expect(ELECTION_DECISIONS.some((d) => d.role === r.id && d.trigger === "tie")).toBe(true);
  });
  it("小百科包含平票處理，並區分課本與遊戲延伸", () => {
    const tie = HANDBOOK.find((h) => h.q.includes("平票"))!;
    expect(tie.src).toBe("遊戲延伸");
    expect(tie.a).toContain("再表決");
    expect(HANDBOOK.some((h) => h.src === "課本" && h.a.includes("提名人選"))).toBe(true);
  });
});

describe("決策影響（確定性）", () => {
  it("好的做法提高儀表，不好的做法降低", () => {
    const g = computeMeters(best("proposal", "chair"), ["far"]);
    const b = computeMeters(worst("proposal", "chair"), ["ignore"]);
    expect(g.order).toBeGreaterThan(b.order);
    expect(g.fair).toBeGreaterThan(b.fair);
    expect(computeMeters(best("proposal", "chair"))).toEqual(computeMeters(best("proposal", "chair")));
  });
  it("照顧少數：選『不用再管』不算照顧", () => {
    expect(minorityCared(["far"])).toBe(true);
    expect(minorityCared(["far", "ignore"])).toBe(false);
    expect(minorityCared([])).toBe(false);
  });
  it("一週模擬：分區＋配套比沒有配套更多笑臉；方案不同結果不同", () => {
    const c = best("proposal", "chair");
    const good = weekScore(simulateWeek("B", ["far", "volume", "review"], c));
    const bare = weekScore(simulateWeek("B", [], c));
    expect(good).toBeGreaterThan(bare);
    expect(simulateWeek("A", [], c).map((d) => d.text)).not.toEqual(simulateWeek("C", [], c).map((d) => d.text));
    expect(simulateWeek("B", [], c)).toHaveLength(5);
  });
  it("書本問題有被提出（tags）才會改善星期三", () => {
    expect(hasTag(best("proposal", "recorder"), "books")).toBe(true);
    expect(hasTag(worst("proposal", "recorder"), "books")).toBe(false);
    expect(simulateWeek("B", [], worst("proposal", "chair"))[2].mood).toBe("sad");
  });
  it("四種角色、兩種主題的結局會依選擇不同", () => {
    for (const t of ["election", "proposal"] as const)
      for (const r of ROLES) {
        const hi = roleEnding(r.id, best(t, r.id), ["far"], t);
        const lo = roleEnding(r.id, worst(t, r.id), ["ignore"], t);
        expect(hi.level).toBe("high");
        expect(lo.level).toBe("low");
        expect(hi.text).not.toBe(lo.text);
      }
  });
  it("選舉後一週：公平選舉比起鬨、不配合有更多笑臉", () => {
    expect(weekScore(simulateElectionWeek(best("election", "student")))).toBeGreaterThan(weekScore(simulateElectionWeek(worst("election", "student"))));
  });
});

describe("班會紀錄儲存（不改 Progress v1）", () => {
  it("還原有效資料、丟棄無效資料，保留班級與名字", () => {
    const e = initialExt();
    e.className = "四年五班";
    e.playerName = "小明";
    e.topic = "election";
    e.role = "student";
    e.choices = { "el-s-tie": "rule", bogus: "x", open: "nope" };
    const r = restoreExt(JSON.stringify(e));
    expect(r.className).toBe("四年五班");
    expect(r.playerName).toBe("小明");
    expect(r.choices).toEqual({ "el-s-tie": "rule" });
    expect(restoreExt("壞掉")).toEqual(initialExt());
    expect(restoreExt(JSON.stringify({ ...e, role: "king", topic: "x" })).role).toBeNull();
    expect(restoreExt(JSON.stringify({ ...e, playerName: "一二三四五六七八九十" })).playerName).toHaveLength(8);
  });
  it("引擎 simulate 新增 flags 為向後相容欄位", () => {
    const r = simulate(initialProgress());
    expect(r.flags).toEqual({ needs: false, classified: false, space: false });
    expect(DECISIONS.length).toBeGreaterThan(0);
  });
});

describe("注音破音字", () => {
  it("詞彙讀音：班長、角色、重新、數一數、覺得、因為、謝謝", async () => {
    const { annotate, stripVS, WORDS } = await import("../src/ui/zhuyin");
    const vs = (n: number) => String.fromCodePoint(0xe01e0 + n);
    expect(annotate("選舉班長")).toBe(`選舉班長${vs(1)}`);
    expect(annotate("選擇角色")).toBe(`選擇角${vs(1)}色`);
    expect(annotate("重新演練")).toBe(`重${vs(1)}新演練`);
    expect(annotate("一邊數")).toBe(`一邊數${vs(1)}`);
    expect(annotate("我覺得")).toBe(`我覺得${vs(1)}`);
    expect(annotate("謝謝大家")).toBe(`謝謝${vs(1)}大家`);
    expect(annotate("長處")).toBe(`長處${vs(1)}`);
    // 可重複套用、可移除
    expect(annotate(annotate("班長"))).toBe(annotate("班長"));
    expect(stripVS(annotate("因為班長"))).toBe("因為班長");
    // 每個詞的索引數量與字數相同
    for (const [w, r] of Object.entries(WORDS)) expect(r.length, w).toBe(Array.from(w).length);
  });
});

describe("短片人聲", () => {
  it("朗讀文字：數字轉中文、去掉括號說明；角色分配不同聲音", async () => {
    const { speakText, voicePart, lineId } = await import("../src/shorts/voiceLines");
    const { SHORTS } = await import("../src/shorts/shortsData");
    expect(speakText("哇！14 比 14，平票了！")).toBe("哇！十四 比 十四，平票了！");
    expect(speakText("（插話）可是我們想討論漫畫啦！")).toBe("可是我們想討論漫畫啦！");
    expect(voicePart("teacher", "林老師")).toBe("teacher");
    expect(voicePart(undefined, "旁白")).toBe("narrator");
    expect(voicePart("npc0", "主席")).toBe("yu");
    expect(new Set(["anan", "mi", "hao", "zhe", "npc0"].map((l) => voicePart(l as never, "x"))).size).toBe(5);
    expect(lineId("election", 0, 0)).toBe("election-1-1");
    for (const s of SHORTS) expect(s.scenes.reduce((a, b) => a + b.dur, 0)).toBeLessThanOrEqual(90);
  });
});
