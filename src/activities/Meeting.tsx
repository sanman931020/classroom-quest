import { useEffect, useRef, useState } from "react";
import { characters, electionSteps, meetingSteps, officers, plans, sampleVotes } from "../data/content";
import {
  ARGUMENTS,
  MEASURES,
  METERS,
  PLAN_IDS,
  PREDICTION_KEY,
  ROLES,
  STAKEHOLDERS,
  decisionsFor,
  type Decision,
  type MeetingRole,
  type PlanId,
} from "../data/meetingStory";
import type { CharacterId } from "../game/types";
import { nextMeeting } from "../simulation/engine";
import {
  checkPrediction,
  computeFeelings,
  computeMeters,
  minorityCared,
  minoritySentence,
  roleEnding,
  simulateWeek,
  weekScore,
} from "../simulation/meetingImpact";
import type { MeetingExt } from "../storage/meetingExt";
import { Field, type ActivityProps } from "../components/shared";
import { PlayLayout } from "../components/PlayLayout";
import { Callout, CheckBadge, Completion, DialogueBox, PhraseChips, StepTabs, TaskHint, type Choice } from "../components/ui";
import { Icon } from "../components/icons";
import { Portrait, type Look, type Mood } from "../art/Character";
import { Classroom, SEATS, type CastMember } from "../scenes/Classroom";
import { sfx } from "../ui/sfx";
import { usePrefs } from "../ui/prefs";

export type Chapter = "election" | "proposal" | "meeting" | "impact" | "reflect";
export type MeetingProps = ActivityProps & {
  ext: MeetingExt;
  updateExt: (fn: (d: MeetingExt) => void) => void;
  goHome: () => void;
  openSheets: () => void;
  startChapter?: Chapter | null;
};

const NAME: Record<string, string> = Object.fromEntries(characters.map((c) => [c.id, c.name]));
const STEP_LINES = [
  "司儀：班會開始。",
  "主席：今天一起解決閱讀角的使用問題。",
  "班長：借書後要歸位；衛生股長：請維持閱讀角整潔。",
  "先附議，再請同學舉手輪流發言，充分討論後表決。",
  "有沒有臨時提出的新問題？",
  "主席：謝謝大家的參與，會後請林老師指導。",
];
const JOBS: Record<string, string> = Object.fromEntries(officers.map(([n, w]) => [n, w]));
const JOB_ORDER = ["學藝股長", "風紀股長", "班長", "體育股長", "衛生股長"];

