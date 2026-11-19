import { useEffect, useMemo, useRef, useState } from "react";
import { Character, Portrait, type Marker, type Mood, type Pose } from "../art/Character";
import { SvgDefs } from "../art/SvgDefs";
import { Icon } from "../components/icons";
import { usePrefs } from "../ui/prefs";
import { sfx } from "../ui/sfx";
import { SHORTS, fmtTime, shortDuration, type Actor, type Scene, type ShortId } from "./shortsData";

/**
 * 學習小短片播放器：以遊戲同款分層角色即時演出（非影片檔），
 * 字幕為 DOM 文字（注音模式自動加注音），可暫停、重播、跳到段落、朗讀旁白。
 */
const easeBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function actorState(a: Actor, lt: number) {
  let pose: Pose = "stand";
  let mood: Mood = "idle";
  let marker: Marker = null;
  for (const [t, p, m, mk] of a.acts ?? []) {
    if (lt >= t) {
      pose = p;
      mood = m;
      marker = mk ?? null;
    }
  }
  let x = a.x;
  let opacity = 1;
  if (a.enterFrom !== undefined) {
    const t0 = a.enterAt ?? 0;
    const k = Math.min(1, Math.max(0, (lt - t0) / 0.7));
    x = a.x + a.enterFrom * (1 - easeBack(k));
    opacity = lt < t0 ? 0 : Math.min(1, k * 2);
  }
  return { pose, mood, marker, x, opacity };
}

