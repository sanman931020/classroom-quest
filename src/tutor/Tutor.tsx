import { useEffect, useRef, useState } from "react";
import { Portrait } from "../art/Character";
import { Icon } from "../components/icons";
import { MicButton } from "../components/VoiceInput";
import { narrator } from "../narration/narrator";
import { sfx } from "../ui/sfx";
import { SAFETY_ANSWER, TUTOR_FALLBACK, TUTOR_QA, TUTOR_TOPICS, TUTOR_WELCOME, type TutorQA, type TutorTopic } from "../data/tutorQA";
import { answer, isSafetyQuestion, suggestions } from "./match";

/**
 * AI小老師：右下角的聊天視窗（像通訊軟體的對話框）。
 * 學生可以打字或按麥克風用說的問問題，AI小老師從題庫找最合適的答案回答，並念出來。
 * 題庫與比對都在這台裝置上，不連網、不使用外部 AI 服務，也不保存對話。
 */
type Msg = { id: number; from: "me" | "tutor"; text: string; src?: TutorQA["src"]; chips?: TutorQA[]; topics?: boolean; time: string };

const now = () => {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const byId = (id: string) => TUTOR_QA.find((q) => q.id === id);

export function Tutor({ inGame }: { inGame: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const nextId = useRef(1);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const push = (m: Omit<Msg, "id" | "time">) => setMsgs((l) => [...l, { ...m, id: nextId.current++, time: now() }]);

  useEffect(() => {
    if (open && !msgs.length) {
      push({ from: "tutor", text: TUTOR_WELCOME, topics: true });
      narrator.say({ part: "teacher", text: TUTOR_WELCOME }, { replace: true });
    }
    if (open) window.setTimeout(() => input.current?.focus(), 50);
    // 只在打開時處理
  }, [open]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  function reply(qa: TutorQA | null, asked: string) {
    window.setTimeout(() => {
      if (isSafetyQuestion(asked)) {
        push({ from: "tutor", text: SAFETY_ANSWER });
        narrator.say({ part: "teacher", text: SAFETY_ANSWER }, { replace: true });
        return;
      }
      if (!qa) {
        push({ from: "tutor", text: TUTOR_FALLBACK, chips: suggestions(asked) });
        narrator.say({ part: "teacher", text: TUTOR_FALLBACK }, { replace: true });
        return;
      }
      const chips = (qa.next ?? []).map(byId).filter((x): x is TutorQA => !!x);
      push({ from: "tutor", text: qa.a, src: qa.src, chips: chips.length ? chips : suggestions(asked, qa.id).slice(0, 2) });
      narrator.say({ part: "teacher", text: qa.a }, { replace: true });
    }, 450);
  }

  function ask(q: string) {
    const t = q.trim();
    if (!t) return;
    sfx.play("tap");
    push({ from: "me", text: t });
    setText("");
    reply(answer(t)?.qa ?? null, t);
    window.setTimeout(() => input.current?.focus(), 0);
  }
  function pick(qa: TutorQA) {
    sfx.play("tap");
    push({ from: "me", text: qa.q });
    reply(qa, qa.q);
  }
  function showTopic(topic: TutorTopic) {
    sfx.play("tap");
    push({ from: "me", text: `我想問「${topic}」` });
    window.setTimeout(() => push({ from: "tutor", text: `關於「${topic}」，你可以問：`, chips: TUTOR_QA.filter((q) => q.topic === topic) }), 300);
  }

  return (
    <div className={`tutor ${inGame ? "in-game" : ""}`}>
      {open && (
        <section className="tutor-chat" role="dialog" aria-label="AI小老師聊天室">
          <header className="tutor-head">
            <Portrait look="teacher" mood="happy" size={36} />
            <div>
              <b>AI小老師</b>
              <small>班會問題都可以問我</small>
            </div>
            <button className="icon-btn" aria-label="關閉AI小老師" onClick={() => setOpen(false)}>
              <Icon name="close" />
            </button>
          </header>
          <div className="tutor-list" ref={list} aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`tutor-row from-${m.from}`}>
                {m.from === "tutor" && <Portrait look="teacher" mood="talking" size={34} />}
                <div className="tutor-col">
                  <div className="tutor-bubble">
                    {m.text}
                    {m.src && <span className={`tutor-src ${m.src === "課本" ? "is-book" : ""}`}>{m.src === "操作" ? "遊戲說明" : m.src}</span>}
                  </div>
                  {m.topics && (
                    <div className="tutor-chips" role="group" aria-label="問題分類">
                      {TUTOR_TOPICS.map((tp) => (
                        <button key={tp} className="chip" onClick={() => showTopic(tp)}>
                          {tp}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.chips && m.chips.length > 0 && (
                    <div className="tutor-chips" role="group" aria-label="可以問的問題">
                      {m.chips.map((c) => (
                        <button key={c.id} className="chip" onClick={() => pick(c)}>
                          {c.q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <time className="tutor-time">{m.time}</time>
              </div>
            ))}
          </div>
          <form
            className="tutor-input"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="輸入你的問題…" aria-label="輸入問題" maxLength={80} />
            <MicButton label="用說的問AI小老師" onText={(t) => setText((v) => (v ? v + t : t))} />
            <button type="submit" className="btn btn-primary tutor-send" disabled={!text.trim()}>
              送出
            </button>
          </form>
        </section>
      )}
      <button
        className={`tutor-fab ${open ? "is-open" : ""}`}
        aria-label={open ? "關閉AI小老師" : "打開AI小老師，問問題"}
        aria-expanded={open}
        onClick={() => {
          sfx.play("tap");
          setOpen((o) => !o);
        }}
      >
        <Portrait look="teacher" mood="happy" size={44} />
        <span>AI小老師</span>
      </button>
    </div>
  );
}