export function Meeting({ s, update, notify, ext, updateExt, goHome, openSheets, startChapter }: MeetingProps) {
  const m = s.meeting;
  const e = s.election;
  const { reduced } = usePrefs();
  const proposalDone = Object.values(s.proposal).every((v) => v.trim());
  const initial: Chapter = !e.winner ? "election" : !proposalDone ? "proposal" : m.done ? "impact" : "meeting";
  const [chapter, setChapter] = useState<Chapter>(startChapter ?? initial);
  const [pickOfficer, setPickOfficer] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ title: string; text: string; good: boolean; delta: string } | null>(null);
  const [counting, setCounting] = useState<number[] | null>(null);
  const [seconding, setSeconding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);
  const [labMeasures, setLabMeasures] = useState<string[]>(ext.measures);
  const prevDone = useRef(m.done);

  useEffect(() => {
    if (!prevDone.current && m.done) setShowDone(true);
    prevDone.current = m.done;
  }, [m.done]);

  const meters = computeMeters(ext.choices, ext.measures);
  const feelings = computeFeelings(ext.choices, ext.measures);
  const role: MeetingRole = ext.role ?? "chair";
  const roleInfo = ROLES.find((r) => r.id === role)!;
  const myDecisions = decisionsFor(role);
  const decisionsAt = (step: number) => myDecisions.filter((d) => d.step === step);
  const triggerDone = (t: NonNullable<Decision["trigger"]>) => myDecisions.filter((d) => d.trigger === t).every((d) => ext.choices[d.id]);
  const pendingDecision = (step: number) => decisionsAt(step).find((d) => !ext.choices[d.id] && decisionReady(d));

  function decisionReady(d: Decision) {
    if (d.trigger === "seconded") return m.seconded && m.heard.length === 0 && !m.speaker;
    if (d.trigger === "offtopic") return m.heard.length === 1 && !m.speaker;
    if (d.trigger === "interrupt") return m.speaker === "mi";
    if (d.trigger === "quiet") return m.heard.length >= 3 && !m.speaker && !m.queue.length;
    if (d.id === "r-minority") return m.voted;
    return true;
  }

  function choose(d: Decision, optId: string) {
    const o = d.options.find((x) => x.id === optId)!;
    updateExt((x) => {
      x.choices[d.id] = optId;
      if (o.tags?.includes("yun") && !x.cards.includes("yun")) x.cards.push("yun");
      if (o.tags?.includes("me") && !x.cards.includes("me")) x.cards.push("me");
    });
    const delta = METERS.filter((mt) => o.effect[mt.id])
      .map((mt) => `${mt.label} ${o.effect[mt.id]! > 0 ? "↑" : "↓"}`)
      .join("・");
    setLastResult({ title: o.label, text: o.result, good: o.good, delta });
    sfx.play(o.good ? "success" : "invalid");
    notify(o.result);
  }

  /* ---------------- 班會程序 ---------------- */
  function next() {
    const pend = pendingDecision(m.step);
    if (pend) {
      notify("主席還有一個決定要做，請看對話框。");
      sfx.play("invalid");
      return;
    }
    const r = nextMeeting(s);
    notify(r.reason);
    if (!r.ok) {
      sfx.play("invalid");
      return;
    }
    sfx.play(m.step === 5 ? "complete" : "success");
    setLastResult(null);
    update((d) => {
      if (d.meeting.step === 5) {
        const temporary = d.meeting.minutes;
        d.meeting.done = true;
        d.meeting.minutes = `議題：${d.proposal.problem}\n提案：${d.proposal.plan}\n理由：${d.proposal.reason}\n教材示範：安靜6、分區18、輪流4票；決議分區。\n照顧少數：${d.meeting.minority}\n臨時動議：${temporary || "無"}\n一週後檢討。`;
      } else d.meeting.step++;
    });
  }

  function invite(id: CharacterId) {
    if (!m.seconded) {
      notify("先徵求附議，再展開討論。");
      sfx.play("invalid");
      return;
    }
    if (m.queue.includes(id) || m.heard.includes(id) || m.speaker === id) {
      notify(`${NAME[id]}${m.heard.includes(id) ? "已經發言過了。" : "已經在等待發言。"}`);
      return;
    }
    sfx.play("hand");
    update((d) => {
      d.meeting.queue.push(id);
    });
    notify(`${NAME[id]}舉手了，請主席依照舉手順序同意發言。`);
  }

  function grant() {
    if (pendingDecision(3)) {
      notify("先處理對話框裡的狀況，再請下一位發言。");
      sfx.play("invalid");
      return;
    }
    if (m.speaker) {
      notify("請先聆聽目前同學說完。");
      sfx.play("invalid");
      return;
    }
    if (!m.queue.length) {
      notify("目前沒有人舉手，請先邀請同學舉手。");
      sfx.play("invalid");
      return;
    }
    sfx.play("tap");
    update((d) => {
      d.meeting.speaker = d.meeting.queue.shift()!;
    });
  }

  function heard() {
    if (m.speaker === "mi" && !triggerDone("interrupt")) {
      notify("有同學插話了，主席要先處理。");
      sfx.play("invalid");
      return;
    }
    const sp = m.speaker!;
    sfx.play("success");
    update((d) => {
      d.meeting.heard.push(d.meeting.speaker!);
      d.meeting.speaker = null;
    });
    updateExt((x) => {
      if (!x.cards.includes(sp)) x.cards.push(sp);
    });
    notify(`收到${NAME[sp]}的論點卡！`);
  }

  const predictionsDone = PLAN_IDS.every((p) => ext.predictions[p]);
  function vote() {
    if (m.heard.length < 3 || m.speaker || m.queue.length) {
      notify("三種意見都聽完，才能表決。");
      sfx.play("invalid");
      return;
    }
    if (pendingDecision(3) || !triggerDone("quiet")) {
      notify("表決前，看看是不是每個人都有機會說話。");
      sfx.play("invalid");
      return;
    }
    if (!predictionsDone) {
      notify("表決前，先預測每個方案可能造成的影響。");
      sfx.play("invalid");
      return;
    }
    if (reduced) {
      update((d) => {
        d.meeting.voted = true;
      });
      notify("示範表決完成：分區方案18票通過，接著聽聽少數需要。");
      return;
    }
    let t = 0;
    const cur = [0, 0, 0];
    setCounting([...cur]);
    const iv = window.setInterval(() => {
      const i = cur.findIndex((v, k) => v < sampleVotes[k]);
      if (i < 0) {
        window.clearInterval(iv);
        setCounting(null);
        update((d) => {
          d.meeting.voted = true;
        });
        sfx.play("success");
        notify("示範表決完成：分區方案18票通過，接著聽聽少數需要。");
        return;
      }
      cur[i] += 1;
      t++;
      if (t % 2 === 0) sfx.play("tick");
      setCounting([...cur]);
    }, 55);
  }

  function toggleMeasure(id: string) {
    const meas = MEASURES.find((x) => x.id === id)!;
    const nextList = ext.measures.includes(id) ? ext.measures.filter((x) => x !== id) : [...ext.measures, id];
    updateExt((x) => {
      x.measures = nextList;
    });
    sfx.play(meas.good ? "pick" : "invalid");
    setLastResult({ title: meas.label, text: meas.result, good: meas.good, delta: "" });
    update((d) => {
      d.meeting.minority = minorityCared(nextList) ? minoritySentence(nextList) : "";
    });
  }

  /* ---------------- 選舉 ---------------- */
  function electionAction() {
    if ((e.step === 0 && !e.nominee) || (e.step === 2 && !e.vote)) {
      notify("請先選擇人選。");
      sfx.play("invalid");
      return;
    }
    if (e.step === 1 && !seconding) {
      setSeconding(true);
      sfx.play("hand");
      notify("有同學舉手附議了！附議表示一個人以上贊成這個提名。");
      return;
    }
    sfx.play(e.step === 3 ? "complete" : "success");
    update((d) => {
      if (d.election.step === 3) d.election.winner = d.election.vote;
      else d.election.step++;
    });
    if (e.step === 3) notify("選舉完成！接著完成會前提案。");
  }

  /* ---------------- 場景角色 ---------------- */
  const inMeeting = (chapter === "meeting" && !!ext.role) || chapter === "impact" || chapter === "reflect";
  const pend = chapter === "meeting" && !m.done ? pendingDecision(m.step) : undefined;
  const speakingNow: Look | null =
    chapter === "meeting" && !m.done ? (pend ? pend.speaker : m.step === 3 ? m.speaker : m.step === 0 ? "anan" : null) : null;
  const day = chapter === "impact" ? simulateWeek("B", ext.measures, ext.choices)[dayIdx] : null;
  function moodOf(id: CharacterId): Mood {
    if (speakingNow === id) return "talking";
    if (day && day.who === id) return day.mood === "happy" ? "happy" : day.mood === "sad" ? "worried" : "thinking";
    if (chapter === "meeting" && id === "mi" && m.voted && !minorityCared(ext.measures)) return "worried";
    const f = feelings[id];
    return f === "idle" ? "idle" : f;
  }
  const handsUp = counting ? counting.reduce((a, b) => a + b, 0) % 3 : -1;
  const cast: CastMember[] = [];
  const studentSeat: Partial<Record<CharacterId, number>> = { mi: 1, hao: 6 };
  const canInvite = chapter === "meeting" && m.step === 3 && !m.voted;
  (["mi", "hao"] as CharacterId[]).forEach((id) => {
    const seat = SEATS[studentSeat[id]!];
    const speaking = m.speaker === id;
    const queued = m.queue.includes(id);
    const doneTalk = m.heard.includes(id);
    cast.push({
      key: id,
      look: id,
      gx: speaking ? seat.gx - 0.6 : seat.gx,
      gy: seat.gy,
      pose: speaking ? "stand" : queued || (id === "hao" && pend?.trigger === "interrupt") || (counting && handsUp === studentSeat[id]! % 3) ? "raise" : "sit",
      mood: moodOf(id),
      marker: canInvite ? (queued ? "hand" : speaking ? "talk" : doneTalk ? "check" : m.seconded ? "idea" : null) : null,
      label: canInvite ? `邀請${NAME[id]}舉手發言` : undefined,
      onActivate: canInvite ? () => invite(id) : undefined,
    });
  });
  // 角色站位依玩家選擇的班會角色調整
  const POS = {
    chairSpot: { gx: 0.85, gy: 5.05 },
    emceeSpot: { gx: 1.4, gy: 7.3 },
    recSpot: { gx: 1.72, gy: 2.2 },
  };
  const zheSpeaking = m.speaker === "zhe";
  const zheBase = role === "recorder" ? SEATS[0] : POS.recSpot;
  cast.push({
    key: "zhe",
    look: "zhe",
    gx: zheSpeaking ? zheBase.gx + (role === "recorder" ? -0.6 : 0.6) : zheBase.gx,
    gy: zheBase.gy,
    pose: zheSpeaking ? "stand" : m.queue.includes("zhe") ? "raise" : "sit",
    mood: moodOf("zhe"),
    sash: role === "recorder" ? undefined : "#65afa5",
    marker: canInvite ? (m.queue.includes("zhe") ? "hand" : zheSpeaking ? "talk" : m.heard.includes("zhe") ? "check" : m.seconded ? "idea" : null) : null,
    label: canInvite ? "邀請阿哲舉手發言" : undefined,
    onActivate: canInvite ? () => invite("zhe") : undefined,
  });
  const ananSpot = role === "chair" ? POS.emceeSpot : POS.chairSpot;
  cast.push({ key: "anan", look: "anan", ...ananSpot, pose: speakingNow === "anan" ? "point" : "stand", mood: moodOf("anan"), sash: role === "chair" ? "#d6b563" : "#e98a7c" });
  const playerSpot = role === "chair" ? POS.chairSpot : role === "emcee" ? POS.emceeSpot : role === "recorder" ? POS.recSpot : SEATS[5];
  cast.push({
    key: "player",
    look: "player",
    ...playerSpot,
    pose: role === "recorder" || role === "student" ? (role === "student" && pend?.trigger === "quiet" ? "raise" : "sit") : chapter === "meeting" && m.voted && role === "chair" ? "raise" : "stand",
    mood: "idle",
    sash: role === "chair" ? "#e98a7c" : role === "emcee" ? "#d6b563" : "#65afa5",
    marker: chapter === "meeting" && !m.done && pend ? "talk" : null,
  });
  if (role === "recorder" || role === "student") cast.push({ key: "emcee", look: "npc0", ...POS.emceeSpot, pose: m.step === 0 ? "point" : "stand", mood: "idle", sash: "#d6b563" });
  cast.push({ key: "teacher", look: "teacher", gx: 12.1, gy: 6.6, mood: moodOf("teacher"), pose: m.done ? "wave" : "stand" });
  const cards_yun = ext.cards.includes("yun");
  SEATS.forEach((seat, i) => {
    if (i === 1 || i === 6 || (role === "recorder" && i === 0) || (role === "student" && (i === 0 || i === 5))) return;
    const electionHands = chapter === "election" && (e.step === 2 || (e.step === 1 && seconding)) && i % (e.step === 1 ? 4 : 2) === 0;
    const voteHands = counting && i % 3 === handsUp;
    const yun = i === 9;
    cast.push({
      key: `npc${i}`,
      look: `npc${i}`,
      gx: yun && cards_yun && chapter === "meeting" && m.step === 3 && !m.voted ? seat.gx - 0.6 : seat.gx,
      gy: seat.gy,
      pose: electionHands || voteHands ? "raise" : yun && cards_yun && chapter === "meeting" && m.step === 3 && !m.voted ? "stand" : "sit",
      mood: pend?.trigger === "quiet" && yun ? "thinking" : "idle",
      marker: pend?.trigger === "quiet" && yun ? "idea" : null,
    });
  });

  const voteRows = plans.map((p, i) => ({
    label: ["A 安靜", "B 分區", "C 輪流"][i],
    value: counting ? counting[i] : m.voted ? sampleVotes[i] : null,
  }));
  const electionRows =
    e.step >= 3 || e.winner
      ? [
          { label: e.vote || "安安", value: 16 },
          { label: e.vote === "阿哲" ? "安安" : "阿哲", value: 12 },
        ]
      : null;
  const board =
    chapter === "election"
      ? { title: "選舉班長", lines: electionSteps, current: e.winner ? undefined : e.step, note: "候選：安安・阿哲" }
      : chapter === "proposal"
        ? { title: "會前提案", lines: ["問題：" + (s.proposal.problem || "＿＿"), "提案：" + (s.proposal.plan || "＿＿"), "理由：" + (s.proposal.reason || "＿＿")] }
        : { title: "三年二班 班會", lines: meetingSteps, current: m.done ? undefined : m.step, note: "議題：閱讀角怎麼用？" };

  /* ---------------- 對話框 ---------------- */
  let dialogue: React.ReactNode = null;
  if (chapter === "meeting" && !m.done) {
    if (pend)
      dialogue = (
        <DialogueBox
          speaker={pend.speaker}
          name={NAME[pend.speaker]}
          role={pend.speaker === "anan" ? (role === "chair" ? "司儀" : "主席") : pend.speaker === "zhe" ? "衛生股長" : pend.speaker === "teacher" ? "導師" : "同學"}
          text={pend.prompt}
          progress={`你是${roleInfo.name}：${pend.question}`}
          choices={pend.options.map((o) => ({ label: o.label, onSelect: () => choose(pend, o.id) }))}
        />
      );
    else if (m.step === 3 && m.speaker) {
      const card = ARGUMENTS.find((a) => a.who === m.speaker)!;
      dialogue = (
        <DialogueBox
          speaker={m.speaker}
          name={NAME[m.speaker]}
          role="發言中"
          text={`我支持「${card.claim}」${card.reason}`}
          choices={[{ label: "我聽完了", primary: true, icon: "ear", onSelect: heard }]}
        />
      );
    } else if (m.step === 3 && m.voted && !minorityCared(ext.measures))
      dialogue = <DialogueBox speaker="mi" name="小米" role="少數意見" mood="worried" text="我還是擔心討論區會太吵……" progress="請在右側選擇照顧少數的做法" />;
    else if (m.step !== 3)
      dialogue = (
        <DialogueBox
          speaker={m.step === 0 ? (role === "emcee" ? "player" : role === "recorder" ? "npc0" : "anan") : m.step === 5 ? "teacher" : m.step === 2 ? "zhe" : role === "chair" ? "player" : "anan"}
          name={m.step === 0 ? (role === "emcee" ? "司儀（你）" : role === "recorder" ? "小宇" : "安安") : m.step === 5 ? "林老師" : m.step === 2 ? "阿哲" : role === "chair" ? "主席（你）" : "安安"}
          role={m.step === 0 ? "司儀" : m.step === 5 ? "會後指導" : m.step === 2 ? "股長報告" : "主席"}
          text={m.step === 5 ? "謝謝大家。表決後照著多數人的決定做，也要繼續照顧少數同學的需要。一週後帶著觀察回來討論。" : STEP_LINES[m.step]}
          progress={`程序 ${m.step + 1}／6`}
        />
      );
  }

  /* ---------------- 面板內容 ---------------- */
  const tabs = (
    <StepTabs<Chapter>
      label="班會大挑戰章節"
      current={chapter}
      onSelect={setChapter}
      steps={[
        { id: "election", label: "幹部選舉", done: !!e.winner },
        { id: "proposal", label: "提出問題", done: proposalDone },
        { id: "meeting", label: "召開班會", done: m.done },
        { id: "impact", label: "觀察影響", done: m.done },
        { id: "reflect", label: "修正反思", done: m.done && !!ext.reflection.trim() },
      ]}
    />
  );

  const resultCard = lastResult && (
    <div className={`impact-card ${lastResult.good ? "is-good" : "is-think"}`} role="note">
      <div className="impact-head">
        <Icon name={lastResult.good ? "check" : "bulb"} size={20} />
        <b>{lastResult.good ? "這樣做的影響" : "想一想：可能的影響"}</b>
      </div>
      <p>{lastResult.text}</p>
      {lastResult.delta && <small className="impact-delta">{lastResult.delta}</small>}
    </div>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode = null;
  if (chapter === "election") {
    const matchedAll = ext.officers.length === officers.length;
    body = (
      <>
        <h2 className="mission-title">認識幹部，選出班長</h2>
        <Callout kind="detective" title="任務配對：幹部做什麼？">
          <p className="small">先點幹部，再點他的工作。</p>
          <div className="match-grid">
            <div className="match-col" role="group" aria-label="幹部">
              {officers.map(([n]) => (
                <button
                  key={n}
                  className={`match-chip ${pickOfficer === n ? "is-picked" : ""} ${ext.officers.includes(n) ? "is-done" : ""}`}
                  aria-pressed={pickOfficer === n}
                  disabled={ext.officers.includes(n)}
                  onClick={() => {
                    sfx.play("pick");
                    setPickOfficer(n);
                  }}
                >
                  {ext.officers.includes(n) && <Icon name="check" size={16} />}
                  {n}
                </button>
              ))}
            </div>
            <div className="match-col" role="group" aria-label="工作">
              {JOB_ORDER.map((n) => (
                <button
                  key={n}
                  className={`match-chip job ${ext.officers.includes(n) ? "is-done" : ""}`}
                  disabled={ext.officers.includes(n)}
                  onClick={() => {
                    if (!pickOfficer) {
                      notify("請先點一位幹部。");
                      return;
                    }
                    if (pickOfficer === n) {
                      sfx.play("success");
                      updateExt((x) => {
                        if (!x.officers.includes(n)) x.officers.push(n);
                      });
                      notify(`答對了！${n}：${JOBS[n]}。`);
                    } else {
                      sfx.play("invalid");
                      notify(`再想想：「${JOBS[n]}」比較像哪一位幹部的工作？`);
                    }
                    setPickOfficer(null);
                  }}
                >
                  {JOBS[n]}
                </button>
              ))}
            </div>
          </div>
          {matchedAll && <p className="success-line"><Icon name="check" size={18} /> 幹部是為大家服務的人！</p>}
        </Callout>
        <h3 className="sub-title">選舉流程</h3>
        <ol className="flow">
          {electionSteps.map((v, i) => (
            <li key={v} className={e.winner || i < e.step ? "is-done" : i === e.step ? "is-current" : ""}>
              {v}
            </li>
          ))}
        </ol>
        {!e.winner ? (
          <div className="election-box">
            {e.step === 0 || e.step === 2 ? (
              <label className="field">
                <span className="field-label">{e.step === 2 ? "我的舉手支持" : "提名班長（任期：本次教學演練）"}</span>
                <select
                  value={e.step === 2 ? e.vote : e.nominee}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    update((d) => {
                      if (d.election.step === 2) d.election.vote = v;
                      else d.election.nominee = v;
                    });
                  }}
                >
                  <option value="">請選擇</option>
                  <option>安安</option>
                  <option>阿哲</option>
                </select>
              </label>
            ) : null}
            {e.step === 1 && (
              <div className="compare">
                <div className="compare-card">
                  <Portrait look="anan" mood="happy" size={48} />
                  <p><b>安安</b>「我會每天確認值日表。」</p>
                </div>
                <div className="compare-card">
                  <Portrait look="zhe" mood="happy" size={48} />
                  <p><b>阿哲</b>「我會清楚記錄大家的需求。」</p>
                </div>
                <Callout kind="note" title="知識便利貼">
                  附議：表示一個人以上贊成這個提議，以舉手或口頭表達。
                </Callout>
              </div>
            )}
            {e.step === 3 && <p className="sim-note">教學模擬：你支持的「{e.vote}」獲16票，另一位12票。不是實際學生投票。</p>}
          </div>
        ) : (
          <p className="success-line">
            <Icon name="check" size={18} /> 本次教學模擬班長：{e.winner}。每一位同學都有服務的機會。
          </p>
        )}
      </>
    );
    footer = !e.winner ? (
      <button className="btn btn-primary wide" onClick={electionAction}>
        {e.step === 1 && !seconding ? "徵求附議" : ["確認提名", "我附議，完成討論", "舉手支持", "宣布選舉結果"][e.step]}
      </button>
    ) : (
      <button className="btn btn-primary wide" onClick={() => setChapter("proposal")}>
        下一步：會前提案 <Icon name="next" size={20} />
      </button>
    );
  } else if (chapter === "proposal") {
    body = (
      <>
        <h2 className="mission-title">我的提案單</h2>
        <span className="tag">學習單②・會前完成</span>
        <p className="small">提案要在會議前提出。可以自己寫，也可以點引導句。</p>
        {(
          [
            ["problem", "我發現的問題", ["午休時閱讀角有聲音", "有書沒有放回原位", "大家想用閱讀角的方式不一樣"]],
            ["plan", "我的提案", ["分成安靜區和討論區", "每天輪流使用", "訂一條閱讀角公約"]],
            ["reason", "我的理由", ["讓想安靜和想討論的人都有地方", "這樣比較公平", "大家都能好好看書"]],
          ] as const
        ).map(([key, label, ph]) => (
          <div key={key} className="proposal-field">
            <Field
              label={label}
              value={s.proposal[key]}
              onChange={(v) =>
                update((d) => {
                  d.proposal[key] = v;
                })
              }
            />
            <PhraseChips label={`${label}引導句`} phrases={[...ph]} onPick={(p) => update((d) => { d.proposal[key] = p; })} />
          </div>
        ))}
        <div className="checks-row">
          <CheckBadge ok={!!s.proposal.problem.trim()}>問題</CheckBadge>
          <CheckBadge ok={!!s.proposal.plan.trim()}>提案</CheckBadge>
          <CheckBadge ok={!!s.proposal.reason.trim()}>理由</CheckBadge>
        </div>
        <p className="small muted">系統只檢查是否填寫完整，不判斷內容好壞；寫得好不好，可以和老師、同學一起討論。</p>
      </>
    );
    footer = (
      <button className="btn btn-primary wide" disabled={!proposalDone || !e.winner} onClick={() => setChapter("meeting")}>
        {!e.winner ? "先完成幹部選舉" : proposalDone ? "帶著提案去開班會" : "請填完三個欄位"} <Icon name="next" size={20} />
      </button>
    );
  } else if (chapter === "meeting" && !ext.role) {
    body = (
      <>
        <h2 className="mission-title">選擇你的班會角色</h2>
        <p className="small">每個角色會遇到不同的任務和選擇，也會有不同的結果。</p>
        <div className="role-picker" role="group" aria-label="班會角色">
          {ROLES.map((r) => (
            <button
              key={r.id}
              className="role-card"
              onClick={() => {
                sfx.play("success");
                updateExt((x) => {
                  x.role = r.id;
                });
                notify(`你是${r.name}！${r.tip}`);
              }}
            >
              <Portrait look="player" mood="happy" size={52} />
              <span>
                <b>{r.name}</b>
                <small>{r.duty}</small>
                <small className="muted">{r.tip}</small>
              </span>
            </button>
          ))}
        </div>
        <Callout kind="note" title="知識便利貼">
          班會中，主席主持、司儀宣布程序、記錄記下內容；每位同學都可以舉手發言，參加討論。
        </Callout>
      </>
    );
    footer = null;
  } else if (chapter === "meeting") {
    const stepDecisions = decisionsAt(m.step);
    body = (
      <>
        <div className="roles-row">
          {(role === "chair"
            ? [["player", "主席", "你：主持會議"], ["anan", "司儀", "安安：宣布程序"], ["zhe", "記錄", "阿哲：記錄內容"]]
            : role === "emcee"
              ? [["anan", "主席", "安安：主持會議"], ["player", "司儀", "你：宣布程序"], ["zhe", "記錄", "阿哲：記錄內容"]]
              : role === "recorder"
                ? [["anan", "主席", "安安：主持會議"], ["npc0", "司儀", "小宇：宣布程序"], ["player", "記錄", "你：記錄內容"]]
                : [["anan", "主席", "安安"], ["npc0", "司儀", "小宇"], ["player", "學生", "你：參加討論"]]
          ).map(([l, r, t]) => (
            <div key={r} className={`role-chip ${l === "player" ? "is-me" : ""}`}>
              <Portrait look={l as Look} size={38} />
              <span>
                <b>{r}</b>
                <small>{t}</small>
              </span>
            </div>
          ))}
        </div>
        <ol className="agenda" aria-label="班會程序">
          {meetingSteps.map((v, i) => (
            <li key={v} className={m.done || i < m.step ? "is-done" : i === m.step ? "is-current" : ""}>
              <button
                className="agenda-btn"
                onClick={() => notify(i === m.step ? `目前：${v}。請完成此程序。` : "請依序完成目前程序，再前進。")}
              >
                <span className="agenda-num">{m.done || i < m.step ? <Icon name="check" size={14} /> : i + 1}</span>
                {v}
              </button>
            </li>
          ))}
        </ol>
        {m.done ? (
          <p className="success-line"><Icon name="check" size={18} /> 班會已完成，去看看「決定的影響」。</p>
        ) : (
          <>
            {resultCard}
            {stepDecisions.map((d) =>
              ext.choices[d.id] ? (
                <p key={d.id} className="decision-made">
                  <Icon name={d.options.find((o) => o.id === ext.choices[d.id])!.good ? "check" : "bulb"} size={16} />
                  主席決定：{d.options.find((o) => o.id === ext.choices[d.id])!.label}
                </p>
              ) : null,
            )}
            {m.step === 3 && (
              <div className="discussion">
                <h3 className="sub-title">提案討論</h3>
                <p className="proposal-show">
                  <b>提案：</b>
                  {s.proposal.plan}
                </p>
                <button
                  className={`btn ${m.seconded ? "btn-done" : "btn-soft"}`}
                  disabled={m.seconded}
                  onClick={() => {
                    sfx.play("hand");
                    update((d) => {
                      d.meeting.seconded = true;
                    });
                    notify("小米已附議，現在邀請大家舉手。");
                  }}
                >
                  <Icon name={m.seconded ? "check" : "hand"} size={20} />
                  {m.seconded ? "已附議" : "徵求附議"}
                </button>
                <div className="queue">
                  <span className="small">想發言的同學（點教室裡的人，或這裡）：</span>
                  <div className="queue-people">
                    {(["mi", "hao", "zhe"] as CharacterId[]).map((id) => (
                      <button
                        key={id}
                        className={`person-chip ${m.heard.includes(id) ? "is-done" : m.queue.includes(id) ? "is-queued" : ""}`}
                        disabled={m.voted}
                        onClick={() => invite(id)}
                      >
                        <Portrait look={id} size={34} />
                        <span>
                          {NAME[id]}
                          <small>{m.heard.includes(id) ? "已發言" : m.speaker === id ? "發言中" : m.queue.includes(id) ? `舉手第${m.queue.indexOf(id) + 1}位` : "舉手申請"}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-soft wide" disabled={m.voted} onClick={grant}>
                    <Icon name="hand" size={20} /> {role === "chair" ? "主席同意下一位發言" : "主席請下一位發言"}
                  </button>
                </div>
                {ext.cards.length > 0 && (
                  <div className="arg-cards">
                    <h3 className="sub-title">論點卡（{ext.cards.length}）</h3>
                    {ARGUMENTS.filter((a) => ext.cards.includes(a.id)).map((a) => (
                      <div key={a.id} className={`arg-card plan-${a.plan ?? "all"}`}>
                        <div className="arg-who">
                          <Portrait look={a.who === "yun" ? "npc9" : a.who === "me" ? "player" : a.who} size={30} />
                          <b>{a.name}</b>
                          <span className="arg-plan">{a.plan ? `方案${a.plan}` : "共同提醒"}</span>
                        </div>
                        <p><span className="arg-k">主張</span>{a.claim}</p>
                        <p><span className="arg-k">理由</span>{a.reason}</p>
                        <p><span className="arg-k impact">可能影響</span>{a.impact}</p>
                      </div>
                    ))}
                  </div>
                )}
                {triggerDone("quiet") && m.heard.length >= 3 && (
                  <div className="predict">
                    <h3 className="sub-title">影響預測：哪一種同學最可能覺得不方便？</h3>
                    {PLAN_IDS.map((p, i) => {
                      const v = ext.predictions[p];
                      const ok = v ? checkPrediction(p, v) : false;
                      return (
                        <div key={p} className="predict-row">
                          <b>{p}. {plans[i]}</b>
                          <div className="predict-options" role="group" aria-label={`方案${p}的影響預測`}>
                            {STAKEHOLDERS.map((st) => (
                              <button
                                key={st.id}
                                className={`chip ${v === st.id ? (ok ? "is-ok" : "is-think") : ""}`}
                                aria-pressed={v === st.id}
                                disabled={m.voted}
                                onClick={() => {
                                  const good = checkPrediction(p, st.id);
                                  sfx.play(good ? "success" : "invalid");
                                  updateExt((x) => {
                                    x.predictions[p] = st.id;
                                  });
                                  notify(good ? PREDICTION_KEY[p].why : "再想想：這個方案改變了什麼？誰的需要比較難被照顧？");
                                }}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                          {v && <small className={ok ? "ok-text" : "think-text"}>{ok ? PREDICTION_KEY[p].why : "可以再想想，也可以改選。"}</small>}
                        </div>
                      );
                    })}
                    <p className="small muted">每個方案都有優點和限制，沒有唯一的標準答案。</p>
                  </div>
                )}
                <button className="btn btn-primary wide" disabled={m.voted || !!counting} onClick={vote}>
                  <Icon name="hand" size={20} /> {m.voted ? "已完成表決" : counting ? "計票中…" : "進行教材示範表決"}
                </button>
                {(m.voted || counting) && (
                  <div className="votes">
                    <p className="sim-note">教材固定示範・共28票・不是實際學生投票結果</p>
                    {plans.map((v, i) => (
                      <div key={v} className={`vote-row ${m.voted && i === 1 ? "is-win" : ""}`}>
                        <span>{["A", "B", "C"][i]}. {v}</span>
                        <meter aria-label={v} max={28} value={counting ? counting[i] : sampleVotes[i]} />
                        <b>{counting ? counting[i] : sampleVotes[i]} 票</b>
                      </div>
                    ))}
                    {m.voted && <p className="success-line"><Icon name="flag" size={18} /> 決議：閱讀角分成安靜區和討論區。</p>}
                  </div>
                )}
                {m.voted && (
                  <div className="minority">
                    <h3 className="sub-title">服從多數，也尊重少數</h3>
                    <p className="small">小米還擔心太吵。你會怎麼照顧少數？（可以選很多個）</p>
                    <div className="measure-list">
                      {MEASURES.map((ms) => (
                        <button
                          key={ms.id}
                          className={`measure ${ext.measures.includes(ms.id) ? (ms.good ? "is-on" : "is-bad") : ""}`}
                          aria-pressed={ext.measures.includes(ms.id)}
                          onClick={() => toggleMeasure(ms.id)}
                        >
                          <Icon name={ext.measures.includes(ms.id) ? "check" : "starOutline"} size={18} />
                          {ms.label}
                        </button>
                      ))}
                    </div>
                    <Field
                      label="小米還擔心太吵，你會如何照顧少數？"
                      value={m.minority}
                      placeholder="選擇上面的做法，或自己寫"
                      onChange={(v) =>
                        update((d) => {
                          d.meeting.minority = v;
                        })
                      }
                    />
                  </div>
                )}
              </div>
            )}
            {m.step === 4 && (
              <Field
                label="臨時動議紀錄（沒有可填無）"
                value={m.minutes}
                onChange={(v) =>
                  update((d) => {
                    d.meeting.minutes = v;
                  })
                }
              />
            )}
          </>
        )}
      </>
    );
    footer = m.done ? (
      <button className="btn btn-primary wide" onClick={() => setChapter("impact")}>
        看看決定的影響 <Icon name="next" size={20} />
      </button>
    ) : (
      <button className="btn btn-primary wide" onClick={next}>
        {m.step === 5 ? "宣布散會並儲存決議" : "完成目前程序"}
      </button>
    );
  } else if (chapter === "impact") {
    const week = simulateWeek("B", ext.measures, ext.choices);
    const made = myDecisions.filter((d) => ext.choices[d.id]);
    const ending = roleEnding(role, ext.choices, ext.measures);
    body = (
      <>
        <h2 className="mission-title">觀察：我的決定帶來什麼影響？</h2>
        {!m.done && <TaskHint icon="lock">完成班會後，這裡會模擬一週試行的情形。</TaskHint>}
        {m.done && (
          <div className={`ending-card level-${ending.level}`}>
            <div className="ending-head">
              <Portrait look="player" mood={ending.level === "low" ? "thinking" : "happy"} size={48} />
              <div>
                <small>我扮演的角色</small>
                <b>{roleInfo.name}</b>
              </div>
              <span className="ending-stars" aria-label={`好做法 ${ending.good}／${ending.total}`}>
                {[0, 1, 2].map((i) => (
                  <Icon key={i} name={i < (ending.level === "high" ? 3 : ending.level === "mid" ? 2 : 1) ? "star" : "starOutline"} size={20} />
                ))}
              </span>
            </div>
            <p>{ending.text}</p>
          </div>
        )}
        <h3 className="sub-title">我（{roleInfo.name}）做的決定</h3>
        <ul className="decision-log">
          {made.map((d) => {
            const o = d.options.find((x) => x.id === ext.choices[d.id])!;
            return (
              <li key={d.id} className={o.good ? "is-good" : "is-think"}>
                <Icon name={o.good ? "check" : "bulb"} size={16} />
                <div>
                  <b>{meetingSteps[d.step]}：</b>
                  {o.label}
                  <small>{o.result}</small>
                </div>
              </li>
            );
          })}
          {made.length === 0 && <li className="muted">還沒有做出決定。</li>}
        </ul>
        {m.done && (
          <>
            <h3 className="sub-title">一週試行模擬（決議：分區）</h3>
            <div className="week-strip" role="group" aria-label="一週模擬">
              {week.map((d, i) => (
                <button
                  key={d.day}
                  className={`day-chip mood-${d.mood} ${dayIdx === i ? "is-current" : ""}`}
                  aria-pressed={dayIdx === i}
                  onClick={() => {
                    sfx.play("page");
                    setDayIdx(i);
                  }}
                >
                  <Icon name={d.mood === "happy" ? "faceHappy" : d.mood === "ok" ? "faceOk" : "faceSad"} size={26} />
                  <span>{d.day.slice(2)}</span>
                  <span className="sr-only">{d.mood === "happy" ? "笑臉" : d.mood === "ok" ? "普通" : "難過"}</span>
                </button>
              ))}
            </div>
            <p className="day-text">
              <b>{week[dayIdx].day}：</b>
              {week[dayIdx].text}
            </p>
            <p className="small">一週有 {weekScore(week)} 天是笑臉。這是依你的決定做的模擬，真實班級還要實際試行。</p>
          </>
        )}
      </>
    );
    footer = (
      <button className="btn btn-primary wide" disabled={!m.done} onClick={() => setChapter("reflect")}>
        下一步：修正與反思 <Icon name="next" size={20} />
      </button>
    );
  } else {
    const lab = simulateWeek(ext.whatIf, labMeasures, ext.choices);
    const now = simulateWeek("B", ext.measures, ext.choices);
    const changed = labMeasures.slice().sort().join() !== ext.measures.filter((x) => x !== "ignore").sort().join();
    body = (
      <>
        <h2 className="mission-title">修正與反思</h2>
        {!m.done && <TaskHint icon="lock">完成班會後才能修正與反思。</TaskHint>}
        {m.done && (
          <>
            <Callout kind="radar" title="如果當初……（模擬實驗室）">
              <p className="small">換一個方案或配套措施，比較一週的結果。這是模擬，不是真實結果。</p>
              <div className="lab-plans" role="group" aria-label="選擇方案">
                {PLAN_IDS.map((p, i) => (
                  <button
                    key={p}
                    className={`chip ${ext.whatIf === p ? "is-ok" : ""}`}
                    aria-pressed={ext.whatIf === p}
                    onClick={() =>
                      updateExt((x) => {
                        x.whatIf = p as PlanId;
                      })
                    }
                  >
                    {p}. {plans[i]}
                  </button>
                ))}
              </div>
              <div className="lab-measures">
                {MEASURES.filter((x) => x.good).map((ms) => (
                  <label key={ms.id} className="check">
                    <input
                      type="checkbox"
                      checked={labMeasures.includes(ms.id)}
                      onChange={() => setLabMeasures((l) => (l.includes(ms.id) ? l.filter((x) => x !== ms.id) : [...l, ms.id]))}
                    />
                    {ms.label}
                  </label>
                ))}
              </div>
              <div className="lab-result">
                {lab.map((d) => (
                  <div key={d.day} className={`lab-day mood-${d.mood}`}>
                    <Icon name={d.mood === "happy" ? "faceHappy" : d.mood === "ok" ? "faceOk" : "faceSad"} size={20} />
                    <span>
                      <b>{d.day.slice(2)}</b> {d.text}
                    </span>
                  </div>
                ))}
                <p className="small">
                  笑臉：實驗 {weekScore(lab)} 天／目前決議 {weekScore(now)} 天
                </p>
              </div>
              <button
                className="btn btn-soft wide"
                disabled={!changed || labMeasures.length === 0}
                onClick={() => {
                  updateExt((x) => {
                    x.measures = [...labMeasures];
                  });
                  update((d) => {
                    d.meeting.minority = minoritySentence(labMeasures);
                  });
                  sfx.play("success");
                  notify("已修正照顧少數的配套措施，回到「觀察影響」看看新的一週。");
                }}
              >
                <Icon name="check" size={20} /> 採用這些配套措施，修正決議
              </button>
            </Callout>
            <Field
              label="我的反思：在班會中，我學到什麼？"
              value={ext.reflection}
              rows={3}
              placeholder="例如：表決以後，也要問問少數同學還有什麼困難。"
              onChange={(v) =>
                updateExt((x) => {
                  x.reflection = v;
                })
              }
            />
            <PhraseChips
              label="反思引導句"
              phrases={["發言前要先舉手", "服從多數也要尊重少數", "對事不對人", "決定後可以再檢討修正"]}
              onPick={(p) =>
                updateExt((x) => {
                  x.reflection = x.reflection ? `${x.reflection}；${p}` : p;
                })
              }
            />
            <div className="feedback">
              <h3>會議紀錄</h3>
              <pre>{m.minutes}</pre>
            </div>
          </>
        )}
      </>
    );
    footer = (
      <div className="foot-row">
        <button className="btn btn-soft" onClick={openSheets}>
          <Icon name="sheet" size={20} /> 學習單
        </button>
        {m.done && (
          <button
            className="btn btn-primary"
            onClick={() => {
              update((d) => {
                d.meeting = { step: 0, heard: [], queue: [], speaker: null, seconded: false, voted: false, minority: "", minutes: "", done: false };
              });
              updateExt((x) => {
                x.role = null;
                x.choices = {};
                x.predictions = {};
                x.measures = [];
                x.cards = [];
              });
              setLabMeasures([]);
              setLastResult(null);
              setDayIdx(0);
              setChapter("meeting");
              notify("換個角色再開一次班會，看看不同的決定會帶來什麼結果。");
            }}
          >
            <Icon name="reset" size={20} /> 換角色重新演練
          </button>
        )}
      </div>
    );
  }

  const sceneOverlay = (
    <>
      {inMeeting && (
        <div className="meters" aria-label="班級氣氛">
          {METERS.map((mt) => (
            <div key={mt.id} className="meter" title={mt.hint}>
              <span>{mt.label}</span>
              <div className="meter-bar">
                <i style={{ width: `${meters[mt.id]}%` }} className={meters[mt.id] >= 70 ? "hi" : meters[mt.id] < 50 ? "lo" : ""} />
              </div>
              <b>{meters[mt.id]}</b>
            </div>
          ))}
        </div>
      )}
      {chapter === "meeting" && !m.done && (
        <div className="scene-chip">
          程序 {m.step + 1}／6：{meetingSteps[m.step]}
        </div>
      )}
      {chapter === "impact" && m.done && (
        <div className="scene-chip">
          {simulateWeek("B", ext.measures, ext.choices)[dayIdx].day}・一週試行模擬
        </div>
      )}
      {dialogue && <div className="dialogue-slot">{dialogue}</div>}
      {showDone && (
        <Completion
          title="班會完成！"
          subtitle={`你以「${roleInfo.name}」的身分，完成了一場六個程序的班會。`}
          cast={["anan", "zhe", "mi", "hao", "teacher"]}
          actions={[
            { label: "觀察決定的影響", primary: true, icon: "next", onSelect: () => { setShowDone(false); setChapter("impact"); } },
            { label: "查看學習單", icon: "sheet", onSelect: () => { setShowDone(false); openSheets(); } },
            { label: "回主選單", icon: "home", onSelect: () => { setShowDone(false); goHome(); } },
          ] as Choice[]}
        >
          <div className="mini-meters">
            {METERS.map((mt) => (
              <span key={mt.id}>
                {mt.label} <b>{meters[mt.id]}</b>
              </span>
            ))}
          </div>
        </Completion>
      )}
    </>
  );

  return (
    <PlayLayout
      label="班會任務面板"
      tabs={tabs}
      footer={footer}
      scene={
        <Classroom
          mode="meeting"
          camera="front"
          positions={s.positions}
          cast={cast}
          ariaLabel="三年二班教室・班會佈置"
          board={board}
          proposalCard={chapter !== "election" ? { problem: s.proposal.problem, plan: s.proposal.plan } : null}
          voteBoard={
            chapter === "election"
              ? electionRows
                ? { title: "班長選舉（模擬）", rows: electionRows, highlight: 0 }
                : null
              : { title: "表決（教材示範）", rows: voteRows, highlight: m.voted ? 1 : undefined }
          }
        />
      }
      sceneOverlay={sceneOverlay}
    >
      {body}
    </PlayLayout>
  );
}
