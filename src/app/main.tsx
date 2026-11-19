import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Meeting, type Chapter } from "../activities/Meeting";
import { initialProgress, meetingSteps } from "../data/content";
import { DECISIONS, ROLES } from "../data/meetingStory";
import type { Progress, Scene } from "../game/types";
import { load, save } from "../storage/progress";
import { EXT_KEY, initialExt, loadExt, saveExt, type MeetingExt } from "../storage/meetingExt";
import { Classroom, type CastMember } from "../scenes/Classroom";
import { Icon } from "../components/icons";
import { Overlay, Toast } from "../components/ui";
import { Portrait, type Mood } from "../art/Character";
import { PrefsProvider, usePrefs } from "../ui/prefs";
import { sfx } from "../ui/sfx";
import "../ui/tokens.css";
import "./styles.css";

type OverlayId = null | "pause" | "settings" | "help" | "chapters" | "teacher" | "sheets";

const CHAPTERS: { id: Chapter; title: string; text: string; pages: string }[] = [
  { id: "election", title: "幹部選舉", text: "認識五種幹部，練習四步驟選舉。", pages: "課本 p.5–6" },
  { id: "proposal", title: "提出問題", text: "會前寫好問題、提案和理由。", pages: "課本 p.9–10" },
  { id: "meeting", title: "召開班會", text: "選擇角色，依六個程序開班會，聆聽不同意見後表決。", pages: "課本 p.7–12" },
  { id: "impact", title: "觀察影響", text: "看看你的決定讓一週的閱讀角變得怎麼樣。", pages: "課本 p.12、p.16 延伸" },
  { id: "reflect", title: "修正反思", text: "換一種做法比較結果，寫下學到什麼。", pages: "遊戲延伸" },
];

