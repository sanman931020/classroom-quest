import { describe, it, expect } from "vitest";
import {
  initialProgress,
  characters,
  sampleVotes,
  stations,
} from "../src/data/content";
import {
  checkRule,
  place,
  simulate,
  nextMeeting,
  serviceComplete,
} from "../src/simulation/engine";
import { restore } from "../src/storage/progress";
describe("公約與空間", () => {
  it("拒絕模糊與不公平公約", () => {
    expect(checkRule(initialProgress().rule)).toEqual({
      clear: false,
      fair: false,
      possible: false,
    });
    expect(
      checkRule({
        when: "午休",
        who: "只有男生",
        action: "小聲閱讀",
        care: true,
        possible: true,
      }).fair,
    ).toBe(false);
  });
  it("吸附並拒絕重疊、通道與越界", () => {
    const s = initialProgress();
    expect(
      place(s.positions, "table", { x: 7.1, y: 0.2 }).positions.table,
    ).toEqual({ x: 7, y: 0 });
    expect(place(s.positions, "table", { x: 1, y: 1 }).ok).toBe(false);
    expect(place(s.positions, "table", { x: 5, y: 3 }).ok).toBe(false);
    expect(place(s.positions, "table", { x: 8, y: 0 }).ok).toBe(false);
  });
  it("通過需蒐集分類全部線索、公約與距離", () => {
    const s = initialProgress();
    s.rule = {
      when: "午休",
      who: "全班同學",
      action: "小聲閱讀，討論請到討論桌",
      care: true,
      possible: true,
    };
    s.clues = characters.map((c) => c.id);
    characters.forEach((c) => (s.categories[c.id] = c.category));
    expect(simulate(s).pass).toBe(false);
    s.positions.table = { x: 7, y: 0 };
    expect(simulate(s).pass).toBe(true);
    expect(simulate(s)).toEqual(simulate(s));
  });
});
describe("班會", () => {
  it("禁止未選舉、未寫提案就開會", () => {
    const s = initialProgress();
    expect(nextMeeting(s).ok).toBe(false);
    s.election.winner = "安安";
    expect(nextMeeting(s).ok).toBe(false);
  });
  it("討論未完成不能跳步，程序完成可前進", () => {
    const s = initialProgress();
    s.election.winner = "安安";
    s.proposal = { problem: "吵雜", plan: "分區", reason: "照顧不同需要" };
    s.meeting.step = 3;
    expect(nextMeeting(s).ok).toBe(false);
    Object.assign(s.meeting, {
      seconded: true,
      heard: ["mi", "hao", "zhe"],
      voted: true,
      minority: "將討論桌移遠並試行一週",
    });
    expect(nextMeeting(s).ok).toBe(true);
    s.meeting.speaker = "mi";
    expect(nextMeeting(s).ok).toBe(false);
  });
  it("教材示範總票數為28", () =>
    expect(sampleVotes.reduce((a, b) => a + b, 0)).toBe(28));
});
describe("獨立服務與儲存", () => {
  it("四站皆可獨立完成", () => {
    for (const st of stations) {
      const s = initialProgress();
      s.service.station = st.id;
      expect(serviceComplete(s)).toBe(false);
      st.tasks.forEach(
        (t) => (s.service.answers[`${st.id}:${t.id}`] = t.correct),
      );
      expect(serviceComplete(s)).toBe(true);
    }
  });
  it("損毀與未知版本存檔復原，正常保留學習單", () => {
    expect(restore("bad")).toEqual(initialProgress());
    expect(restore('{"version":2}')).toEqual(initialProgress());
    const s = initialProgress();
    s.week[0] = { mood: "😊 笑臉", observation: "今天很安靜" };
    expect(restore(JSON.stringify(s))).toEqual(s);
  });
});
