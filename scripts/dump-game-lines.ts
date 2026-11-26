/**
 * 匯出遊戲朗讀台詞清單（供 scripts/gen_voices_breezy.py 產生 public/voice/game/*.mp3）。
 * 執行：npx tsx scripts/dump-game-lines.ts > game-lines.json
 *
 * 內容：開場說明、選主題與角色、每個角色的決策對話（台詞、問題、選項、結果）、
 * 任務說明、提示訊息、一週影響、結局與反思。產生後的 e2e 測試會檢查玩過的每一句都有音檔。
 */
import { readFileSync } from "node:fs";
import { meetingSteps, officers, plans } from "../src/data/content";
import { ARGUMENTS, DAYS, ENDINGS, MEASURES, PREDICTION_KEY, ROLES, TOPICS } from "../src/data/meetingStory";
import { ALL_DECISIONS, ELECTION_ENDINGS } from "../src/simulation/meetingImpact";
import { NAME, speakerOf } from "../src/data/speakers";
import { lineFromText, lineKey, partOfLook, spoken, type NarrLine } from "../src/narration/lines";
import type { VoicePart } from "../src/shorts/voiceLines";

const out = new Map<string, { id: string; part: string; text: string }>();
const add = (l: NarrLine | string) => {
  const line = typeof l === "string" ? { part: "narrator" as VoicePart, text: l } : l;
  const text = spoken(line.text);
  if (!text) return;
  const id = lineKey(line);
  out.set(id, { id, part: line.part, text });
};
/** 提示訊息（Toast）：「名字：」開頭用角色聲音，其餘旁白 */
const toast = (t: string) => {
  // 與 narrator.personal 相同：句首「你，」省略
  const l = lineFromText(t);
  add({ ...l, text: l.text.replace(/^你，/, "") });
};
const ORDINAL = ["第一", "第二", "第三", "第四"];
const H = (text: string): NarrLine => ({ part: "host", text });
const CJK = /[一-鿿]/;
const literals = (src: string) => [...src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1]).filter((t) => CJK.test(t) && !t.includes("${"));

/* ---------- 開場說明（main.tsx Intro，林老師） ---------- */
const intro2 = "你可以選「選舉班級幹部」或「班會提案」，再當主席、司儀、記錄或學生。每個角色會遇到不一樣的狀況。";
const intro3 = "對話框出現時，點一個你覺得好的做法。上面的儀表和同學的表情，會告訴你這個決定帶來什麼影響。";
add({ part: "teacher", text: "上課囉！歡迎你來到我們班。今天，我們要一起開班會。" });
add({ part: "teacher", text: `選主題、選角色。${intro2}` });
add({ part: "teacher", text: `做決定、看影響。${intro3}` });

/* ---------- 選主題、選角色 ---------- */
add("今天要討論什麼呢？請先選一個主題，再選你要當的角色。");
for (const t of TOPICS) {
  add(H(`${t.title}。`));
  add(`${t.sub}，一共有${t.steps.length}個步驟。`);
}
toast("歡迎來到班會大挑戰！");
for (const r of ROLES) toast(`你是${r.name}！${r.tip}`);

/* ---------- 決策對話 ---------- */
for (const d of ALL_DECISIONS) {
  for (const role of ROLES.map((r) => r.id)) {
    if (role !== d.role) continue;
    const sp = speakerOf(d, d.topic, role);
    add({ part: partOfLook(sp.look), text: sp.text });
  }
  add(d.question);
  add(d.options.map((o, i) => `${ORDINAL[i]}，${o.label}。`).join(""));
  for (const o of d.options) toast(o.result);
  const better = d.options.find((o) => o.good);
  if (better) add(`${d.question}可以試試：${better.label}。`);
}

/* ---------- 選幹部任務 ---------- */
add(H("先認識：幹部做什麼？"));
add("先點一位幹部，再點他的工作。");
add(H("步驟一，提名人選。"));
add("你想提名誰當班長？");
add("同學提名了兩位人選。");
add(H("步驟二，徵求附議，進行討論。"));
add({ part: "anan", text: "我會每天確認值日表。" });
add({ part: "zhe", text: "我會清楚記錄大家的需求。" });
add("附議：一個人以上贊成這個提議，用舉手或口頭表達。");
add(H("步驟三，舉手表決。"));
add("你要舉手支持誰？");
add(H("步驟四，宣布結果。"));
for (const n of ["安安", "阿哲"]) {
  add(`這次模擬選出的班長是${n}。班上同學都有機會擔任幹部，為大家服務。`);
  toast(`再表決結果：${n} 16 票、${n === "安安" ? "阿哲" : "安安"} 12 票。（模擬票數）`);
}
for (const [n, job] of officers) {
  toast(`答對了！${n}：${job}。`);
  toast(`再想想：「${job}」比較像哪一位幹部的工作？`);
}