function exportAll(s: Progress, ext: MeetingExt) {
  const data = {
    說明: "《我們這一班！》班會大挑戰學習成果（本機匯出）。表決票數為教材示範，不是真實學生投票。",
    progress: s,
    meeting: ext,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "我們這一班-班會學習成果.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const { prefs, setPrefs } = usePrefs();
  const [loaded] = useState(load);
  const [s, setS] = useState<Progress>(() => {
    const st = loaded.state;
    // 第二階段只保留班會活動：舊存檔停在其他活動時回到主選單
    if (st.scene === "reading" || st.scene === "service") return { ...st, scene: "home" };
    return st;
  });
  const [ext, setExt] = useState<MeetingExt>(loadExt);
  const [message, notify] = useState(loaded.error || "歡迎來到三年二班！");
  const [storage, setStorage] = useState("正在讀取進度");
  const [overlay, setOverlay] = useState<OverlayId>(null);
  const [wipe, setWipe] = useState(false);
  const [startChapter, setStartChapter] = useState<Chapter | null>(null);
  const [mountKey, setMountKey] = useState(0);

  function update(fn: (draft: Progress) => void) {
    setS((prev) => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  }
  function updateExt(fn: (d: MeetingExt) => void) {
    setExt((prev) => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  }
  useEffect(() => {
    setStorage(save(s));
  }, [s]);
  useEffect(() => {
    if (!saveExt(ext)) setStorage("儲存失敗，請匯出成果備份。");
  }, [ext]);

  function navigate(scene: Scene, chapter: Chapter | null = null) {
    sfx.play("whoosh");
    setOverlay(null);
    setWipe(true);
    window.setTimeout(() => {
      setStartChapter(chapter);
      setMountKey((k) => k + 1);
      update((d) => {
        d.scene = scene;
      });
      notify(scene === "home" ? "回到主選單，進度會自動保留。" : "班會大挑戰開始！可以隨時暫停，進度會保留。");
      window.setTimeout(() => setWipe(false), 60);
    }, 240);
  }

  const started = !!s.election.winner || s.election.step > 0 || Object.values(s.proposal).some((v) => v.trim()) || ext.officers.length > 0;
  const inGame = s.scene !== "home";

  return (
    <div className="app">
      {inGame ? (
        <div className="game">
          <header className="hud">
            <button className="hud-btn" onClick={() => navigate("home")} aria-label="回主選單">
              <Icon name="home" />
              <span className="hud-label">主選單</span>
            </button>
            <div className="hud-title">
              <span className="hud-badge">班</span>
              <div>
                <small>我們這一班！</small>
                <b>班會大挑戰</b>
              </div>
            </div>
            <div className="hud-progress" aria-label="班會進度">
              {meetingSteps.map((v, i) => (
                <i key={v} className={s.meeting.done || i < s.meeting.step ? "done" : i === s.meeting.step && s.election.winner ? "now" : ""} title={v} />
              ))}
            </div>
            <span className="hud-save" title={storage}>
              <Icon name="save" size={18} />
              <span className="hud-label">{storage.includes("失敗") ? "儲存失敗" : "已自動儲存"}</span>
            </span>
            <button className="hud-btn" onClick={() => setOverlay("sheets")} aria-label="學習單">
              <Icon name="sheet" />
              <span className="hud-label">學習單</span>
            </button>
            <button
              className="hud-btn"
              aria-label={prefs.sound ? "關閉音效" : "開啟音效"}
              aria-pressed={prefs.sound}
              onClick={() => setPrefs((p) => ({ ...p, sound: !p.sound }))}
            >
              <Icon name={prefs.sound ? "sound" : "mute"} />
            </button>
            <button className="hud-btn" onClick={() => setOverlay("pause")} aria-label="暫停">
              <Icon name="pause" />
            </button>
          </header>
          <main className="stage">
            <Meeting
              key={mountKey}
              s={s}
              update={update}
              notify={notify}
              ext={ext}
              updateExt={updateExt}
              goHome={() => navigate("home")}
              openSheets={() => setOverlay("sheets")}
              startChapter={startChapter}
            />
          </main>
        </div>
      ) : (
        <Home
          s={s}
          started={started}
          onStart={() => navigate("meeting", started ? null : "election")}
          onContinue={() => navigate("meeting")}
          open={setOverlay}
          notify={notify}
        />
      )}
      <Toast message={message} />
      {wipe && <div className="wipe" aria-hidden="true" />}

      {overlay === "pause" && (
        <Overlay title="暫停" icon="pause" onClose={() => setOverlay(null)}>
          <div className="menu-list">
            <button className="btn btn-primary" onClick={() => setOverlay(null)}>
              <Icon name="play" /> 繼續遊戲
            </button>
            <button className="btn btn-soft" onClick={() => setOverlay("chapters")}>
              <Icon name="map" /> 選擇章節
            </button>
            <button className="btn btn-soft" onClick={() => setOverlay("sheets")}>
              <Icon name="sheet" /> 學習單
            </button>
            <button className="btn btn-soft" onClick={() => setOverlay("help")}>
              <Icon name="help" /> 操作說明
            </button>
            <button className="btn btn-soft" onClick={() => setOverlay("settings")}>
              <Icon name="gear" /> 設定
            </button>
            <button className="btn btn-soft" onClick={() => navigate("home")}>
              <Icon name="home" /> 回主選單
            </button>
          </div>
        </Overlay>
      )}
      {overlay === "settings" && <Settings onClose={() => setOverlay(null)} />}
      {overlay === "help" && <Help onClose={() => setOverlay(null)} />}
      {overlay === "chapters" && (
        <Overlay title="選擇章節" icon="map" wide onClose={() => setOverlay(null)}>
          <p className="small">班會大挑戰：提出問題 → 主持討論 → 聆聽不同意見 → 做出決定 → 觀察影響 → 修正反思</p>
          <div className="chapter-grid">
            {CHAPTERS.map((c, i) => (
              <button key={c.id} className="chapter-card" onClick={() => navigate("meeting", c.id)}>
                <span className="chapter-num">{i + 1}</span>
                <b>{c.title}</b>
                <span>{c.text}</span>
                <small>{c.pages}</small>
              </button>
            ))}
          </div>
        </Overlay>
      )}
      {overlay === "sheets" && <Sheets s={s} ext={ext} onClose={() => setOverlay(null)} onExport={() => { exportAll(s, ext); notify("學習成果已匯出為 JSON 檔。"); }} />}
      {overlay === "teacher" && (
        <Teacher
          s={s}
          ext={ext}
          onClose={() => setOverlay(null)}
          go={(c) => navigate("meeting", c)}
          onExport={() => {
            exportAll(s, ext);
            notify("學習成果已匯出為 JSON 檔。");
          }}
          onReset={() => {
            const fresh = initialProgress();
            setS(fresh);
            setExt(initialExt());
            try {
              localStorage.removeItem(EXT_KEY);
            } catch {
              /* 無法清除時仍以記憶體狀態重設 */
            }
            setOverlay(null);
            notify("已重設本機的班會進度。");
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 主選單                                                              */
/* ------------------------------------------------------------------ */
function Home({
  s,
  started,
  onStart,
  onContinue,
  open,
  notify,
}: {
  s: Progress;
  started: boolean;
  onStart: () => void;
  onContinue: () => void;
  open: (o: OverlayId) => void;
  notify: (m: string) => void;
}) {
  const { prefs, setPrefs } = usePrefs();
  const [poke, setPoke] = useState<string | null>(null);
  const lines: Record<string, string> = {
    anan: "安安：今天的班會，你想當什麼角色？",
    mi: "小米：午休時，我想安安靜靜的看書。",
    hao: "浩浩：下課時，我們想一起討論漫畫！",
    zhe: "阿哲：上次有書被弄髒，還有一本不見了……",
    teacher: "林老師：閱讀角是大家的。要怎麼決定才公平呢？",
  };
  const react = (k: string) => () => {
    sfx.play("tap");
    setPoke(k);
    notify(lines[k]);
    window.setTimeout(() => setPoke((p) => (p === k ? null : p)), 2200);
  };
  const mood = (k: string, base: Mood): Mood => (poke === k ? "talking" : base);
  const cast: CastMember[] = [
    { key: "mi", look: "mi", gx: 8.1, gy: 1.7, pose: "read", mood: mood("mi", "idle"), label: "和小米說話", onActivate: react("mi") },
    { key: "hao", look: "hao", gx: 9.6, gy: 2.9, pose: poke === "hao" ? "wave" : "point", mood: mood("hao", "happy"), label: "和浩浩說話", onActivate: react("hao") },
    { key: "zhe", look: "zhe", gx: 5.9, gy: 1.6, pose: "stand", mood: mood("zhe", "thinking"), label: "和阿哲說話", onActivate: react("zhe") },
    { key: "anan", look: "anan", gx: 6.6, gy: 4.3, pose: "wave", mood: mood("anan", "happy"), label: "和安安說話", onActivate: react("anan") },
    { key: "teacher", look: "teacher", gx: 4.2, gy: 3.8, pose: "stand", mood: mood("teacher", "idle"), label: "和林老師說話", onActivate: react("teacher") },
  ];
  return (
    <div className="home">
      <div className="home-scene">
        <Classroom mode="menu" camera="menu" slice positions={s.positions} cast={cast} messy ariaLabel="三年二班教室，點角色可以聽他們說話" />
        <div className="scene-paper" aria-hidden="true" />
      </div>
      <div className="home-panel">
        <div className="logo">
          <span className="logo-ribbon">三上社會・快樂的班級生活</span>
          <h1>
            我們這一班<em>！</em>
          </h1>
          <p className="logo-sub">Classroom Quest・班會大挑戰</p>
        </div>
        <p className="home-intro">閱讀角怎麼用才公平？選一個班會角色，聽聽大家的想法，看看每個決定會帶來什麼影響。</p>
        <nav className="home-menu" aria-label="主選單">
          <button className="btn btn-primary btn-big" onClick={onStart}>
            <Icon name="play" /> {started ? "開始探索" : "開始探索"}
          </button>
          <button className="btn btn-soft" disabled={!started} onClick={onContinue}>
            <Icon name="next" /> 繼續遊戲
          </button>
          <button className="btn btn-soft" onClick={() => open("chapters")}>
            <Icon name="map" /> 選擇章節
          </button>
          <button className="btn btn-soft" onClick={() => open("teacher")}>
            <Icon name="teacher" /> 教師入口
          </button>
        </nav>
        <div className="home-tools">
          <button className="icon-btn" aria-label={prefs.sound ? "關閉音效" : "開啟音效"} aria-pressed={prefs.sound} onClick={() => setPrefs((p) => ({ ...p, sound: !p.sound }))}>
            <Icon name={prefs.sound ? "sound" : "mute"} />
          </button>
          <button className="icon-btn" aria-label="設定" onClick={() => open("settings")}>
            <Icon name="gear" />
          </button>
          <button className="icon-btn" aria-label="操作說明" onClick={() => open("help")}>
            <Icon name="help" />
          </button>
          <span className="home-status">
            {s.meeting.done ? (
              <>
                <Icon name="star" size={18} /> 已完成一次班會
              </>
            ) : (
              "點教室裡的角色，聽聽他們的想法"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 設定                                                                */
/* ------------------------------------------------------------------ */
function Settings({ onClose }: { onClose: () => void }) {
  const { prefs, setPrefs } = usePrefs();
  return (
    <Overlay title="設定" icon="gear" onClose={onClose}>
      <div className="settings">
        <label className="setting-row">
          <span>
            <b>音效</b>
            <small>點擊、成功與完成的提示聲</small>
          </span>
          <input type="checkbox" className="switch" checked={prefs.sound} onChange={(e) => setPrefs((p) => ({ ...p, sound: e.target.checked }))} />
        </label>
        <label className="setting-row">
          <span>
            <b>音量</b>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={prefs.volume}
            aria-label="音量"
            onChange={(e) => setPrefs((p) => ({ ...p, volume: Number(e.target.value) }))}
            onPointerUp={() => sfx.play("tap")}
          />
        </label>
        <div className="setting-row">
          <span>
            <b>動畫</b>
            <small>「自動」會依照裝置的減少動態設定</small>
          </span>
          <div className="seg" role="group" aria-label="動畫">
            {(
              [
                ["auto", "自動"],
                ["reduce", "減少"],
                ["full", "完整"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={prefs.motion === v ? "is-on" : ""} aria-pressed={prefs.motion === v} onClick={() => setPrefs((p) => ({ ...p, motion: v }))}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <label className="setting-row">
          <span>
            <b>省電模式</b>
            <small>關閉水彩濾鏡與粒子，適合較舊的平板</small>
          </span>
          <input type="checkbox" className="switch" checked={prefs.lowPower} onChange={(e) => setPrefs((p) => ({ ...p, lowPower: e.target.checked }))} />
        </label>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------------ */
/* 操作說明                                                            */
/* ------------------------------------------------------------------ */
function Help({ onClose }: { onClose: () => void }) {
  const items: { icon: Parameters<typeof Icon>[0]["name"]; title: string; text: string }[] = [
    { icon: "tap", title: "點一點", text: "點教室裡的同學，可以邀請他舉手發言。" },
    { icon: "hand", title: "輪流發言", text: "同學舉手後，依照順序一個一個說，聽完再請下一位。" },
    { icon: "bulb", title: "做決定", text: "對話框出現時，選一個做法，看看會帶來什麼影響。" },
    { icon: "faceHappy", title: "看結果", text: "上方三條儀表會改變，最後還能看到一週後的閱讀角。" },
    { icon: "reset", title: "再試一次", text: "換一個角色或做法，比較不同的結果。" },
    { icon: "save", title: "自動儲存", text: "進度存在這台裝置的瀏覽器，重新整理也不會不見。" },
  ];
  return (
    <Overlay title="操作說明" icon="help" wide onClose={onClose}>
      <div className="help-grid">
        {items.map((it) => (
          <div key={it.title} className="help-item">
            <span className="help-icon">
              <Icon name={it.icon} size={30} />
            </span>
            <b>{it.title}</b>
            <p>{it.text}</p>
          </div>
        ))}
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------------ */
/* 學習單                                                              */
/* ------------------------------------------------------------------ */
function Sheets({ s, ext, onClose, onExport }: { s: Progress; ext: MeetingExt; onClose: () => void; onExport: () => void }) {
  const [tab, setTab] = useState<"proposal" | "minutes" | "decisions">("proposal");
  const role = ROLES.find((r) => r.id === ext.role);
  const made = DECISIONS.filter((d) => ext.choices[d.id]);
  return (
    <Overlay title="我的學習單" icon="sheet" wide onClose={onClose}>
      <div className="seg sheet-tabs" role="tablist">
        {(
          [
            ["proposal", "我的提案單"],
            ["minutes", "會議紀錄"],
            ["decisions", "我的決定與反思"],
          ] as const
        ).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "is-on" : ""} onClick={() => setTab(id)}>
            {l}
          </button>
        ))}
      </div>
      <div className="sheet">
        {tab === "proposal" && (
          <dl className="sheet-dl">
            <dt>我發現的問題</dt>
            <dd>{s.proposal.problem || "（尚未填寫）"}</dd>
            <dt>我的提案</dt>
            <dd>{s.proposal.plan || "（尚未填寫）"}</dd>
            <dt>我的理由</dt>
            <dd>{s.proposal.reason || "（尚未填寫）"}</dd>
          </dl>
        )}
        {tab === "minutes" && (s.meeting.done ? <pre className="sheet-pre">{s.meeting.minutes}</pre> : <p className="muted">完成班會後，會議紀錄會出現在這裡。</p>)}
        {tab === "decisions" && (
          <>
            <p>
              <b>我扮演的角色：</b>
              {role ? role.name : "尚未選擇"}
            </p>
            <ul className="decision-log">
              {made.map((d) => {
                const o = d.options.find((x) => x.id === ext.choices[d.id])!;
                return (
                  <li key={d.id} className={o.good ? "is-good" : "is-think"}>
                    <Icon name={o.good ? "check" : "bulb"} size={16} />
                    <div>
                      {o.label}
                      <small>{o.result}</small>
                    </div>
                  </li>
                );
              })}
              {made.length === 0 && <li className="muted">還沒有做出決定。</li>}
            </ul>
            <p>
              <b>我的反思：</b>
              {ext.reflection || "（尚未填寫）"}
            </p>
          </>
        )}
      </div>
      <div className="foot-row">
        <button className="btn btn-soft" onClick={() => window.print()}>
          <Icon name="sheet" /> 列印
        </button>
        <button className="btn btn-primary" onClick={onExport}>
          <Icon name="download" /> 匯出學習成果
        </button>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------------ */
/* 教師入口                                                            */
/* ------------------------------------------------------------------ */
function Teacher({
  s,
  ext,
  onClose,
  go,
  onExport,
  onReset,
}: {
  s: Progress;
  ext: MeetingExt;
  onClose: () => void;
  go: (c: Chapter) => void;
  onExport: () => void;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<"goals" | "go" | "data">("goals");
  const [confirm, setConfirm] = useState(false);
  return (
    <Overlay title="教師入口" icon="teacher" wide onClose={onClose}>
      <div className="seg sheet-tabs" role="tablist">
        {(
          [
            ["goals", "學習目標"],
            ["go", "直接進入"],
            ["data", "本機成果"],
          ] as const
        ).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "is-on" : ""} onClick={() => setTab(id)}>
            {l}
          </button>
        ))}
      </div>
      {tab === "goals" && (
        <div className="teacher-goals">
          <p>對應課本「2 召開班級會議」p.5–12（依小組排版稿）。學生選擇主席、司儀、記錄或學生角色，在相同的六個程序中遇到不同的常見狀況，並觀察選擇造成的影響。</p>
          <ul>
            <li>知道幹部是為大家服務的人，能說出選舉四步驟。（p.5–6）</li>
            <li>能說出主席、司儀、記錄的工作，依正式六步驟進行班會。（p.7–8）</li>
            <li>會前提出書面提案；發言先舉手，經主席同意。（p.8–10）</li>
            <li>理解服從多數、尊重少數，並提出照顧少數的方法。（p.11–12）</li>
          </ul>
          <p className="small muted">
            表決票數 6／18／4 為教材固定示範，不是學生投票。角色台詞、常見狀況分支與一週模擬為遊戲延伸內容，結果由預先設定的規則產生，不使用 AI。
          </p>
          <h3 className="sub-title">引導問題</h3>
          <ul>
            <li>如果主席讓好朋友先說，其他同學會有什麼感覺？</li>
            <li>表決以後，為什麼還要聽小米的擔心？</li>
            <li>你扮演的角色，哪一個決定最重要？為什麼？</li>
          </ul>
        </div>
      )}
      {tab === "go" && (
        <div className="chapter-grid">
          {CHAPTERS.map((c, i) => (
            <button key={c.id} className="chapter-card" onClick={() => go(c.id)}>
              <span className="chapter-num">{i + 1}</span>
              <b>{c.title}</b>
              <span>{c.text}</span>
              <small>{c.pages}</small>
            </button>
          ))}
        </div>
      )}
      {tab === "data" && (
        <div>
          <p className="small">成果只存在這台裝置的瀏覽器。沒有後端時，老師無法直接看到其他學生裝置上的紀錄，請學生匯出檔案。</p>
          <ul className="data-list">
            <li>幹部選舉：{s.election.winner ? `完成（${s.election.winner}）` : "未完成"}</li>
            <li>提案單：{Object.values(s.proposal).every((v) => v.trim()) ? "完成" : "未完成"}</li>
            <li>班會：{s.meeting.done ? "完成" : `進行到第 ${s.meeting.step + 1} 個程序`}</li>
            <li>角色：{ROLES.find((r) => r.id === ext.role)?.name ?? "尚未選擇"}</li>
            <li>反思：{ext.reflection ? "已填寫" : "未填寫"}</li>
          </ul>
          <div className="foot-row">
            <button className="btn btn-primary" onClick={onExport}>
              <Icon name="download" /> 匯出 JSON
            </button>
            {!confirm ? (
              <button className="btn btn-soft" onClick={() => setConfirm(true)}>
                <Icon name="reset" /> 重設示範進度
              </button>
            ) : (
              <button className="btn btn-danger" onClick={onReset}>
                確定清除這台裝置的進度
              </button>
            )}
          </div>
        </div>
      )}
      <div className="teacher-cast" aria-hidden="true">
        <Portrait look="teacher" mood="happy" size={56} />
      </div>
    </Overlay>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PrefsProvider>
      <App />
    </PrefsProvider>
  </React.StrictMode>,
);
