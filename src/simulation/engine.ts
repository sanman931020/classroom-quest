import { characters, stations } from "../data/content";
import type { FurnitureId, Point, Progress, Rule } from "../game/types";
export function checkRule(r: Rule) {
  return {
    clear: !!r.when.trim() && r.action.trim().length >= 4,
    fair: r.who === "全班同學" && r.care,
    possible: r.possible,
  };
}
export function place(
  positions: Progress["positions"],
  id: FurnitureId,
  p: Point,
) {
  const point = { x: Math.round(p.x), y: Math.round(p.y) };
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.x > 7 ||
    point.y < 0 ||
    point.y > 3
  )
    return { ok: false, reason: "請放在教室格子內。", positions };
  if (point.y === 3)
    return { ok: false, reason: "最下排是通道，請保持暢通。", positions };
  if (
    Object.entries(positions).some(
      ([k, v]) => k !== id && v.x === point.x && v.y === point.y,
    )
  )
    return { ok: false, reason: "物件重疊了，請選一個空格。", positions };
  return {
    ok: true,
    reason: "位置已更新並吸附格線。",
    positions: { ...positions, [id]: point },
  };
}
export function simulate(s: Progress) {
  const c = checkRule(s.rule);
  const distance = Math.hypot(
    s.positions.mat.x - s.positions.table.x,
    s.positions.mat.y - s.positions.table.y,
  );
  const needs = characters.every((p) => s.clues.includes(p.id));
  const classified = characters.every((p) => s.categories[p.id] === p.category);
  const space = distance >= 3;
  return {
    pass: Object.values(c).every(Boolean) && needs && classified && space,
    checks: c,
    distance,
    feedback: [
      !needs
        ? "安安：還有夥伴的需要沒聽到。"
        : "安安：你已經聽過每個人的需要。",
      !classified ? "阿哲：請檢查問題分類。" : "阿哲：問題已整理清楚。",
      space
        ? "小米：討論桌與地墊至少相隔三格，安靜需要有被考慮。"
        : "小米：討論桌太近了，請與地墊至少相隔三格。",
      c.fair
        ? "浩浩：謝謝你也替想討論的人留空間。"
        : "浩浩：請確認規則適用每個人，也照顧不同需要。",
      "林老師：這是簡化的空間模擬，仍需在真實班級試行。",
    ],
  };
}
export function nextMeeting(s: Progress): { ok: boolean; reason: string } {
  const m = s.meeting;
  if (m.done) return { ok: false, reason: "已完成班會，可重新演練。" };
  if (!s.election.winner)
    return { ok: false, reason: "先完成四步驟幹部選舉。" };
  if (!Object.values(s.proposal).every((v) => v.trim()))
    return { ok: false, reason: "會前先完成「問題、提案、理由」。" };
  if (
    m.step === 3 &&
    (!m.seconded ||
      m.heard.length < 3 ||
      m.speaker ||
      m.queue.length ||
      !m.voted ||
      m.minority.trim().length < 4)
  )
    return {
      ok: false,
      reason: "請先完成附議、聆聽三種意見、表決，並寫下照顧少數的具體做法。",
    };
  return {
    ok: true,
    reason:
      m.step === 5
        ? "已散會。林老師：謝謝大家，一週後帶著觀察回來討論。"
        : "程序已完成，請進行下一項。",
  };
}
export function serviceComplete(s: Progress) {
  const station = stations.find((t) => t.id === s.service.station)!;
  return station.tasks.every(
    (t) => s.service.answers[`${station.id}:${t.id}`] === t.correct,
  );
}
