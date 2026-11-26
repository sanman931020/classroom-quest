import { useEffect, useId, useRef, useState } from "react";
import { Character, Portrait, type Look, type Mood } from "../art/Character";
import { Icon, type IconName } from "./icons";
import { sfx } from "../ui/sfx";
import { useSay } from "../narration/narrator";
import { lineFromText, partOfLook, type NarrLine } from "../narration/lines";

/* ------------------------------------------------------------------ */
/* 角色對話框                                                          */
/* ------------------------------------------------------------------ */
export type Choice = {
  label: string;
  onSelect: () => void;
  primary?: boolean;
  icon?: IconName;
};
export function DialogueBox({
  speaker,
  name,
  role,
  mood = "talking",
  text,
  choices = [],
  onClose,
  progress,
  say,
}: {
  speaker: Look;
  name: string;
  role?: string;
  mood?: Mood;
  text: string;
  choices?: Choice[];
  onClose?: () => void;
  progress?: string;
  /** 朗讀內容；預設念說話者的台詞 */
  say?: NarrLine[];
}) {
  useSay(say ?? [{ part: partOfLook(speaker), text }], `${speaker}|${text}`, 260);
  return (
    <div className="dialogue-box" role="dialog" aria-label={`${name}說話`} key={`${speaker}-${text}`}>
      <div className="dialogue-portrait">
        <Portrait look={speaker} mood={mood} size={84} />
      </div>
      <div className="dialogue-body">
        <div className="dialogue-name">
          <strong>{name}</strong>
          {role && <span className="dialogue-role">{role}</span>}
          {progress && <span className="dialogue-progress">{progress}</span>}
        </div>
        <p className="dialogue-text">{text}</p>
        {choices.length > 0 && (
          <div className="dialogue-choices">
            {choices.map((c) => (
              <button
                key={c.label}
                className={c.primary ? "btn btn-primary" : "btn btn-soft"}
                onClick={() => {
                  sfx.play("tap");
                  c.onSelect();
                }}
              >
                {c.icon && <Icon name={c.icon} size={20} />}
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {onClose && (
        <button className="icon-btn dialogue-close" aria-label="關閉對話" onClick={onClose}>
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 任務提示條                                                          */
/* ------------------------------------------------------------------ */
export function TaskHint({ icon = "pin", children }: { icon?: IconName; children: React.ReactNode }) {
  return (
    <div className="task-hint">
      <Icon name={icon} size={20} />
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 物件資訊浮窗                                                        */
/* ------------------------------------------------------------------ */
export function InfoCard({
  title,
  icon = "clue",
  children,
  onClose,
}: {
  title: string;
  icon?: IconName;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="info-card" role="dialog" aria-label={title}>
      <div className="info-card-head">
        <Icon name={icon} />
        <strong>{title}</strong>
        <button className="icon-btn small" aria-label="關閉資訊" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="info-card-body">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 步驟分頁                                                            */
/* ------------------------------------------------------------------ */
export function StepTabs<T extends string>({
  steps,
  current,
  onSelect,
  label,
}: {
  steps: { id: T; label: string; done?: boolean; locked?: boolean }[];
  current: T;
  onSelect: (id: T) => void;
  label: string;
}) {
  return (
    <nav className="step-tabs" aria-label={label}>
      {steps.map((s, i) => (
        <button
          key={s.id}
          className={`step-tab ${current === s.id ? "is-current" : ""} ${s.done ? "is-done" : ""}`}
          aria-current={current === s.id ? "step" : undefined}
          onClick={() => {
            sfx.play("page");
            onSelect(s.id);
          }}
        >
          <span className="step-num">{s.done ? <Icon name="check" size={16} /> : i + 1}</span>
          <span className="step-label">{s.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* 檢核徽章（清楚／公平／做得到等）                                     */
/* ------------------------------------------------------------------ */
export function CheckBadge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`check-badge ${ok ? "is-ok" : ""}`}>
      <Icon name={ok ? "check" : "starOutline"} size={16} />
      {children}
      <span className="sr-only">{ok ? "（通過）" : "（尚未通過）"}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 疊層視窗（暫停、設定、說明、學習單、教師入口）                         */
/* ------------------------------------------------------------------ */
export function Overlay({
  title,
  onClose,
  children,
  wide = false,
  icon,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  icon?: IconName;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, select, textarea");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`overlay-card ${wide ? "wide" : ""} ${className}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header className="overlay-head">
          {icon && <Icon name={icon} size={26} />}
          <h2 id={id}>{title}</h2>
          <button className="icon-btn" aria-label="關閉" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 完成活動畫面                                                        */
/* ------------------------------------------------------------------ */
export function Completion({
  title,
  subtitle,
  cast,
  children,
  actions,
}: {
  title: string;
  subtitle: string;
  cast: Look[];
  children?: React.ReactNode;
  actions: Choice[];
}) {
  useEffect(() => {
    sfx.play("complete");
  }, []);
  return (
    <div className="overlay completion-overlay">
      <Confetti />
      <div className="overlay-card completion-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="completion-badge" aria-hidden="true">
          <Icon name="star" size={46} />
        </div>
        <h2>{title}</h2>
        <p className="completion-sub">{subtitle}</p>
        <svg className="completion-cast" viewBox="-200 -170 400 180" aria-hidden="true">
          {cast.map((l, i) => (
            <Character key={l} look={l} mood="happy" pose={i % 2 ? "wave" : "stand"} x={(i - (cast.length - 1) / 2) * 72} y={0} />
          ))}
        </svg>
        {children && <div className="completion-body">{children}</div>}
        <div className="completion-actions">
          {actions.map((a) => (
            <button key={a.label} className={a.primary ? "btn btn-primary" : "btn btn-soft"} onClick={a.onSelect}>
              {a.icon && <Icon name={a.icon} size={20} />}
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Confetti() {
  const pieces = Array.from({ length: 26 }, (_, i) => i);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((i) => (
        <i
          key={i}
          style={
            {
              "--x": `${(i * 37) % 100}%`,
              "--d": `${(i % 7) * 0.12}s`,
              "--r": `${(i * 47) % 360}deg`,
              "--c": ["#e98a7c", "#65afa5", "#d6b563", "#8fa8d6"][i % 4],
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 提示泡泡（aria-live 單一 status 區）                                */
/* ------------------------------------------------------------------ */
export function Toast({ message }: { message: string }) {
  const [shown, setShown] = useState(true);
  useSay([lineFromText(message)], message, 120);
  useEffect(() => {
    setShown(true);
    const t = window.setTimeout(() => setShown(false), 5200);
    return () => window.clearTimeout(t);
  }, [message]);
  return (
    <div className={`toast ${shown ? "is-shown" : ""}`} role="status" aria-live="polite">
      <Icon name="bulb" size={20} />
      <span>{message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 引導句片語按鈕（把片語加入輸入框）                                    */
/* ------------------------------------------------------------------ */
export function PhraseChips({ phrases, onPick, label }: { phrases: string[]; onPick: (p: string) => void; label: string }) {
  return (
    <div className="phrase-chips" role="group" aria-label={label}>
      {phrases.map((p) => (
        <button
          key={p}
          type="button"
          className="chip"
          onClick={() => {
            sfx.play("tap");
            onPick(p);
          }}
        >
          ＋ {p}
        </button>
      ))}
    </div>
  );
}

export function Callout({ kind, title, children }: { kind: "radar" | "detective" | "note"; title: string; children: React.ReactNode }) {
  return (
    <div className={`callout callout-${kind}`}>
      <div className="callout-head">
        <Icon name={kind} size={18} />
        <b>{title}</b>
      </div>
      <div>{children}</div>
    </div>
  );
}
