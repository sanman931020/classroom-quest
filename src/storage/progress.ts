import type { Progress } from "../game/types";
import { initialProgress } from "../data/content";
const key = "classroom-quest-v1";
function matches(value: unknown, example: unknown): boolean {
  if (Array.isArray(example))
    return (
      Array.isArray(value) &&
      value.every((v) => example.length === 0 || matches(v, example[0]))
    );
  if (example === null) return value === null || typeof value === "string";
  if (typeof example === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    return Object.entries(example).every(([k, v]) =>
      matches((value as Record<string, unknown>)[k], v),
    );
  }
  return (
    typeof value === typeof example &&
    (typeof value !== "number" || Number.isFinite(value))
  );
}
export function restore(raw: string | null): Progress {
  if (!raw) return initialProgress();
  try {
    const p = JSON.parse(raw);
    const d = initialProgress();
    if (
      !matches(p, d) ||
      p.version !== 1 ||
      p.week.length !== 5 ||
      !["home", "reading", "meeting", "service"].includes(p.scene) ||
      !["clean", "traffic", "library", "council"].includes(p.service.station) ||
      !["anan", "zhe", "mi", "hao"].includes(p.service.role) ||
      !Number.isInteger(p.meeting.step) ||
      p.meeting.step < 0 ||
      p.meeting.step > 5 ||
      !Number.isInteger(p.election.step) ||
      p.election.step < 0 ||
      p.election.step > 3
    )
      throw Error("format");
    const ids = ["anan", "zhe", "mi", "hao", "teacher"];
    if (
      [p.clues, p.meeting.heard, p.meeting.queue].some((a: unknown[]) =>
        a.some((id: unknown) => typeof id !== "string" || !ids.includes(id)),
      ) ||
      (p.meeting.speaker !== null && !ids.includes(p.meeting.speaker))
    )
      throw Error("character");
    if (
      Object.values(p.positions).some((v) => {
        const q = v as { x: number; y: number };
        return q.x < 0 || q.x > 7 || q.y < 0 || q.y > 2;
      })
    )
      throw Error("position");
    return p;
  } catch {
    return initialProgress();
  }
}
export function load() {
  try {
    return { state: restore(localStorage.getItem(key)), error: "" };
  } catch {
    return {
      state: initialProgress(),
      error: "此瀏覽器無法讀取進度，請保留本頁並匯出成果。",
    };
  }
}
export function save(state: Progress) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return "進度已自動儲存於此瀏覽器";
  } catch {
    return "儲存失敗，請匯出成果備份。";
  }
}
export function download(state: Progress) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "我們這一班-學習成果.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
