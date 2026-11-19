import { useEffect, useRef, useState } from "react";
import { characters, meetingSteps, officers, plans, sampleVotes } from "../data/content";
import {
  ARGUMENTS,
  MEASURES,
  METERS,
  PLAN_IDS,
  PREDICTION_KEY,
  ROLES,
  STAKEHOLDERS,
  TOPICS,
  type Decision,
  type MeetingRole,
  type PlanId,
  type TopicId,
} from "../data/meetingStory";
import type { CharacterId } from "../game/types";
import { nextMeeting } from "../simulation/engine";
import {
  ALL_DECISIONS,
  checkPrediction,
  computeFeelings,
  computeMeters,
  minorityCared,
  minoritySentence,
  roleEnding,
  simulateElectionWeek,
  simulateWeek,
  weekScore,
} from "../simulation/meetingImpact";
import { displayClass, displayName, type MeetingExt } from "../storage/meetingExt";
import { Field, type ActivityProps } from "../components/shared";
import { PlayLayout } from "../components/PlayLayout";
import { Callout, CheckBadge, Completion, DialogueBox, PhraseChips, StepTabs, TaskHint, type Choice } from "../components/ui";
import { Icon } from "../components/icons";
import { Portrait, type Look, type Mood } from "../art/Character";
import { SEATS, type CastMember } from "../scenes/Classroom";
import { MeetingScene } from "../scenes3d/MeetingScene";
import { sfx } from "../ui/sfx";
import { usePrefs } from "../ui/prefs";

export type Chapter = "topic" | "election" | "proposal" | "meeting" | "impact" | "reflect";
export type MeetingProps = ActivityProps & {
  ext: MeetingExt;
  updateExt: (fn: (d: MeetingExt) => void) => void;
  goHome: () => void;
  openSheets: () => void;
  openHandbook: () => void;
  startChapter?: Chapter | null;
};

const NAME: Record<string, string> = { ...Object.fromEntries(characters.map((c) => [c.id, c.name])), npc0: "小宇", npc9: "小芸" };
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
const ROLE_SASH: Record<MeetingRole, string> = { chair: "#e98a7c", emcee: "#d6b563", recorder: "#65afa5", student: "" };
const POS = {
  chairSpot: { gx: 0.85, gy: 5.05 },
  emceeSpot: { gx: 1.4, gy: 7.3 },
  recSpot: { gx: 1.72, gy: 2.2 },
};

/** 對話台詞前綴決定說話者（例如「（主席）」） */
function speakerOf(d: Decision, topic: TopicId, role: MeetingRole): { look: Look; name: string; role: string; text: string } {
  const m = d.prompt.match(/^（(主席安安|主席|司儀安安|司儀)）/);
  const text = m ? d.prompt.slice(m[0].length) : d.prompt;
  if (m) {
    if (m[1].startsWith("主席")) {
      if (topic === "election") return { look: "npc0", name: "小宇", role: "主席", text };
      return { look: "anan", name: "安安", role: "主席", text };
    }
    if (topic === "election") return { look: "hao", name: "浩浩", role: "司儀", text };
    return role === "recorder" || role === "student" ? { look: "npc0", name: "小宇", role: "司儀", text } : { look: "anan", name: "安安", role: "司儀", text };
  }
  const roleLabel = d.speaker === "teacher" ? "導師" : d.speaker === "zhe" && topic === "proposal" ? "衛生股長" : "同學";
  return { look: d.speaker, name: NAME[d.speaker], role: roleLabel, text };
}