function Stage({ scene, lt, reduced }: { scene: Scene; lt: number; reduced: boolean }) {
  const bannerK = Math.min(1, lt / 0.45);
  const tally = scene.tally;
  return (
    <svg className="short-stage scene-svg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <SvgDefs />
      {/* 教室前方背景 */}
      <rect width="1280" height="720" fill="#f6eedd" />
      <rect y="400" width="1280" height="75" fill="#cfe2d4" />
      <rect y="475" width="1280" height="245" fill="#ece4d3" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={i * 160} y1={475} x2={i * 160 - 180} y2={720} stroke="#ddd2bd" strokeWidth={2} />
      ))}
      <line x1="0" y1="475" x2="1280" y2="475" stroke="#c9b48f" strokeWidth={3} />
      {/* 窗戶 */}
      {[60, 1060].map((x, i) => (
        <g key={x}>
          <rect x={x} y={150} width={160} height={210} rx={6} fill="#fffaf0" stroke="#8a7354" strokeWidth={3} />
          <rect x={x + 10} y={160} width={140} height={190} fill="url(#g-sky)" />
          <circle cx={x + 50} cy={320} r={34} fill="#a9cf95" />
          <circle cx={x + 110} cy={330} r={26} fill="#93c182" />
          <rect className="curtain" x={i ? x + 120 : x} y={140} width={40} height={230} fill="#f6c3b9" opacity={0.95} />
        </g>
      ))}
      {/* 三角旗 */}
      {Array.from({ length: 14 }, (_, i) => (
        <polygon key={i} points={`${70 + i * 82},92 ${110 + i * 82},92 ${90 + i * 82},124`} fill={["#e98a7c", "#65afa5", "#d6b563"][i % 3]} />
      ))}
      {/* 黑板 */}
      <rect x={300} y={130} width={680} height={290} rx={10} fill="#a9825a" />
      <rect x={316} y={146} width={648} height={258} rx={6} fill="url(#g-board)" />
      <rect x={330} y={404} width={620} height={12} fill="#c99a6b" />
      {scene.board && (
        <g className="board-text">
          <text x={640} y={200} textAnchor="middle" fontSize={40} fill="#fdfbf2" fontWeight={700}>
            {scene.board.title}
          </text>
          {scene.board.lines.map((l, i) => {
            const at = scene.board!.revealAt?.[i] ?? 0;
            if (lt < at) return null;
            const two = scene.board!.lines.length > 4;
            const col = two ? Math.floor(i / 3) : 0;
            const row = two ? i % 3 : i;
            const hl = scene.board!.highlight === i;
            return (
              <text
                key={i}
                x={two ? 360 + col * 310 : 640}
                y={265 + row * (two ? 50 : 52)}
                textAnchor={two ? "start" : "middle"}
                fontSize={two ? 30 : 36}
                fill={hl ? "#ffe39a" : "#e9efe6"}
                fontWeight={hl ? 800 : 500}
                className="chalk-in"
              >
                {hl ? "▸ " : ""}
                {l}
              </text>
            );
          })}
        </g>
      )}
      {/* 計票 */}
      {tally && lt >= tally.at && (
        <g className="tally">
          <rect x={360} y={170} width={560} height={tally.rows.length * 64 + 80} rx={12} fill="#fffdf6" stroke="#5b4636" strokeWidth={3} />
          {tally.note && (
            <text x={640} y={205} textAnchor="middle" fontSize={22} fill="#a8873a" fontWeight={700}>
              {tally.note}
            </text>
          )}
          {tally.rows.map((r, i) => {
            const k = Math.min(1, (lt - tally.at) / tally.dur);
            const v = Math.round(r.to * k);
            const y = 230 + i * 64;
            const max = Math.max(...tally.rows.map((x) => x.to), 20);
            return (
              <g key={r.label}>
                <text x={390} y={y + 30} fontSize={30} fill="#2f3f35" fontWeight={700}>
                  {r.label}
                </text>
                <rect x={540} y={y + 6} width={300} height={34} rx={10} fill="#efe6d4" />
                <rect x={540} y={y + 6} width={Math.max(8, (v / max) * 300)} height={34} rx={10} fill={r.color ?? "#65afa5"} />
                <text x={890} y={y + 34} fontSize={34} fill="#2f3f35" fontWeight={900} textAnchor="end">
                  {v}
                </text>
              </g>
            );
          })}
        </g>
      )}
      {/* 角色 */}
      {scene.actors.map((a) => {
        const st = actorState(a, lt);
        return (
          <g key={a.id} opacity={st.opacity}>
            <Character look={a.look} x={st.x} y={a.y ?? 548} scale={a.scale ?? 1.75} pose={st.pose} mood={st.mood} marker={st.marker} sash={a.sash} />
            {a.tag && (
              <g transform={`translate(${st.x} ${(a.y ?? 548) - (a.look === "teacher" ? 330 : 262)})`}>
                <rect x={-58} y={-20} width={116} height={40} rx={20} fill={a.sash ?? "#405d4a"} />
                <text textAnchor="middle" y={9} fontSize={24} fill="#fff" fontWeight={800}>
                  {a.tag}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {/* 拍手 */}
      {scene.clap !== undefined && lt >= scene.clap && !reduced &&
        [0, 1, 2, 3, 4, 5].map((i) => (
          <text key={i} className="clap-pop" x={180 + i * 190} y={520 - (i % 2) * 40} fontSize={34} fill="#d6b563" style={{ animationDelay: `${i * 0.18}s` }}>
            ✦
          </text>
        ))}
      {/* 標題橫幅 */}
      {scene.banner && (
        <g transform={`translate(640 ${-40 + 100 * (reduced ? 1 : easeBack(bannerK))})`}>
          <rect x={-330} y={-38} width={660} height={76} rx={38} fill="#405d4a" />
          <rect x={-330} y={-38} width={660} height={76} rx={38} fill="none" stroke="#fffaf0" strokeWidth={4} strokeDasharray="10 8" />
          <text textAnchor="middle" y={14} fontSize={38} fontWeight={900} fill="#fffaf0">
            {scene.banner}
          </text>
        </g>
      )}
      {/* 整理卡 */}
      {scene.recap && (
        <g>
          <rect x={300} y={140} width={680} height={380} rx={24} fill="#fffaf0" stroke="#e0d3bb" strokeWidth={4} />
          <text x={640} y={210} textAnchor="middle" fontSize={44} fontWeight={900} fill="#405d4a">
            {scene.recap.title}
          </text>
          {scene.recap.items.map((it, i) => {
            const show = lt >= 0.5 + i * 0.6;
            const n = scene.recap!.items.length;
            const y = 270 + i * (n > 4 ? 40 : 60);
            return show ? (
              <g key={it} className="chalk-in">
                <circle cx={380} cy={y - 10} r={18} fill={["#e98a7c", "#65afa5", "#d6b563", "#8fa8d6", "#7fb88f", "#c9a6d6"][i]} />
                <text x={380} y={y - 2} textAnchor="middle" fontSize={22} fill="#fff" fontWeight={900}>
                  {i + 1}
                </text>
                <text x={414} y={y} fontSize={n > 4 ? 28 : 32} fill="#2f3f35" fontWeight={700}>
                  {it}
                </text>
              </g>
            ) : null;
          })}
        </g>
      )}
    </svg>
  );
}

export function ShortPlayer({ id, onClose }: { id: ShortId; onClose: () => void }) {
  const short = SHORTS.find((s) => s.id === id)!;
  const total = shortDuration(short);
  const { reduced, prefs } = usePrefs();
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [narrate, setNarrate] = useState(false);
  const last = useRef(performance.now());
  const spoken = useRef("");
  const starts = useMemo(() => {
    let acc = 0;
    return short.scenes.map((s) => {
      const st = acc;
      acc += s.dur;
      return st;
    });
  }, [short]);

  // 播放迴圈
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    last.current = performance.now();
    const step = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setT((v) => {
        const nv = Math.min(total, v + dt);
        if (nv >= total) setPlaying(false);
        return nv;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  // 輕快背景音樂
  useEffect(() => {
    sfx.setTempo(118);
    sfx.startMusic();
    return () => {
      sfx.setTempo(88);
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    const hide = () => document.hidden && setPlaying(false);
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  let si = starts.findIndex((st, i) => t >= st && t < st + short.scenes[i].dur);
  if (si < 0) si = short.scenes.length - 1;
  const scene = short.scenes[si];
  const lt = t - starts[si];
  const cap = [...scene.captions].reverse().find((c) => lt >= c.at);
  const ended = t >= total;

  // 場景切換音效與旁白朗讀
  const prevScene = useRef(si);
  useEffect(() => {
    if (prevScene.current !== si) sfx.play("page");
    prevScene.current = si;
  }, [si]);
  useEffect(() => {
    if (!cap || !narrate || !playing) return;
    const k = `${si}-${cap.at}`;
    if (spoken.current === k) return;
    spoken.current = k;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(cap.text.replace(/（.*?）/g, ""));
      u.lang = "zh-TW";
      u.rate = 1.05;
      u.pitch = cap.who === "林老師" || cap.who === "旁白" ? 1 : 1.25;
      const v = synth.getVoices().find((x) => x.lang.replace("_", "-").startsWith("zh-TW"));
      if (v) u.voice = v;
      synth.speak(u);
    } catch {
      /* 不支援朗讀時只顯示字幕 */
    }
  }, [cap, narrate, playing, si]);
  useEffect(() => {
    if (ended) sfx.play("complete");
  }, [ended]);

  return (
    <div className="overlay short-overlay" role="dialog" aria-modal="true" aria-label={`小短片：${short.title}`}>
      <div className="short-card">
        <header className="short-head">
          <Icon name="play" size={22} />
          <div>
            <b>{short.title}</b>
            <small>{short.sub}</small>
          </div>
          <button className="icon-btn" aria-label="關閉短片" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="short-screen" onClick={() => !ended && setPlaying((p) => !p)}>
          <Stage scene={scene} lt={lt} reduced={reduced} />
          {cap && (
            <div className="short-caption" key={`${si}-${cap.at}`}>
              {cap.look && <Portrait look={cap.look} mood="talking" size={56} />}
              <p>
                <b>{cap.who}：</b>
                {cap.text}
              </p>
            </div>
          )}
          {!playing && !ended && (
            <div className="short-paused" aria-hidden="true">
              <Icon name="play" size={64} />
            </div>
          )}
          {ended && (
            <div className="short-end">
              <b>看完了！</b>
              <div className="foot-row">
                <button
                  className="btn btn-soft"
                  onClick={(e) => {
                    e.stopPropagation();
                    setT(0);
                    spoken.current = "";
                    setPlaying(true);
                  }}
                >
                  <Icon name="reset" /> 再看一次
                </button>
                <button
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                >
                  <Icon name="check" /> 我看懂了
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="short-controls">
          <button className="icon-btn" aria-label={playing ? "暫停" : "播放"} onClick={() => (ended ? (setT(0), setPlaying(true)) : setPlaying((p) => !p))}>
            <Icon name={playing ? "pause" : "play"} />
          </button>
          <div className="short-bar" role="group" aria-label="段落">
            {short.scenes.map((sc, i) => (
              <button
                key={i}
                className={`short-seg ${i < si ? "done" : i === si ? "now" : ""}`}
                style={{ flex: sc.dur }}
                aria-label={`跳到第 ${i + 1} 段${sc.banner ? `：${sc.banner}` : ""}`}
                onClick={() => {
                  setT(starts[i]);
                  spoken.current = "";
                  setPlaying(true);
                }}
              >
                {i === si && <i style={{ width: `${(lt / sc.dur) * 100}%` }} />}
              </button>
            ))}
          </div>
          <span className="short-time">
            {fmtTime(t)}／{fmtTime(total)}
          </span>
          <button
            className={`chip ${narrate ? "is-ok" : ""}`}
            aria-pressed={narrate}
            onClick={() => {
              setNarrate((n) => !n);
              spoken.current = "";
              if (narrate) window.speechSynthesis?.cancel();
            }}
            disabled={!("speechSynthesis" in window) || !prefs.sound}
          >
            <Icon name="sound" size={18} /> 朗讀
          </button>
        </div>
      </div>
    </div>
  );
}

/** 短片選單卡片 */
export function ShortList({ onPlay }: { onPlay: (id: ShortId) => void }) {
  return (
    <div className="short-list">
      {SHORTS.map((s, i) => (
        <button key={s.id} className="short-item" onClick={() => onPlay(s.id)}>
          <span className="short-thumb" aria-hidden="true">
            <Portrait look={(["anan", "npc0", "mi"] as const)[i]} mood="happy" size={52} />
            <Icon name="play" size={22} />
          </span>
          <span>
            <b>{s.title}</b>
            <small>{s.sub}</small>
            <small className="muted">片長 {fmtTime(shortDuration(s))}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
