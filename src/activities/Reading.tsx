import { useRef, useState } from "react";
import { characters } from "../data/content";
import type { CharacterId, FurnitureId } from "../game/types";
import { checkRule, place, simulate } from "../simulation/engine";
import { Avatar, Field, Panel, type ActivityProps } from "../components/shared";
const furniture: { id: FurnitureId; name: string; icon: string }[] = [
  { id: "shelf", name: "書櫃", icon: "▥" },
  { id: "mat", name: "閱讀地墊", icon: "▧" },
  { id: "table", name: "討論桌椅", icon: "▰" },
];
export function Reading({ s, update, notify }: ActivityProps) {
  const [person, setPerson] = useState<CharacterId | null>(null);
  const [follow, setFollow] = useState(false);
  const [selected, setSelected] = useState<FurnitureId>("table");
  const [result, setResult] = useState<ReturnType<typeof simulate> | null>(
    null,
  );
  const drag = useRef<{ id: FurnitureId; x: number; y: number } | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const c = characters.find((c) => c.id === person);
  const checks = checkRule(s.rule);
  function move(id: FurnitureId, x: number, y: number) {
    const r = place(s.positions, id, { x, y });
    if (r.ok)
      update((d) => {
        d.positions = r.positions;
        d.readingDone = false;
      });
    setResult(null);
    notify(r.reason);
  }
  return (
    <div className="activity-grid">
      <div>
        <Panel title="先聽聽大家的需要">
          <p>點選五位夥伴，蒐集線索，再整理問題。</p>
          <div className="cast">
            {characters.map((c) => (
              <button
                className={`character ${s.clues.includes(c.id) ? "visited" : ""}`}
                key={c.id}
                onClick={() => {
                  setPerson(c.id);
                  setFollow(false);
                  update((d) => {
                    if (!d.clues.includes(c.id)) d.clues.push(c.id);
                  });
                }}
              >
                <Avatar id={c.id} />
                <strong>{c.name}</strong>
                <small>{s.clues.includes(c.id) ? "已聆聽 ✓" : "聊一聊"}</small>
              </button>
            ))}
          </div>
          {c && (
            <div className="dialogue">
              <strong>
                {c.name}・{c.look}
              </strong>
              <p>{follow ? c.followup : c.need}</p>
              <button className="secondary" onClick={() => setFollow(!follow)}>
                {follow ? "回到需要" : "我可以怎麼幫忙？"}
              </button>
            </div>
          )}
          <p className="eyebrow">線索 {s.clues.length} / 5</p>
          {characters
            .filter((c) => s.clues.includes(c.id))
            .map((c) => (
              <label className="classification" key={c.id}>
                {c.name}
                <select
                  aria-label={`${c.name}問題分類`}
                  value={s.categories[c.id] || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    update((d) => {
                      d.categories[c.id] = value;
                      d.readingDone = false;
                    });
                  }}
                >
                  <option value="">選擇問題分類</option>
                  {["公平使用", "聲音干擾", "環境整理", "公約原則"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
        </Panel>
        <Panel title="動手改造閱讀角">
          <p>拖曳家具，或選家具後點空格。最下排保留為通道。</p>
          <div className="toolbar">
            {furniture.map((f) => (
              <button
                key={f.id}
                aria-pressed={selected === f.id}
                className={selected === f.id ? "active" : "secondary"}
                onClick={() => {
                  setSelected(f.id);
                  notify(`已選取${f.name}，請點教室空格。`);
                }}
              >
                {f.name}
              </button>
            ))}
            <button
              className="secondary"
              onClick={() => {
                update((d) => {
                  d.positions = {
                    shelf: { x: 1, y: 1 },
                    mat: { x: 3, y: 2 },
                    table: { x: 4, y: 2 },
                  };
                  d.readingDone = false;
                });
                setResult(null);
                notify("已重設家具位置。");
              }}
            >
              重設家具
            </button>
          </div>
          <div
            ref={board}
            className="room"
            aria-label="教室家具配置"
            onPointerUp={(e) => {
              const g = drag.current;
              if (!g) return;
              drag.current = null;
              if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 8) return;
              const r = board.current!.getBoundingClientRect();
              move(
                g.id,
                ((e.clientX - r.left) / r.width) * 8 - 0.5,
                ((e.clientY - r.top) / r.height) * 4 - 0.5,
              );
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            {Array.from({ length: 32 }, (_, i) => (
              <button
                key={i}
                className={`tile ${i >= 24 ? "aisle" : ""}`}
                aria-label={`放置家具於第${(i % 8) + 1}欄第${Math.floor(i / 8) + 1}排`}
                onClick={() => move(selected, i % 8, Math.floor(i / 8))}
              >
                {i >= 24 ? "通道" : ""}
              </button>
            ))}
            {furniture.map((f) => (
              <button
                key={f.id}
                aria-label={`選取${f.name}`}
                className={`furniture ${f.id} ${selected === f.id ? "selected" : ""}`}
                style={{
                  left: `${(s.positions[f.id].x + 0.08) * 12.5}%`,
                  top: `${(s.positions[f.id].y + 0.1) * 25}%`,
                }}
                onPointerDown={(e) => {
                  setSelected(f.id);
                  drag.current = { id: f.id, x: e.clientX, y: e.clientY };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onClick={() => setSelected(f.id)}
              >
                <span>{f.icon}</span>
                {f.name}
              </button>
            ))}
          </div>
          <p className="hint">
            模擬規則：討論桌與閱讀地墊至少相隔三格。書櫃不能擋住通道。
          </p>
        </Panel>
      </div>
      <div>
        <Panel title="公約小檢查">
          <span className="tag">學習單 ①</span>
          <Field
            label="什麼時間？"
            value={s.rule.when}
            placeholder="例如：午休時"
            onChange={(v) =>
              update((d) => {
                d.rule.when = v;
                d.readingDone = false;
              })
            }
          />
          <label className="field">
            誰要遵守？
            <select
              value={s.rule.who}
              onChange={(e) =>
                update((d) => {
                  d.rule.who = e.target.value;
                  d.readingDone = false;
                })
              }
            >
              <option>全班同學</option>
              <option>只有男生</option>
              <option>只有女生</option>
            </select>
          </label>
          <Field
            label="要怎麼做？"
            value={s.rule.action}
            placeholder="例如：閱讀時小聲，想討論到討論桌"
            onChange={(v) =>
              update((d) => {
                d.rule.action = v;
                d.readingDone = false;
              })
            }
          />
          <label className="check">
            <input
              type="checkbox"
              checked={s.rule.care}
              onChange={(e) =>
                update((d) => {
                  d.rule.care = e.target.checked;
                  d.readingDone = false;
                })
              }
            />
            我已照顧安靜與討論兩種需要
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.rule.possible}
              onChange={(e) =>
                update((d) => {
                  d.rule.possible = e.target.checked;
                  d.readingDone = false;
                })
              }
            />
            我們有時間、空間和物品做到
          </label>
          <div className="checks">
            {[
              ["clear", "清楚嗎"],
              ["fair", "公平嗎"],
              ["possible", "做得到嗎"],
            ].map(([k, v]) => (
              <span key={k}>
                {checks[k as keyof typeof checks] ? "✓" : "○"} {v}
              </span>
            ))}
          </div>
          <button
            className="wide"
            onClick={() => {
              const r = simulate(s);
              setResult(r);
              update((d) => {
                d.readingDone = r.pass;
              });
              notify(
                r.pass
                  ? "改造完成！公約與空間都通過簡化檢查。"
                  : "看看夥伴的回饋，再修改一次。",
              );
            }}
          >
            啟動情境模擬
          </button>
          {result && (
            <div className="feedback">
              <h3>{result.pass ? "改造計畫通過！" : "再調整一下"}</h3>
              {result.feedback.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
          )}
          {s.readingDone && <p className="success">✓ 公約小檢查已完成並儲存</p>}
        </Panel>
      </div>
    </div>
  );
}