export function Meeting({ s, update, notify, ext, updateExt, goHome, openSheets, openHandbook, startChapter }: MeetingProps) {
  const m = s.meeting;
  const e = s.election;
  const { reduced } = usePrefs();
  const me = displayName(ext);
  const cls = displayClass(ext);
  const topic = ext.topic;
  const role: MeetingRole = ext.role ?? "chair";
  const roleInfo = ROLES.find((r) => r.id === role)!;
  const proposalDone = Object.values(s.proposal).every((v) => v.trim());
  const initial: Chapter = !topic || !ext.role ? "topic" : topic === "election" ? (e.winner ? "impact" : "election") : !proposalDone ? "proposal" : m.done ? "impact" : "meeting";
  const [chapter, setChapter] = useState<Chapter>(startChapter && topic && ext.role ? startChapter : initial);
  const [pickOfficer, setPickOfficer] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ title: string; text: string; good: boolean; delta: string } | null>(null);
  const [counting, setCounting] = useState<number[] | null>(null);
  const [seconding, setSeconding] = useState(false);
  const [tieShown, setTieShown] = useState(false);
  const [done, setDone] = useState<TopicId | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [labMeasures, setLabMeasures] = useState<string[]>(ext.measures);
  const prevMeetingDone = useRef(m.done);
  const prevWinner = useRef(e.winner);

  useEffect(() => {
    if (!prevMeetingDone.current && m.done) setDone("proposal");
    prevMeetingDone.current = m.done;
  }, [m.done]);
  useEffect(() => {
    if (!prevWinner.current && e.winner && topic === "election") setDone("election");
    prevWinner.current = e.winner;
  }, [e.winner, topic]);

  const meters = computeMeters(ext.choices, ext.measures);
  const feelings = computeFeelings(ext.choices, ext.measures);
  const myDecisions = ALL_DECISIONS.filter((d) => d.topic === topic && d.role === role);
  const decisionsAt = (step: number) => myDecisions.filter((d) => d.step === step);
  const triggerDone = (t: NonNullable<Decision["trigger"]>) => myDecisions.filter((d) => d.trigger === t).every((d) => ext.choices[d.id]);
  const tieVisible = tieShown || myDecisions.some((d) => d.trigger === "tie" && ext.choices[d.id]);

  function decisionReady(d: Decision) {
    if (d.topic === "election") {
      if (d.trigger === "tie") return tieVisible && !counting;
      if (d.step === 2) return triggerDone("tie") && tieVisible && !counting;
      if (d.step === 1 && d.id.endsWith("compare")) return seconding;
      return !counting;
    }
    if (d.trigger === "seconded") return m.seconded && m.heard.length === 0 && !m.speaker;
    if (d.trigger === "offtopic") return m.heard.length === 1 && !m.speaker;
    if (d.trigger === "interrupt") return m.speaker === "mi";
    if (d.trigger === "quiet") return m.heard.length >= 3 && !m.speaker && !m.queue.length;
    if (d.id === "r-minority") return m.voted;
    return true;
  }
  const pendingDecision = (step: number) => decisionsAt(step).find((d) => !ext.choices[d.id] && decisionReady(d));

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

  function animateCount(targets: number[], after: () => void) {
    if (reduced) {
      setCounting(null);
      after();
      return;
    }
    const cur = targets.map(() => 0);
    setCounting([...cur]);
    let t = 0;
    const iv = window.setInterval(() => {
      const i = cur.findIndex((v, k) => v < targets[k]);
      if (i < 0) {
        window.clearInterval(iv);
        window.setTimeout(() => {
          setCounting(null);
          after();
        }, 450);
        return;
      }
      cur[i] += 1;
      t++;
      if (t % 2 === 0) sfx.play("tick");
      setCounting([...cur]);
    }, 55);
  }

  /* ================= 主題一：選舉班級幹部 ================= */
  const other = e.vote === "阿哲" ? "安安" : "阿哲";
  function electionAction() {
    if (pendingDecision(e.step)) {
      notify("先在對話框做出你的選擇。");
      sfx.play("invalid");
      return;
    }
    if (counting) return;
    if (e.step === 0) {
      if (!e.nominee) {
        notify("請先選擇要提名的人選。");
        sfx.play("invalid");
        return;
      }
      sfx.play("success");
      update((d) => {
        d.election.step = 1;
      });
      setLastResult(null);
      notify("步驟一完成：兩位人選都被提名了。接著徵求附議，進行討論。");
      return;
    }
    if (e.step === 1) {
      if (!seconding) {
        setSeconding(true);
        sfx.play("hand");
        notify("有同學舉手附議了！附議表示一個人以上贊成這個提名。");
        return;
      }
      sfx.play("success");
      setLastResult(null);
      update((d) => {
        d.election.step = 2;
      });
      notify("步驟二完成。接著舉手表決，請選擇你支持的人。");
      return;
    }
    if (e.step === 2) {
      if (!e.vote) {
        notify("請先選擇你要舉手支持的人。");
        sfx.play("invalid");
        return;
      }
      if (!tieVisible) {
        animateCount([14, 14], () => {
          setTieShown(true);
          sfx.play("invalid");
          notify("第一次表決：14 比 14，平票了！（模擬票數）");
        });
        return;
      }
      animateCount([16, 12], () => {
        sfx.play("success");
        setLastResult(null);
        update((d) => {
          d.election.step = 3;
        });
        notify(`再表決結果：${e.vote} 16 票、${other} 12 票。（模擬票數）`);
      });
      return;
    }
    sfx.play("complete");
    update((d) => {
      d.election.winner = d.election.vote;
    });
    notify("選舉完成！");
  }

  /* ================= 主題二：班會提案 ================= */
  function next() {
    if (pendingDecision(m.step)) {
      notify("還有一個狀況要處理，請看對話框。");
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
        d.meeting.minutes = `${cls} 班會紀錄\n議題：${d.proposal.problem}\n提案：${d.proposal.plan}\n理由：${d.proposal.reason}\n教材示範：安靜6、分區18、輪流4票；決議分區。\n照顧少數：${d.meeting.minority}\n臨時動議：${temporary || "無"}\n一週後檢討。`;
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
      notify("有同學插話了，要先處理。");
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
    animateCount(sampleVotes, () => {
      update((d) => {
        d.meeting.voted = true;
      });
      sfx.play("success");
      notify("示範表決完成：分區方案18票通過，接著聽聽少數需要。");
    });
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

  function resetTopic(keepRole: boolean) {
    if (topic === "election")
      update((d) => {
        d.election = { step: 0, nominee: "", vote: "", winner: "" };
      });
    else
      update((d) => {
        d.meeting = { step: 0, heard: [], queue: [], speaker: null, seconded: false, voted: false, minority: "", minutes: "", done: false };
      });
    updateExt((x) => {
      for (const d of ALL_DECISIONS) if (d.topic === topic) delete x.choices[d.id];
      if (topic === "proposal") {
        x.predictions = {};
        x.measures = [];
        x.cards = [];
      }
      if (!keepRole) x.role = null;
    });
    setLabMeasures([]);
    setLastResult(null);
    setSeconding(false);
    setTieShown(false);
    setDayIdx(0);
    setChapter(keepRole ? (topic === "election" ? "election" : "meeting") : "topic");
  }

  /* ================= 場景角色 ================= */
  const inProposalMeeting = topic === "proposal" && (chapter === "meeting" || chapter === "impact" || chapter === "reflect");
  const electionScene = topic === "election" && chapter !== "topic";
  const pendNow = chapter === "election" && !e.winner ? pendingDecision(e.step) : chapter === "meeting" && !m.done ? pendingDecision(m.step) : undefined;
  const pendSpeaker = pendNow ? speakerOf(pendNow, topic!, role) : null;
  const speakingNow: Look | null = pendSpeaker ? pendSpeaker.look : chapter === "meeting" && !m.done ? (m.step === 3 ? m.speaker : m.step === 0 ? "anan" : null) : null;
  const week = topic === "election" ? simulateElectionWeek(ext.choices) : simulateWeek("B", ext.measures, ext.choices);
  const day = chapter === "impact" ? week[dayIdx] : null;
  function moodOf(id: CharacterId): Mood {
    if (speakingNow === id) return "talking";
    if (day && day.who === id) return day.mood === "happy" ? "happy" : day.mood === "sad" ? "worried" : "thinking";
    if (chapter === "meeting" && id === "mi" && m.voted && !minorityCared(ext.measures)) return "worried";
    return feelings[id];
  }
  const handsUp = counting ? counting.reduce((a, b) => a + b, 0) % 3 : -1;
  const cast: CastMember[] = [];
  const playerBase = role === "chair" ? POS.chairSpot : role === "emcee" ? POS.emceeSpot : role === "recorder" ? POS.recSpot : SEATS[5];
  cast.push({
    key: "player",
    look: "player",
    ...playerBase,
    pose: role === "recorder" || role === "student" ? (role === "student" && pendNow?.trigger === "quiet" ? "raise" : "sit") : "stand",
    mood: "idle",
    sash: ROLE_SASH[role] || undefined,
    marker: pendNow ? "talk" : null,
    nameTag: me,
  });
  cast.push({ key: "teacher", look: "teacher", gx: 12.1, gy: 6.6, mood: moodOf("teacher"), pose: m.done || e.winner ? "wave" : "stand", nameTag: "林老師" });

  if (electionScene) {
    const cand = e.step >= 1 || !!e.winner;
    cast.push({ key: "anan", look: "anan", gx: cand ? 2.1 : SEATS[2].gx, gy: cand ? 3.3 : SEATS[2].gy, pose: cand ? (e.winner === "安安" ? "wave" : "stand") : "sit", mood: e.winner === "安安" ? "happy" : speakingNow === "anan" ? "talking" : "idle", nameTag: "安安" });
    cast.push({ key: "zhe", look: "zhe", gx: cand ? 2.4 : SEATS[3].gx, gy: cand ? 8.0 : SEATS[3].gy, pose: cand ? (e.winner === "阿哲" ? "wave" : "stand") : "sit", mood: e.winner === "阿哲" ? "happy" : speakingNow === "zhe" ? "talking" : moodOf("zhe"), nameTag: "阿哲" });
    if (role !== "chair") cast.push({ key: "npc0", look: "npc0", ...POS.chairSpot, pose: "stand", mood: speakingNow === "npc0" ? "talking" : "idle", sash: ROLE_SASH.chair, nameTag: "小宇" });
    if (role !== "emcee") cast.push({ key: "hao", look: "hao", ...POS.emceeSpot, pose: speakingNow === "hao" ? "point" : "stand", mood: moodOf("hao"), sash: ROLE_SASH.emcee, nameTag: "浩浩" });
    else cast.push({ key: "hao", look: "hao", ...SEATS[6], pose: counting && handsUp === 0 ? "raise" : "sit", mood: moodOf("hao"), nameTag: "浩浩" });
    if (role !== "recorder") cast.push({ key: "mi", look: "mi", ...POS.recSpot, pose: "sit", mood: moodOf("mi"), sash: ROLE_SASH.recorder, nameTag: "小米" });
    else cast.push({ key: "mi", look: "mi", ...SEATS[1], pose: counting && handsUp === 1 ? "raise" : "sit", mood: moodOf("mi"), nameTag: "小米" });
    SEATS.forEach((seat, i) => {
      if (i === 2 || i === 3 || (role === "emcee" && i === 6) || (role === "recorder" && i === 1) || (role === "student" && i === 5)) return;
      const hands = (e.step === 1 && seconding && i % 4 === 0) || (!!counting && i % 2 === handsUp % 2);
      cast.push({ key: `npc${i + 1}`, look: `npc${i + 1}`, ...seat, pose: hands ? "raise" : "sit", mood: pendNow?.id.includes("noise") ? "happy" : "idle" });
    });
  } else {
    const canInvite = chapter === "meeting" && m.step === 3 && !m.voted;
    (["mi", "hao"] as CharacterId[]).forEach((id) => {
      const seat = SEATS[id === "mi" ? 1 : 6];
      const speaking = m.speaker === id;
      const queued = m.queue.includes(id);
      cast.push({
        key: id,
        look: id,
        gx: speaking ? seat.gx - 0.6 : seat.gx,
        gy: seat.gy,
        pose: speaking ? "stand" : queued || (id === "hao" && pendNow?.trigger === "interrupt") || (!!counting && handsUp === (id === "mi" ? 1 : 0)) ? "raise" : "sit",
        mood: moodOf(id),
        marker: canInvite ? (queued ? "hand" : speaking ? "talk" : m.heard.includes(id) ? "check" : m.seconded ? "idea" : null) : null,
        label: canInvite ? `邀請${NAME[id]}舉手發言` : undefined,
        onActivate: canInvite ? () => invite(id) : undefined,
        nameTag: NAME[id],
      });
    });
    const zheBase = role === "recorder" ? SEATS[0] : POS.recSpot;
    const zheSpeaking = m.speaker === "zhe";
    cast.push({
      key: "zhe",
      look: "zhe",
      gx: zheSpeaking ? zheBase.gx + (role === "recorder" ? -0.6 : 0.6) : zheBase.gx,
      gy: zheBase.gy,
      pose: zheSpeaking ? "stand" : m.queue.includes("zhe") ? "raise" : "sit",
      mood: moodOf("zhe"),
      sash: role === "recorder" ? undefined : ROLE_SASH.recorder,
      marker: canInvite ? (m.queue.includes("zhe") ? "hand" : zheSpeaking ? "talk" : m.heard.includes("zhe") ? "check" : m.seconded ? "idea" : null) : null,
      label: canInvite ? "邀請阿哲舉手發言" : undefined,
      onActivate: canInvite ? () => invite("zhe") : undefined,
      nameTag: "阿哲",
    });
    const ananSpot = role === "chair" ? POS.emceeSpot : POS.chairSpot;
    cast.push({ key: "anan", look: "anan", ...ananSpot, pose: speakingNow === "anan" ? "point" : "stand", mood: moodOf("anan"), sash: role === "chair" ? ROLE_SASH.emcee : ROLE_SASH.chair, nameTag: "安安" });
    if (role === "recorder" || role === "student") cast.push({ key: "emcee", look: "npc0", ...POS.emceeSpot, pose: m.step === 0 ? "point" : "stand", mood: speakingNow === "npc0" ? "talking" : "idle", sash: ROLE_SASH.emcee, nameTag: "小宇" });
    const yunUp = ext.cards.includes("yun") && chapter === "meeting" && m.step === 3 && !m.voted;
    SEATS.forEach((seat, i) => {
      if (i === 1 || i === 6 || (role === "recorder" && i === 0) || (role === "student" && i === 5)) return;
      const yun = i === 9;
      cast.push({
        key: `npc${i}`,
        look: `npc${i}`,
        gx: yun && yunUp ? seat.gx - 0.6 : seat.gx,
        gy: seat.gy,
        pose: !!counting && i % 3 === handsUp ? "raise" : yun && yunUp ? "stand" : "sit",
        mood: pendNow?.trigger === "quiet" && yun ? "thinking" : "idle",
        marker: pendNow?.trigger === "quiet" && yun ? "idea" : null,
        nameTag: yun ? "小芸" : undefined,
      });
    });
  }

  const board = electionScene
    ? { title: `${cls} 班長選舉`, lines: TOPICS[0].steps.map((v, i) => `步驟${"一二三四"[i]}：${v}`), current: e.winner ? undefined : e.step, note: e.step >= 1 || e.winner ? "候選人：安安・阿哲" : "" }
    : chapter === "proposal"
      ? { title: "會前提案", lines: ["問題：" + (s.proposal.problem || "＿＿"), "提案：" + (s.proposal.plan || "＿＿"), "理由：" + (s.proposal.reason || "＿＿")] }
      : chapter === "topic"
        ? { title: `${cls} 班會`, lines: ["今天要討論什麼？", "請選擇主題與角色"] }
        : { title: `${cls} 班會`, lines: meetingSteps, current: m.done ? undefined : m.step, note: "議題：閱讀角怎麼用？" };
  const electionVotes = counting && electionScene ? counting : e.step >= 3 || e.winner ? [16, 12] : tieVisible ? [14, 14] : null;
  const voteBoard = electionScene
    ? electionVotes
      ? { title: "舉手表決（模擬）", rows: [{ label: e.vote || "安安", value: electionVotes[0] }, { label: e.vote ? other : "阿哲", value: electionVotes[1] }], highlight: e.step >= 3 ? 0 : undefined }
      : null
    : inProposalMeeting
      ? { title: "表決（教材示範）", rows: plans.map((_, i) => ({ label: ["A 安靜", "B 分區", "C 輪流"][i], value: counting ? counting[i] : m.voted ? sampleVotes[i] : null })), highlight: m.voted ? 1 : undefined }
      : null;

  /* ================= 對話框 ================= */
  let dialogue: React.ReactNode = null;
  if (pendNow && pendSpeaker) {
    dialogue = (
      <DialogueBox
        speaker={pendSpeaker.look}
        name={pendSpeaker.name}
        role={pendSpeaker.role}
        mood={pendNow.trigger === "tie" ? "confused" : "talking"}
        text={pendSpeaker.text}
        progress={`${me}（${roleInfo.name}）：${pendNow.question}`}
        choices={pendNow.options.map((o) => ({ label: o.label, onSelect: () => choose(pendNow, o.id) }))}
      />
    );
  } else if (chapter === "meeting" && !m.done) {
    if (m.step === 3 && m.speaker) {
      const card = ARGUMENTS.find((a) => a.who === m.speaker)!;
      dialogue = (
        <DialogueBox speaker={m.speaker} name={NAME[m.speaker]} role="發言中" text={`我支持「${card.claim}」${card.reason}`} choices={[{ label: "我聽完了", primary: true, icon: "ear", onSelect: heard }]} />
      );
    } else if (m.step === 3 && m.voted && !minorityCared(ext.measures))
      dialogue = <DialogueBox speaker="mi" name="小米" role="少數意見" mood="worried" text="我還是擔心討論區會太吵……" progress="請在右側選擇照顧少數的做法" />;
    else if (m.step !== 3) {
      const chairLook: Look = role === "chair" ? "player" : "anan";
      const chairName = role === "chair" ? `主席（${me}）` : "安安";
      const emLook: Look = role === "emcee" ? "player" : role === "chair" ? "anan" : "npc0";
      const emName = role === "emcee" ? `司儀（${me}）` : role === "chair" ? "安安" : "小宇";
      dialogue = (
        <DialogueBox
          speaker={m.step === 0 ? emLook : m.step === 5 ? "teacher" : m.step === 2 ? "zhe" : chairLook}
          name={m.step === 0 ? emName : m.step === 5 ? "林老師" : m.step === 2 ? "阿哲" : chairName}
          role={m.step === 0 ? "司儀" : m.step === 5 ? "會後指導" : m.step === 2 ? "股長報告" : "主席"}
          text={m.step === 5 ? "謝謝大家。表決後照著多數人的決定做，也要繼續照顧少數同學的需要。一週後帶著觀察回來討論。" : STEP_LINES[m.step]}
          progress={`程序 ${m.step + 1}／6`}
        />
      );
    }
  }

  /* ================= 面板 ================= */
  const tabSteps: { id: Chapter; label: string; done?: boolean }[] = [{ id: "topic", label: "選角色", done: !!topic && !!ext.role }];
  if (topic === "election")
    tabSteps.push({ id: "election", label: "選舉", done: !!e.winner }, { id: "impact", label: "影響", done: !!e.winner }, { id: "reflect", label: "反思", done: !!e.winner && !!ext.reflection.trim() });
  if (topic === "proposal")
    tabSteps.push(
      { id: "proposal", label: "提案", done: proposalDone },
      { id: "meeting", label: "開會", done: m.done },
      { id: "impact", label: "影響", done: m.done },
      { id: "reflect", label: "反思", done: m.done && !!ext.reflection.trim() },
    );
  const tabs = (
    <StepTabs<Chapter>
      label="班會大挑戰章節"
      current={chapter}
      onSelect={(c) => {
        if (c !== "topic" && (!topic || !ext.role)) {
          notify("先選擇討論主題和角色。");
          return;
        }
        setChapter(c);
      }}
      steps={tabSteps}
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
  const madeList = (step: number) =>
    decisionsAt(step).map((d) =>
      ext.choices[d.id] ? (
        <p key={d.id} className="decision-made">
          <Icon name={d.options.find((o) => o.id === ext.choices[d.id])!.good ? "check" : "bulb"} size={16} />
          我的選擇：{d.options.find((o) => o.id === ext.choices[d.id])!.label}
        </p>
      ) : null,
    );

  let body: React.ReactNode;
  let footer: React.ReactNode = null;

  if (chapter === "topic") {
    body = (
      <>
        <h2 className="mission-title">{me}，今天的班會要討論什麼？</h2>
        <div className="topic-picker" role="group" aria-label="討論主題">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              className={`topic-card ${topic === t.id ? "is-on" : ""}`}
              aria-pressed={topic === t.id}
              onClick={() => {
                sfx.play("pick");
                updateExt((x) => {
                  x.topic = t.id;
                });
              }}
            >
              <b>{t.title}</b>
              <span>{t.sub}</span>
              <small>
                {t.pages}・{t.steps.length} 個步驟
              </small>
            </button>
          ))}
        </div>
        <h3 className="sub-title">我要扮演的角色</h3>
        <div className="role-picker" role="group" aria-label="班會角色">
          {ROLES.map((r) => (
            <button
              key={r.id}
              className={`role-card ${ext.role === r.id ? "is-on" : ""}`}
              aria-pressed={ext.role === r.id}
              onClick={() => {
                sfx.play("pick");
                updateExt((x) => {
                  x.role = r.id;
                });
                notify(`${me}是${r.name}！${r.tip}`);
              }}
            >
              <Portrait look="player" mood={ext.role === r.id ? "happy" : "idle"} size={46} />
              <span>
                <b>{r.name}</b>
                <small>{r.duty}</small>
                <small className="muted">{r.tip}</small>
              </span>
            </button>
          ))}
        </div>
        <Callout kind="note" title="知識便利貼">
          主席：負責主持班會進行。司儀：協助宣布班會程序。記錄：負責記錄會議的內容。每位同學都可以參加班會討論。
        </Callout>
      </>
    );
    footer = (
      <button
        className="btn btn-primary wide"
        disabled={!topic || !ext.role}
        onClick={() => {
          sfx.play("success");
          setLastResult(null);
          setChapter(topic === "election" ? "election" : "proposal");
        }}
      >
        {!topic ? "請選擇主題" : !ext.role ? "請選擇角色" : "開始！"} <Icon name="next" size={20} />
      </button>
    );
  } else if (chapter === "election") {
    const matchedAll = ext.officers.length === officers.length;
    const label = e.winner ? "觀察選舉的影響" : e.step === 0 ? "確認提名" : e.step === 1 ? (seconding ? "完成討論" : "徵求附議") : e.step === 2 ? (tieVisible ? "再表決一次" : "舉手表決") : "宣布結果";
    body = (
      <>
        <h2 className="mission-title">
          選舉班長（{roleInfo.name}：{me}）
        </h2>
        <ol className="flow">
          {TOPICS[0].steps.map((v, i) => (
            <li key={v} className={e.winner || i < e.step ? "is-done" : i === e.step ? "is-current" : ""}>
              {v}
            </li>
          ))}
        </ol>
        {resultCard}
        {!e.winner && madeList(e.step)}
        {e.step === 0 && !e.winner && (
          <>
            <Callout kind="detective" title="先認識：幹部做什麼？">
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
              {matchedAll && (
                <p className="success-line">
                  <Icon name="check" size={18} /> 幹部是為大家服務的人！
                </p>
              )}
            </Callout>
            <label className="field">
              <span className="field-label">{role === "student" ? "我想提名的人" : "被提名的人選（任期：本次教學演練）"}</span>
              <select
                aria-label="提名班長"
                value={e.nominee}
                onChange={(ev) => {
                  const v = ev.target.value;
                  update((d) => {
                    d.election.nominee = v;
                  });
                }}
              >
                <option value="">請選擇</option>
                <option>安安</option>
                <option>阿哲</option>
              </select>
            </label>
          </>
        )}
        {e.step === 1 && !e.winner && (
          <div className="compare">
            <div className="compare-card">
              <Portrait look="anan" mood="happy" size={48} />
              <p>
                <b>安安</b>「我會每天確認值日表。」
              </p>
            </div>
            <div className="compare-card">
              <Portrait look="zhe" mood="happy" size={48} />
              <p>
                <b>阿哲</b>「我會清楚記錄大家的需求。」
              </p>
            </div>
            <Callout kind="note" title="知識便利貼">
              附議：表示一個人以上贊成這個提議，以舉手或口頭表達。
            </Callout>
          </div>
        )}
        {e.step === 2 && !e.winner && (
          <>
            <label className="field">
              <span className="field-label">我的舉手支持</span>
              <select
                aria-label="我的舉手支持"
                value={e.vote}
                disabled={!!counting || tieVisible}
                onChange={(ev) => {
                  const v = ev.target.value;
                  update((d) => {
                    d.election.vote = v;
                  });
                }}
              >
                <option value="">請選擇</option>
                <option>安安</option>
                <option>阿哲</option>
              </select>
            </label>
            {tieVisible && (
              <Callout kind="radar" title="平票了！">
                <p>第一次表決 14：14。想一想：平票時要怎麼處理才公平？</p>
                <button className="btn btn-soft" onClick={openHandbook}>
                  <Icon name="note" size={18} /> 查看班會小百科
                </button>
              </Callout>
            )}
            <p className="sim-note">票數為遊戲模擬，不是真實學生投票。</p>
          </>
        )}
        {e.step === 3 && !e.winner && (
          <p className="sim-note">
            再表決結果：{e.vote} 16 票、{other} 12 票（模擬）。請宣布結果。
          </p>
        )}
        {e.winner && (
          <p className="success-line">
            <Icon name="check" size={18} /> 本次教學模擬班長：{e.winner}。班上同學都有機會擔任幹部，為大家服務。
          </p>
        )}
      </>
    );
    footer = (
      <button className="btn btn-primary wide" disabled={!!counting} onClick={() => (e.winner ? setChapter("impact") : electionAction())}>
        {counting ? "計票中…" : label} <Icon name="next" size={20} />
      </button>
    );
  } else if (chapter === "proposal") {
    body = (
      <>
        <h2 className="mission-title">提出問題：我的提案單</h2>
        <span className="tag">學習單・會前完成</span>
        {!e.winner && (
          <>
            <TaskHint icon="bulb">開班會需要主席。還沒選班長的話，可以先玩「選舉班級幹部」，或使用預設：班長安安。</TaskHint>
            <div className="foot-row">
              <button
                className="btn btn-soft"
                onClick={() => {
                  updateExt((x) => {
                    x.topic = "election";
                  });
                  setChapter("election");
                }}
              >
                先選幹部
              </button>
              <button
                className="btn btn-soft"
                onClick={() => {
                  update((d) => {
                    d.election = { step: 3, nominee: "安安", vote: "安安", winner: "安安" };
                  });
                  notify("使用預設：班長是安安。");
                }}
              >
                使用預設（班長安安）
              </button>
            </div>
          </>
        )}
        <p className="small">提案要在會議前提出。可以自己寫，也可以點引導句。</p>
        {(
          [
            ["problem", "我發現的問題", ["午休時閱讀角有聲音", "有書沒有放回原位", "大家想用閱讀角的方式不一樣"]],
            ["plan", "我的提案", ["分成安靜區和討論區", "每天輪流使用", "訂一條閱讀角公約"]],
            ["reason", "我的理由", ["讓想安靜和想討論的人都有地方", "這樣比較公平", "大家都能好好看書"]],
          ] as const
        ).map(([key, lbl, ph]) => (
          <div key={key} className="proposal-field">
            <Field
              label={lbl}
              value={s.proposal[key]}
              onChange={(v) =>
                update((d) => {
                  d.proposal[key] = v;
                })
              }
            />
            <PhraseChips
              label={`${lbl}引導句`}
              phrases={[...ph]}
              onPick={(p) =>
                update((d) => {
                  d.proposal[key] = p;
                })
              }
            />
          </div>
        ))}
        <div className="checks-row">
          <CheckBadge ok={!!s.proposal.problem.trim()}>問題</CheckBadge>
          <CheckBadge ok={!!s.proposal.plan.trim()}>提案</CheckBadge>
          <CheckBadge ok={!!s.proposal.reason.trim()}>理由</CheckBadge>
        </div>
        <p className="small muted">系統只檢查有沒有填寫完整，不判斷內容好壞；可以和老師、同學一起討論。</p>
      </>
    );
    footer = (
      <button className="btn btn-primary wide" disabled={!proposalDone || !e.winner} onClick={() => setChapter("meeting")}>
        {!e.winner ? "先決定班長（主席）" : proposalDone ? "帶著提案去開班會" : "請填完三個欄位"} <Icon name="next" size={20} />
      </button>
    );
  } else if (chapter === "meeting") {
    const rows =
      role === "chair"
        ? [["player", "主席", `${me}：主持會議`], ["anan", "司儀", "安安：宣布程序"], ["zhe", "記錄", "阿哲：記錄內容"]]
        : role === "emcee"
          ? [["anan", "主席", "安安：主持會議"], ["player", "司儀", `${me}：宣布程序`], ["zhe", "記錄", "阿哲：記錄內容"]]
          : role === "recorder"
            ? [["anan", "主席", "安安：主持會議"], ["npc0", "司儀", "小宇：宣布程序"], ["player", "記錄", `${me}：記錄內容`]]
            : [["anan", "主席", "安安"], ["npc0", "司儀", "小宇"], ["player", "學生", `${me}：參加討論`]];
    body = (
      <>
        <div className="roles-row">
          {rows.map(([l, r, t]) => (
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
              <button className="agenda-btn" onClick={() => notify(i === m.step ? `目前：${v}。請完成此程序。` : "請依序完成目前程序，再前進。")}>
                <span className="agenda-num">{m.done || i < m.step ? <Icon name="check" size={14} /> : i + 1}</span>
                {v}
              </button>
            </li>
          ))}
        </ol>
        {m.done ? (
          <p className="success-line">
            <Icon name="check" size={18} /> 班會已完成，去看看「觀察影響」。
          </p>
        ) : (
          <>
            {resultCard}
            {madeList(m.step)}
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
                      <button key={id} className={`person-chip ${m.heard.includes(id) ? "is-done" : m.queue.includes(id) ? "is-queued" : ""}`} disabled={m.voted} onClick={() => invite(id)}>
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
                          <b>{a.who === "me" ? me : a.name}</b>
                          <span className="arg-plan">{a.plan ? `方案${a.plan}` : "共同提醒"}</span>
                        </div>
                        <p>
                          <span className="arg-k">主張</span>
                          {a.claim}
                        </p>
                        <p>
                          <span className="arg-k">理由</span>
                          {a.reason}
                        </p>
                        <p>
                          <span className="arg-k impact">可能影響</span>
                          {a.impact}
                        </p>
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
                          <b>
                            {p}. {plans[i]}
                          </b>
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
                        <span>
                          {["A", "B", "C"][i]}. {v}
                        </span>
                        <meter aria-label={v} max={28} value={counting ? counting[i] : sampleVotes[i]} />
                        <b>{counting ? counting[i] : sampleVotes[i]} 票</b>
                      </div>
                    ))}
                    {m.voted && (
                      <p className="success-line">
                        <Icon name="flag" size={18} /> 決議：閱讀角分成安靜區和討論區。
                      </p>
                    )}
                  </div>
                )}
                {m.voted && (
                  <div className="minority">
                    <h3 className="sub-title">服從多數，也尊重少數</h3>
                    <p className="small">小米還擔心太吵。可以怎麼照顧少數？（可以選很多個）</p>
                    <div className="measure-list">
                      {MEASURES.map((ms) => (
                        <button key={ms.id} className={`measure ${ext.measures.includes(ms.id) ? (ms.good ? "is-on" : "is-bad") : ""}`} aria-pressed={ext.measures.includes(ms.id)} onClick={() => toggleMeasure(ms.id)}>
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
        觀察決定的影響 <Icon name="next" size={20} />
      </button>
    ) : (
      <button className="btn btn-primary wide" disabled={!!counting} onClick={next}>
        {m.step === 5 ? "宣布散會並儲存決議" : "完成目前程序"}
      </button>
    );
  } else if (chapter === "impact") {
    const finished = topic === "election" ? !!e.winner : m.done;
    const made = myDecisions.filter((d) => ext.choices[d.id]);
    const ending = roleEnding(role, ext.choices, ext.measures, topic ?? "proposal");
    body = (
      <>
        <h2 className="mission-title">觀察：我的決定帶來什麼影響？</h2>
        {!finished && <TaskHint icon="lock">完成{topic === "election" ? "選舉" : "班會"}後，這裡會模擬接下來一週的情形。</TaskHint>}
        {finished && (
          <div className={`ending-card level-${ending.level}`}>
            <div className="ending-head">
              <Portrait look="player" mood={ending.level === "low" ? "thinking" : "happy"} size={48} />
              <div>
                <small>{TOPICS.find((t) => t.id === topic)?.title}</small>
                <b>
                  {me}（{roleInfo.name}）
                </b>
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
        <h3 className="sub-title">我做的決定</h3>
        <ul className="decision-log">
          {made.map((d) => {
            const o = d.options.find((x) => x.id === ext.choices[d.id])!;
            return (
              <li key={d.id} className={o.good ? "is-good" : "is-think"}>
                <Icon name={o.good ? "check" : "bulb"} size={16} />
                <div>
                  <b>{(topic === "election" ? TOPICS[0].steps : meetingSteps)[d.step]}：</b>
                  {o.label}
                  <small>{o.result}</small>
                </div>
              </li>
            );
          })}
          {made.length === 0 && <li className="muted">還沒有做出決定。</li>}
        </ul>
        {finished && (
          <>
            <h3 className="sub-title">{topic === "election" ? "選舉後的一週（模擬）" : "一週試行模擬（決議：分區）"}</h3>
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
      <button className="btn btn-primary wide" disabled={!finished} onClick={() => setChapter("reflect")}>
        下一步：修正與反思 <Icon name="next" size={20} />
      </button>
    );
  } else {
    const finished = topic === "election" ? !!e.winner : m.done;
    const lab = simulateWeek(ext.whatIf, labMeasures, ext.choices);
    const now = simulateWeek("B", ext.measures, ext.choices);
    const changed = labMeasures.slice().sort().join() !== ext.measures.filter((x) => x !== "ignore").sort().join();
    const thinkOnes = myDecisions.filter((d) => ext.choices[d.id] && !d.options.find((o) => o.id === ext.choices[d.id])!.good);
    body = (
      <>
        <h2 className="mission-title">修正與反思</h2>
        {!finished && <TaskHint icon="lock">完成後才能修正與反思。</TaskHint>}
        {finished && (
          <>
            {thinkOnes.length > 0 && (
              <Callout kind="radar" title="如果重來一次……">
                {thinkOnes.map((d) => {
                  const better = d.options.find((o) => o.good)!;
                  return (
                    <p key={d.id} className="small">
                      「{d.question}」可以試試：<b>{better.label}</b>。{better.result}
                    </p>
                  );
                })}
              </Callout>
            )}
            {topic === "proposal" && (
              <Callout kind="detective" title="模擬實驗室：換一種方案或做法">
                <p className="small">比較一週的結果。這是模擬，不是真實結果。</p>
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
                      <input type="checkbox" checked={labMeasures.includes(ms.id)} onChange={() => setLabMeasures((l) => (l.includes(ms.id) ? l.filter((x) => x !== ms.id) : [...l, ms.id]))} />
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
                    notify("已修正照顧少數的做法，回到「觀察影響」看看新的一週。");
                  }}
                >
                  <Icon name="check" size={20} /> 採用這些做法，修正決議
                </button>
              </Callout>
            )}
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
              phrases={["發言前要先舉手", "提名要說理由", "平票可以再表決", "服從多數也要尊重少數", "對事不對人"]}
              onPick={(p) =>
                updateExt((x) => {
                  x.reflection = x.reflection ? `${x.reflection}；${p}` : p;
                })
              }
            />
            {topic === "proposal" && (
              <div className="feedback">
                <h3>會議紀錄</h3>
                <pre>{m.minutes}</pre>
              </div>
            )}
          </>
        )}
      </>
    );
    footer = (
      <div className="foot-row">
        <button className="btn btn-soft" onClick={openSheets}>
          <Icon name="sheet" size={20} /> 學習單
        </button>
        {finished && (
          <>
            <button className="btn btn-soft" onClick={() => resetTopic(true)}>
              <Icon name="reset" size={20} /> 同角色重玩
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetTopic(false);
                notify("換個角色或主題，看看不同的決定會帶來什麼結果。");
              }}
            >
              換角色／主題
            </button>
          </>
        )}
      </div>
    );
  }

  const sceneOverlay = (
    <>
      {chapter !== "topic" && chapter !== "proposal" && (
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
      <div className="scene-chip">
        {chapter === "election" && !e.winner
          ? `步驟${"一二三四"[e.step]}：${TOPICS[0].steps[e.step]}`
          : chapter === "meeting" && !m.done
            ? `程序 ${m.step + 1}／6：${meetingSteps[m.step]}`
            : chapter === "impact" && day
              ? `${day.day}・一週模擬`
              : `${cls}・${me}`}
      </div>
      {dialogue && <div className="dialogue-slot">{dialogue}</div>}
      {done && (
        <Completion
          title={done === "election" ? "選舉完成！" : "班會完成！"}
          subtitle={`${me}以「${roleInfo.name}」的身分，完成了${done === "election" ? "四個步驟的班長選舉" : "六個程序的班會"}。`}
          cast={["anan", "zhe", "mi", "hao", "teacher"]}
          actions={
            [
              {
                label: "觀察決定的影響",
                primary: true,
                icon: "next",
                onSelect: () => {
                  setDone(null);
                  setChapter("impact");
                },
              },
              {
                label: "查看學習單",
                icon: "sheet",
                onSelect: () => {
                  setDone(null);
                  openSheets();
                },
              },
              {
                label: "回主選單",
                icon: "home",
                onSelect: () => {
                  setDone(null);
                  goHome();
                },
              },
            ] as Choice[]
          }
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
        <MeetingScene
          mode="meeting"
          camera={chapter === "topic" ? "menu" : "front"}
          positions={s.positions}
          cast={cast}
          classLabel={cls}
          ariaLabel={`${cls}教室・班會`}
          board={board}
          proposalCard={topic === "proposal" && chapter !== "topic" ? { problem: s.proposal.problem, plan: s.proposal.plan } : null}
          voteBoard={voteBoard}
        />
      }
      sceneOverlay={sceneOverlay}
    >
      {body}
    </PlayLayout>
  );
}
