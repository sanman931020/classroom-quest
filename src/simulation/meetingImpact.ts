import type { CharacterId } from "../game/types";
import {
  DAYS,
  DECISIONS,
  ENDINGS,
  MEASURES,
  PREDICTION_KEY,
  type DayMood,
  type Effect,
  type Feeling,
  type MeetingRole,
  type Meter,
  type PlanId,
  type StakeholderId,
  type WeekDay,
} from "../data/meetingStory";

/**
 * 班會決策影響引擎（純函式、確定性）。
 * 不改動 engine.ts 的班會前進條件；只計算「選擇 → 影響」供回饋與一週模擬。
 */
export type Meters = Record<Meter, number>;
const BASE = 60;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

function effectsOf(choices: Record<string, string>, measures: string[]): Effect[] {
  const list: Effect[] = [];
  for (const d of DECISIONS) {
    const o = d.options.find((x) => x.id === choices[d.id]);
    if (o) list.push(o.effect);
  }
  for (const m of MEASURES) if (measures.includes(m.id)) list.push(m.effect);
  return list;
}

export function computeMeters(choices: Record<string, string>, measures: string[] = []): Meters {
  const m: Meters = { order: BASE, fair: BASE, voice: BASE };
  for (const e of effectsOf(choices, measures)) {
    (Object.keys(m) as Meter[]).forEach((k) => {
      if (typeof e[k] === "number") m[k] = clamp(m[k] + (e[k] as number));
    });
  }
  return m;
}

export function computeFeelings(
  choices: Record<string, string>,
  measures: string[] = [],
): Record<CharacterId, Feeling> {
  const f: Record<CharacterId, Feeling> = { anan: "idle", zhe: "idle", mi: "idle", hao: "idle", teacher: "idle" };
  for (const e of effectsOf(choices, measures)) Object.assign(f, e.feel ?? {});
  return f;
}

export function checkPrediction(plan: PlanId, who: StakeholderId) {
  return PREDICTION_KEY[plan].answer === who;
}

/** 照顧少數的做法是否足夠：至少一項具體好方法，且沒有選「不用再管」 */
export function minorityCared(measures: string[]) {
  const picked = MEASURES.filter((m) => measures.includes(m.id));
  return picked.some((m) => m.good) && !picked.some((m) => !m.good);
}

export function minoritySentence(measures: string[]) {
  return MEASURES.filter((m) => m.good && measures.includes(m.id))
    .map((m) => m.sentence)
    .join("，");
}

/** 一週試行模擬：方案＋配套措施＋會議過程 → 五天情況（可解釋規則） */
export function simulateWeek(
  plan: PlanId,
  measures: string[],
  choices: Record<string, string>,
): WeekDay[] {
  const has = (id: string) => measures.includes(id);
  const meters = computeMeters(choices, measures);
  const separated = has("far") || has("shelf");
  const books =
    hasTag(choices, "books")
      ? { mood: "happy" as DayMood, text: "大家記得愛惜書本，看完都放回原位。", who: "zhe" as CharacterId }
      : { mood: "sad" as DayMood, text: "又有一本書沒放回去。會議中沒有討論到書本的問題。", who: "zhe" as CharacterId };
  const review = has("review")
    ? { mood: "happy" as DayMood, text: "大家一起檢查這一週，提出要修改的地方。", who: "teacher" as CharacterId }
    : { mood: "ok" as DayMood, text: "沒有約好檢討時間，發現的問題不知道什麼時候改。", who: "teacher" as CharacterId };
  let days: Omit<WeekDay, "day">[];
  if (plan === "A")
    days = [
      { mood: "happy", text: "閱讀角非常安靜，小米看完了一本書。", who: "mi" },
      { mood: "sad", text: "浩浩想和朋友聊漫畫，卻沒有地方可以去。", who: "hao" },
      books,
      { mood: "sad", text: "有同學忍不住在閱讀角小聲聊天，被提醒了好幾次。", who: "anan" },
      review,
    ];
  else if (plan === "C")
    days = [
      { mood: "ok", text: "今天輪到討論組，想安靜看書的小米要等明天。", who: "mi" },
      { mood: "happy", text: "輪到安靜組，閱讀角很安靜。", who: "mi" },
      books,
      { mood: "ok", text: "有人忘了今天輪到誰，需要看值日表確認。", who: "zhe" },
      review,
    ];
  else
    days = [
      separated
        ? { mood: "happy", text: "安靜區和討論區分開了，小米可以安心看書。", who: "mi" }
        : { mood: "sad", text: "討論區就在旁邊，小米覺得有點吵。", who: "mi" },
      has("volume")
        ? { mood: "happy", text: "浩浩和朋友小小聲討論漫畫，大家都很開心。", who: "hao" }
        : { mood: "sad", text: "討論太熱烈，聲音越來越大。", who: "hao" },
      books,
      meters.order >= 70
        ? { mood: "happy", text: "大家照著班會的決定使用閱讀角。", who: "anan" }
        : { mood: "ok", text: "有同學忘了約定，需要提醒。", who: "anan" },
      review,
    ];
  return days.map((d, i) => ({ ...d, day: DAYS[i] }));
}

export function weekScore(days: WeekDay[]) {
  return days.filter((d) => d.mood === "happy").length;
}

/** 已選選項中是否帶有某個標記 */
export function hasTag(choices: Record<string, string>, tag: "books" | "yun" | "me") {
  return DECISIONS.some((d) => d.options.some((o) => o.id === choices[d.id] && o.tags?.includes(tag)));
}

/** 角色結局：好的做法比例 ≥ 80% 為 high、≥ 50% 為 mid，其餘 low（加上照顧少數） */
export function roleEnding(role: MeetingRole, choices: Record<string, string>, measures: string[]) {
  const mine = DECISIONS.filter((d) => d.role === role && choices[d.id]);
  const good = mine.filter((d) => d.options.find((o) => o.id === choices[d.id])?.good).length;
  const total = mine.length + 1;
  const score = good + (minorityCared(measures) ? 1 : 0);
  const ratio = total ? score / total : 0;
  const level: "high" | "mid" | "low" = ratio >= 0.8 ? "high" : ratio >= 0.5 ? "mid" : "low";
  return { level, text: ENDINGS[role][level], good: score, total };
}
