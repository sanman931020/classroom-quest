import { DECISIONS, MEASURES, PLAN_IDS, ROLES, STAKEHOLDERS, TOPICS, type MeetingRole, type PlanId, type StakeholderId, type TopicId } from "../data/meetingStory";
import { ELECTION_DECISIONS } from "../data/electionStory";

/**
 * 班會決策紀錄（第二階段新增）。
 * 與 Progress v1（classroom-quest-v1）分開保存，不改動既有 schema；
 * 由 App 統一讀寫與匯出，活動視圖只透過 props 更新。
 */
export interface MeetingExt {
  version: 1;
  /** 學生的班級與名字（只存在本機，不上傳） */
  className: string;
  playerName: string;
  /** 目前選擇的討論主題 */
  topic: TopicId | null;
  /** 學生選擇扮演的班會角色（尚未選擇為 null） */
  role: MeetingRole | null;
  /** 角色決策：decisionId → optionId */
  choices: Record<string, string>;
  /** 影響預測：方案 → 最可能不方便的人 */
  predictions: Partial<Record<PlanId, StakeholderId>>;
  /** 照顧少數配套措施 */
  measures: string[];
  /** 已收集的論點卡 */
  cards: string[];
  /** 幹部工作配對（已配對成功的幹部名稱） */
  officers: string[];
  /** 「如果當初…」模擬選擇的方案 */
  whatIf: PlanId;
  /** 會後反思 */
  reflection: string;
}
export const EXT_KEY = "classroom-quest-meeting-v1";

export function initialExt(): MeetingExt {
  return { version: 1, className: "", playerName: "", topic: null, role: null, choices: {}, predictions: {}, measures: [], cards: [], officers: [], whatIf: "B", reflection: "" };
}

const strArr = (v: unknown, allowed?: string[]) =>
  Array.isArray(v) && v.every((x) => typeof x === "string" && (!allowed || allowed.includes(x)));

export function restoreExt(raw: string | null): MeetingExt {
  if (!raw) return initialExt();
  try {
    const p = JSON.parse(raw);
    const d = initialExt();
    if (!p || p.version !== 1) return d;
    const choices: Record<string, string> = {};
    if (p.choices && typeof p.choices === "object")
      for (const dec of [...ELECTION_DECISIONS, ...DECISIONS]) {
        const v = p.choices[dec.id];
        if (dec.options.some((o) => o.id === v)) choices[dec.id] = v;
      }
    const predictions: MeetingExt["predictions"] = {};
    if (p.predictions && typeof p.predictions === "object")
      for (const pl of PLAN_IDS) {
        const v = p.predictions[pl];
        if (STAKEHOLDERS.some((s) => s.id === v)) predictions[pl] = v;
      }
    return {
      version: 1,
      className: typeof p.className === "string" ? p.className.slice(0, 12) : "",
      playerName: typeof p.playerName === "string" ? p.playerName.slice(0, 8) : "",
      topic: TOPICS.some((t) => t.id === p.topic) ? p.topic : null,
      role: ROLES.some((r) => r.id === p.role) ? p.role : null,
      choices,
      predictions,
      measures: strArr(p.measures, MEASURES.map((m) => m.id)) ? p.measures : [],
      cards: strArr(p.cards) ? p.cards : [],
      officers: strArr(p.officers) ? p.officers : [],
      whatIf: PLAN_IDS.includes(p.whatIf) ? p.whatIf : "B",
      reflection: typeof p.reflection === "string" ? p.reflection : "",
    };
  } catch {
    return initialExt();
  }
}

export function loadExt() {
  try {
    return restoreExt(localStorage.getItem(EXT_KEY));
  } catch {
    return initialExt();
  }
}
export function saveExt(e: MeetingExt) {
  try {
    localStorage.setItem(EXT_KEY, JSON.stringify(e));
    return true;
  } catch {
    return false;
  }
}

/** 顯示用名稱（未填寫時的預設） */
export const displayClass = (e: MeetingExt) => e.className.trim() || "我們班";
export const displayName = (e: MeetingExt) => e.playerName.trim() || "我";
