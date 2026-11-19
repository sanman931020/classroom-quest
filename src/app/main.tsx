import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Reading } from "../activities/Reading";
import { Meeting } from "../activities/Meeting";
import { Service } from "../activities/Service";
import { Avatar } from "../components/shared";
import { characters } from "../data/content";
import type { Progress, Scene } from "../game/types";
import { download, load, save } from "../storage/progress";
import "./styles.css";
const activities = [
  {
    id: "reading",
    title: "閱讀角改造計畫",
    subtitle: "聽見不同需要，打造大家的閱讀角",
    label: "探索 × 動手改造",
    icon: "▤",
  },
  {
    id: "meeting",
    title: "班會大挑戰",
    subtitle: "當一次主席，一起做出班級決定",
    label: "角色扮演 × 討論表決",
    icon: "☏",
  },
  {
    id: "service",
    title: "校園服務特攻隊",
    subtitle: "化身服務夥伴，讓校園更美好",
    label: "服務行動 × 一週反思",
    icon: "⚑",
  },
] as const;
function App() {
  const [loaded] = useState(load);
  const [s, setS] = useState(loaded.state);
  const [message, notify] = useState(loaded.error || "歡迎來到我們這一班！");
  const [storage, setStorage] = useState("正在讀取進度");
  function update(fn: (draft: Progress) => void) {
    setS((prev) => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  }
  useEffect(() => {
    setStorage(save(s));
  }, [s]);
  function navigate(scene: Scene) {
    update((d) => {
      d.scene = scene;
    });
    window.scrollTo(0, 0);
    notify(
      scene === "home" ? "回到活動地圖。" : "可以隨時返回首頁，進度會保留。",
    );
  }
  const done = [s.readingDone, s.meeting.done, s.service.completed.length > 0];
  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-mark">班</span>
          <span>
            我們這一班！<small>CLASSROOM QUEST</small>
          </span>
        </button>
        <nav aria-label="主要導覽">
          <button className="secondary" onClick={() => navigate("home")}>
            活動地圖
          </button>
          <button
            className="secondary"
            onClick={() => {
              download(s);
              notify("學習成果已匯出為 JSON 檔。");
            }}
          >
            匯出學習成果
          </button>
        </nav>
      </header>
      <main>
        {s.scene === "home" ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">三年級上學期・社會第三單元</p>
                <h1>
                  快樂的班級生活
                  <br />
                  <em>從我們一起開始。</em>
                </h1>
                <p className="intro">
                  每一個想法，都值得被聽見。
                  <br />
                  一起改造閱讀角、練習開班會，
                  <br />
                  再把關心變成小小的服務行動。
                </p>
                <button onClick={() => navigate("reading")}>
                  開始我們的班級任務
                </button>
                <p className="hero-note">三個活動自由探索・進度自動保留</p>
              </div>
              <div className="hero-scene" aria-label="簡化紙雕教室示意">
                <div className="room-wall">
                  <span>一起決定，一起負責</span>
                  <div className="window-art" />
                  <div className="board-art">我們的閱讀角</div>
                </div>
                <div className="floor-art" />
                <div className="books-art">▥ ▥ ▥</div>
                <div className="rug-art" />
                <div className="hero-cast">
                  {characters.slice(0, 4).map((c) => (
                    <div key={c.id}>
                      <Avatar id={c.id} />
                      <b>{c.name}</b>
                    </div>
                  ))}
                </div>
                <div className="paper-label">今天，也聽聽你的想法。</div>
              </div>
            </section>
            <section className="journey">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">一起學習自治</p>
                  <h2>我們的班級任務</h2>
                </div>
                <p>已完成 {done.filter(Boolean).length} / 3 個活動</p>
              </div>
              <div className="activity-cards">
                {activities.map((a, i) => (
                  <button
                    key={a.id}
                    className={`activity-card card-${i}`}
                    onClick={() => navigate(a.id)}
                  >
                    <span className="card-symbol">{a.icon}</span>
                    <span className="tag">{a.label}</span>
                    <h3>{a.title}</h3>
                    <p>{a.subtitle}</p>
                    <strong>
                      {done[i] ? "✓ 已完成・再次探索" : "進入活動"}
                    </strong>
                  </button>
                ))}
              </div>
            </section>
            <section className="home-note">
              <b>給小小自治夥伴</b>
              <p>
                影響大家的事情，我們一起討論、一起決定，也一起遵守、一起負責。
              </p>
            </section>
          </>
        ) : (
          <>
            <div className="activity-heading">
              <div>
                <p className="eyebrow">
                  快樂的班級生活・活動{" "}
                  {activities.findIndex((a) => a.id === s.scene) + 1}
                </p>
                <h1>{activities.find((a) => a.id === s.scene)?.title}</h1>
                <p>{activities.find((a) => a.id === s.scene)?.subtitle}</p>
              </div>
              <button className="secondary" onClick={() => navigate("home")}>
                返回活動地圖
              </button>
            </div>
            {s.scene === "reading" ? (
              <Reading s={s} update={update} notify={notify} />
            ) : s.scene === "meeting" ? (
              <Meeting s={s} update={update} notify={notify} />
            ) : (
              <Service s={s} update={update} notify={notify} />
            )}
          </>
        )}
      </main>
      <aside className="statusbar" role="status" aria-live="polite">
        <span>{message}</span>
        <small>{storage}</small>
      </aside>
      <footer>
        《我們這一班！》互動核心原型・依提供之課本排版稿轉化，台詞與互動情境為自編。
        <br />
        本機儲存，請在同一瀏覽器繼續；正式插畫與音效待下一階段製作。
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