/* ---------- 提案與班會 ---------- */
add(H("提出問題：我的提案單。"));
add("寫出你發現的問題、你的提案和理由，也可以點下面的句子幫忙。");
meetingSteps.forEach((v, i) => {
  add(H(`程序${"一二三四五六"[i]}，${v}。`));
  toast(`目前：${v}。請完成此程序。`);
});
add(H("提案討論，第一步：徵求附議。"));
add("看看有沒有同學贊成這個提案。");
add(H("提案討論，第二步：輪流發言。"));
add("點想發言的同學舉手，再請主席依順序同意。");
add(H("提案討論，第三步：預測影響。"));
add("每個方案，誰最可能覺得不方便？");
add(H("提案討論，第四步：表決。"));
add("按下按鈕，看看教材示範的表決結果。");
add(H("提案討論，第五步：尊重少數。"));
add("表決的結果是分區。小米還擔心太吵，可以怎麼照顧少數？可以選很多個。");
const meetingSrc = readFileSync("src/activities/Meeting.tsx", "utf8");
const stepLines = meetingSrc.slice(meetingSrc.indexOf("const STEP_LINES"), meetingSrc.indexOf("];", meetingSrc.indexOf("const STEP_LINES")));
const step5 = "謝謝大家。表決後照著多數人的決定做，也要繼續照顧少數同學的需要。一週後帶著觀察回來討論。";
for (const t of literals(stepLines)) for (const part of ["narrator", "anan", "yu", "zhe"] as VoicePart[]) add({ part, text: t });
add({ part: "teacher", text: step5 });
for (const a of ARGUMENTS) {
  if (a.who === "me" || a.who === "yun") continue;
  add({ part: partOfLook(a.who), text: `我支持「${a.claim}」${a.reason}` });
}
add({ part: "mi", text: "我還是擔心討論區會太吵……" });
for (const id of ["mi", "hao", "zhe"]) {
  toast(`${NAME[id]}已經發言過了。`);
  toast(`${NAME[id]}已經在等待發言。`);
  toast(`${NAME[id]}舉手了，請主席依照舉手順序同意發言。`);
  toast(`收到${NAME[id]}的論點卡！`);
}
for (const p of Object.values(PREDICTION_KEY)) toast(p.why);
for (const m of MEASURES) toast(m.result);
void plans;

/* ---------- 提示訊息（原始碼中的固定字串） ---------- */
for (const file of ["src/activities/Meeting.tsx", "src/app/main.tsx"]) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/notify\(([\s\S]*?)\);/g)) for (const t of literals(m[1])) toast(t);
}
const engine = readFileSync("src/simulation/engine.ts", "utf8");
const nm = engine.slice(engine.indexOf("export function nextMeeting"), engine.indexOf("export function serviceComplete"));
for (const t of literals(nm)) toast(t);
// 首頁同學說的話
const mainSrc = readFileSync("src/app/main.tsx", "utf8");
for (const t of literals(mainSrc.slice(mainSrc.indexOf("const lines: Record<string, string>"), mainSrc.indexOf("const react ="))))
  toast(t);
toast("安安：你，今天的班會你想當什麼角色？");

/* ---------- 影響與反思 ---------- */
for (const e of [...Object.values(ENDINGS), ...Object.values(ELECTION_ENDINGS)]) for (const lv of ["high", "mid", "low"] as const) add(e[lv]);
add("接下來，看看選舉後的一週會發生什麼事。");
add("接下來，看看閱讀角試行一週會發生什麼事。");
for (const d of DAYS) add(H(`${d}。`));
const impact = readFileSync("src/simulation/meetingImpact.ts", "utf8");
for (const m of impact.matchAll(/text: "([^"]+)"/g)) add(m[1]);
add("你每一步都選了很好的做法！可以換一個角色，看看別人會遇到什麼狀況。");
add(H("如果重來一次，可以這樣做："));

process.stdout.write(JSON.stringify([...out.values()], null, 1));
