import type { CharacterId } from "../game/types";
import { ELECTION_DECISIONS } from "../data/electionStory";
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
  type TopicId,
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

/** 兩個主題的全部決策 */
export const ALL_DECISIONS = [...ELECTION_DECISIONS, ...DECISIONS];

function effectsOf(choices: Record<string, string>, measures: string[]): Effect[] {
  const list: Effect[] = [];
  for (const d of ALL_DECISIONS) {
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
export function hasTag(choices: Record<string, string>, tag: "books" | "yun" | "me" | "reason" | "cooperate" | "kind") {
  return ALL_DECISIONS.some((d) => d.options.some((o) => o.id === choices[d.id] && o.tags?.includes(tag)));
}

/** 角色結局：好的做法比例 ≥ 80% 為 high、≥ 50% 為 mid，其餘 low（加上照顧少數） */
export function roleEnding(role: MeetingRole, choices: Record<string, string>, measures: string[], topic: TopicId = "proposal") {
  const mine = ALL_DECISIONS.filter((d) => d.topic === topic && d.role === role && choices[d.id]);
  const good = mine.filter((d) => d.options.find((o) => o.id === choices[d.id])?.good).length;
  const bonus = topic === "proposal" ? 1 : 0;
  const total = mine.length + bonus;
  const score = good + (topic === "proposal" && minorityCared(measures) ? 1 : 0);
  const ratio = total ? score / total : 0;
  const level: "high" | "mid" | "low" = ratio >= 0.8 ? "high" : ratio >= 0.5 ? "mid" : "low";
  const text = topic === "proposal" ? ENDINGS[role][level] : ELECTION_ENDINGS[role][level];
  return { level, text, good: score, total };
}

export const ELECTION_ENDINGS: Record<MeetingRole, Record<"high" | "mid" | "low", string>> = {
  chair: {
    high: "你是公平的選舉主持人。每一步都照程序，平票也冷靜處理，大家都相信這次的結果。",
    mid: "選舉完成了！有些步驟可以更仔細，讓每一票、每個理由都被重視。",
    low: "選舉有點亂，有同學覺得不公平。重新演練，看看照著四個步驟會有什麼不同。",
  },
  emcee: {
    high: "你把四個步驟宣布得清清楚楚，連平票時也讓大家知道接下來怎麼做。",
    mid: "選舉完成了！有些時候宣布得不夠清楚，大家有點搞不清楚。",
    low: "程序有點亂，大家不知道現在在做什麼。試著依照四個步驟宣布看看。",
  },
  recorder: {
    high: "你的黑板紀錄公正又清楚，每一票都看得到，大家都相信結果。",
    mid: "紀錄完成了！還有一些內容可以記得更完整。",
    low: "紀錄不夠正確，有人懷疑票數。重新演練，試著誠實、清楚地記下每一票。",
  },
  student: {
    high: "你認真提名、專心聽、依自己的判斷投票，也尊重選舉結果。你是很棒的班級一分子！",
    mid: "你參加了選舉！有時候可以更專心，或用自己的想法做決定。",
    low: "選舉中有些時候在鬧或跟著好朋友。重新演練，看看認真參與會帶來什麼不同。",
  },
};

/** 選舉後一週：依選舉中的做法模擬（確定性） */
export function simulateElectionWeek(choices: Record<string, string>): WeekDay[] {
  const m = computeMeters(choices, []);
  const days: Omit<WeekDay, "day">[] = [
    hasTag(choices, "reason")
      ? { mood: "happy", text: "新班長說到做到，每天檢查值日表。", who: "anan" }
      : { mood: "ok", text: "大家不太確定新班長要做哪些事。", who: "anan" },
    hasTag(choices, "cooperate")
      ? { mood: "happy", text: "同學願意配合班長的提醒，教室整整齊齊。", who: "hao" }
      : { mood: "sad", text: "有同學說：「我又沒選他。」不想配合提醒。", who: "hao" },
    hasTag(choices, "kind")
      ? { mood: "happy", text: "沒當選的同學也很開心，主動幫忙寫班會紀錄。", who: "zhe" }
      : { mood: "ok", text: "沒當選的同學有點難過，覺得大家在笑他。", who: "zhe" },
    m.order >= 70
      ? { mood: "happy", text: "大家記得選舉時的秩序，上課也很專心。", who: "mi" }
      : { mood: "ok", text: "還有人在說選舉時起鬨的事，上課有點亂。", who: "mi" },
    m.fair >= 70
      ? { mood: "happy", text: "大家覺得這次選舉很公平。任期結束後，每個人都有機會服務。", who: "teacher" }
      : { mood: "sad", text: "有人覺得選舉不公平，想重新再選一次。", who: "teacher" },
  ];
  return days.map((d, i) => ({ ...d, day: DAYS[i] }));
}
