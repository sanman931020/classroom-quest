import { characters, stations } from "../data/content";
import { serviceComplete } from "../simulation/engine";
import { Field, Panel, type ActivityProps } from "../components/shared";
export function Service({ s, update, notify }: ActivityProps) {
  const st = stations.find((t) => t.id === s.service.station)!;
  return (
    <div className="activity-grid">
      <div>
        <Panel title="選擇你的服務任務">
          <p>四站都能探索，完成其中一站就能進入一週回饋。</p>
          <label className="field">
            我的角色
            <select
              value={s.service.role}
              onChange={(e) =>
                update((d) => {
                  d.service.role = e.target.value as typeof d.service.role;
                })
              }
            >
              {characters
                .filter((c) => c.id !== "teacher")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="campus">
            <div className="campus-path" />
            {stations.map((t) => (
              <button
                className={`station ${st.id === t.id ? "selected" : ""}`}
                key={t.id}
                onClick={() =>
                  update((d) => {
                    d.service.station = t.id;
                  })
                }
              >
                <span>{t.icon}</span>
                <strong>{t.name}</strong>
                <small>
                  {s.service.completed.includes(t.id)
                    ? "✓ 已完成"
                    : "進入服務站"}
                </small>
              </button>
            ))}
            <div className="campus-center">我們的校園</div>
          </div>
          <div className="safety">
            <b>安全小提醒</b>
            <p>
              遇到霸凌、威脅、受傷或危險，立即告訴老師或家長，不獨自調查或處理。
            </p>
          </div>
        </Panel>
        <Panel title={`${st.name}・服務開始`}>
          <p>{st.rule}</p>
          {st.tasks.map((t, i) => (
            <div className="task" key={`${st.id}:${t.id}`}>
              <h3>
                {i + 1}. {t.prompt}
              </h3>
              <div className="options">
                {t.options.map((v) => (
                  <button
                    key={v}
                    className={
                      s.service.answers[`${st.id}:${t.id}`] === v
                        ? "active"
                        : "secondary"
                    }
                    onClick={() => {
                      update((d) => {
                        d.service.answers[`${st.id}:${t.id}`] = v;
                        if (v !== t.correct)
                          d.service.completed = d.service.completed.filter(
                            (x) => x !== st.id,
                          );
                      });
                      notify(
                        v === t.correct
                          ? t.feedback
                          : "再想一想，依服務規範選擇安全、公平的做法。",
                      );
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {s.service.answers[`${st.id}:${t.id}`] && (
                <p className="hint">
                  {s.service.answers[`${st.id}:${t.id}`] === t.correct
                    ? `✓ ${t.feedback}`
                    : "還沒有完成，請依照規範再試一次。"}
                </p>
              )}
            </div>
          ))}
          <button
            className="wide"
            onClick={() => {
              if (!serviceComplete(s)) {
                notify("請完成本站每項任務，再提交服務成果。");
                return;
              }
              update((d) => {
                if (!d.service.completed.includes(st.id))
                  d.service.completed.push(st.id);
              });
              notify("服務任務完成！請記錄一週的觀察與改善建議。");
            }}
          >
            完成本站服務
          </button>
        </Panel>
      </div>
      <div>
        <Panel title="一週行動回饋">
          <span className="tag">學習單 ③</span>
          <p>試一試、看一看、說一說。每天依實際情況記錄，不必一次填完。</p>
          <p className="hint">
            試行約定：
            {s.meeting.done
              ? "依班會分區決議，一週後檢討。"
              : "預設情境：閱讀角分成安靜區與討論區，試行一週。"}
          </p>
          {s.service.completed.length === 0 ? (
            <p>完成任一服務站後開啟回饋單。你可以直接從本活動開始。</p>
          ) : (
            <>
              {s.week.map((day, i) => (
                <div className="day" key={i}>
                  <h3>星期{"一二三四五"[i]}</h3>
                  <div className="moods">
                    {["😊 笑臉", "😐 普通", "😟 難過"].map((v) => (
                      <button
                        key={v}
                        aria-pressed={day.mood === v}
                        className={day.mood === v ? "active" : "secondary"}
                        onClick={() =>
                          update((d) => {
                            d.week[i].mood = v;
                          })
                        }
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <Field
                    label={`星期${"一二三四五"[i]}，我發現`}
                    value={day.observation}
                    onChange={(v) =>
                      update((d) => {
                        d.week[i].observation = v;
                      })
                    }
                  />
                </div>
              ))}
              <Field
                label="下次班會，我的改善建議"
                value={s.improvement}
                onChange={(v) =>
                  update((d) => {
                    d.improvement = v;
                  })
                }
              />
              <p className="success">
                已記錄{" "}
                {s.week.filter((d) => d.mood && d.observation.trim()).length} /
                5 天。輸入時自動儲存。
              </p>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
