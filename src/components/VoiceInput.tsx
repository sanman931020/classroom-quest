import { useEffect, useRef, useState } from "react";
import { sfx } from "../ui/sfx";

/**
 * 麥克風語音輸入（瀏覽器內建語音辨識，臺灣華語 zh-TW）。
 * - 只在學生按下麥克風時才開始收音；再按一次或說完會自動停止。
 * - 不支援的瀏覽器不顯示按鈕（仍可用鍵盤，iPad 鍵盤也有聽寫功能）。
 * - 注意：Chrome／Safari 的語音辨識由瀏覽器廠商的語音服務處理，本專案不保存錄音。
 */
type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognizer(): (new () => Rec) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
export const voiceSupported = () => typeof window !== "undefined" && !!getRecognizer();

export function MicButton({ onText, label }: { onText: (text: string) => void; label: string }) {
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState("");
  const rec = useRef<Rec | null>(null);
  useEffect(() => () => rec.current?.abort(), []);
  if (!voiceSupported()) return null;

  function toggle() {
    if (on) {
      rec.current?.stop();
      return;
    }
    const R = getRecognizer();
    if (!R) return;
    const r = new R();
    r.lang = "zh-TW";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setMsg(interim || finalText);
    };
    r.onerror = (e) => {
      setMsg(e.error === "not-allowed" ? "請允許使用麥克風" : "沒有聽清楚，再試一次");
    };
    r.onend = () => {
      setOn(false);
      const t = finalText.replace(/[。．.]$/, "").trim();
      if (t) {
        onText(t);
        sfx.play("success");
        setMsg("");
      }
    };
    rec.current = r;
    try {
      r.start();
      setOn(true);
      setMsg("請說話…");
      sfx.play("open");
    } catch {
      setMsg("麥克風暫時不能使用");
    }
  }

  return (
    <span className="mic-wrap">
      <button type="button" className={`mic-btn ${on ? "is-on" : ""}`} aria-label={on ? `停止語音輸入：${label}` : `語音輸入：${label}`} aria-pressed={on} onClick={toggle}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
        </svg>
      </button>
      {msg && (
        <span className="mic-msg" aria-live="polite">
          {msg}
        </span>
      )}
    </span>
  );
}
