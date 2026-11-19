import {
  characters,
  electionSteps,
  meetingSteps,
  officers,
  plans,
  sampleVotes,
} from "../data/content";
import { nextMeeting } from "../simulation/engine";
import { Avatar, Field, Panel, type ActivityProps } from "../components/shared";
export function Meeting({ s, update, notify }: ActivityProps) {
  const m = s.meeting,
    e = s.election;
  function next() {
    const r = nextMeeting(s);
    notify(r.reason);
    if (r.ok)
      update((d) => {
        if (d.meeting.step === 5) {
          const temporary = d.meeting.minutes;
          d.meeting.done = true;
          d.meeting.minutes = `議題：${d.proposal.problem}\n提案：${d.proposal.plan}\n理由：${d.proposal.reason}\n教材示範：安靜6、分區18、輪流4票；決議分區。\n照顧少數：${d.meeting.minority}\n臨時動議：${temporary || "無"}\n一週後檢討。`;
        } else d.meeting.step++;
      });
  }
  return (
    <div className="activity-grid">
      <div>
        <Panel title="先選出願意服務的幹部">
          <div className="officers">
            {officers.map(([n, w]) => (
              <div key={n}>
                <strong>{n}</strong>
                <p>{w}</p>
              </div>
            ))}
          </div>
          <ol className="steps">
            {electionSteps.map((v, i) => (
              <li key={v} className={i === e.step ? "current" : ""}>
                {v}
              </li>
            ))}
          </ol>
          {!e.winner ? (
            <>
              <label className="field">
                {e.step === 2
                  ? "我的舉手支持"
                  : "提名班長（任期：本次教學演練）"}
                <select
                  value={e.step === 2 ? e.vote : e.nominee}
                  disabled={e.step !== 0 && e.step !== 2}
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
              <p>
                {e.step === 1
                  ? "候選政見：安安會每天確認值日表；阿哲會清楚記錄大家的需求。附議後一起比較服務能力。"
                  : e.step === 3
                    ? `教學模擬：你的支持對象「${e.vote}」獲16票，另一位12票。不是實際學生投票。`
                    : "選擇願意負責、熱心服務的人。"}
              </p>
              <button
                onClick={() => {
                  if (
                    (e.step === 0 && !e.nominee) ||
                    (e.step === 2 && !e.vote)
                  ) {
                    notify("請先選擇人選。");
                    return;
                  }
                  update((d) => {
                    if (d.election.step === 3)
                      d.election.winner = d.election.vote;
                    else d.election.step++;
                  });
                }}
              >
                {
                  ["確認提名", "我附議，完成討論", "舉手支持", "宣布選舉結果"][
                    e.step
                  ]
                }
              </button>
            </>
          ) : (
            <p className="success">
              本次教學模擬班長：{e.winner}。每一位同學都有服務的機會。
            </p>
          )}
        </Panel>
        <Panel title="我的提案單">
          <span className="tag">學習單 ②・會前完成</span>
          {(["problem", "plan", "reason"] as const).map((key, i) => (
            <Field
              key={key}
              label={["我發現的問題", "我的提案", "我的理由"][i]}
              value={s.proposal[key]}
              onChange={(v) =>
                update((d) => {
                  d.proposal[key] = v;
                })
              }
            />
          ))}
        </Panel>
      </div>
      <div>
        <Panel title="今天，換你主持班會">
          <div className="role-cards">
            <p>
              <b>主席</b>主持會議（你）
            </p>
            <p>
              <b>司儀</b>宣布程序（安安）
            </p>
            <p>
              <b>記錄</b>記下討論（阿哲）
            </p>
          </div>
          <ol className="steps vertical">
            {meetingSteps.map((v, i) => (
              <li key={v} className={i === m.step ? "current" : ""}>
                <button
                  className="step-button"
                  onClick={() =>
                    notify(
                      i === m.step
                        ? `目前：${v}。請完成此程序。`
                        : "請依序完成目前程序，再前進。",
                    )
                  }
                >
                  {i + 1}. {v}
                </button>
              </li>
            ))}
          </ol>
          <div className="chalkboard">
            <span>三年二班・班會</span>
            <h3>{meetingSteps[m.step]}</h3>
            <p>
              {
                [
                  "司儀：大家準備好了，請主席宣布開會。",
                  "主席：今天一起解決閱讀角的使用問題。",
                  "班長：借書後要歸位；衛生股長：請維持閱讀角整潔。",
                  "先附議，再邀請同學輪流發言，充分討論後表決。",
                  "有沒有臨時提出的新問題？請在下方補充紀錄。",
                  "主席：謝謝大家的參與，會後請林老師指導。",
                ][m.step]
              }
            </p>
          </div>
          {m.step === 3 && (
            <>
              <button
                className="secondary"
                onClick={() => {
                  update((d) => {
                    d.meeting.seconded = true;
                  });
                  notify("小米已附議，現在邀請大家舉手。");
                }}
              >
                {m.seconded ? "✓ 已附議" : "徵求附議"}
              </button>
              <div className="cast compact">
                {characters
                  .filter((c) => ["mi", "hao", "zhe"].includes(c.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      className="character"
                      onClick={() => {
                        if (!m.seconded) {
                          notify("先徵求附議，再展開討論。");
                          return;
                        }
                        update((d) => {
                          if (
                            !d.meeting.queue.includes(c.id) &&
                            !d.meeting.heard.includes(c.id) &&
                            d.meeting.speaker !== c.id
                          )
                            d.meeting.queue.push(c.id);
                        });
                      }}
                    >
                      <Avatar id={c.id} small />
                      <b>{c.name}</b>
                      <small>
                        {m.heard.includes(c.id) ? "已發言" : "舉手申請"}
                      </small>
                    </button>
                  ))}
              </div>
              <p>
                等待發言：
                {m.queue
                  .map((id) => characters.find((c) => c.id === id)!.name)
                  .join("、") || "無"}
              </p>
              <button
                className="secondary"
                onClick={() => {
                  if (m.speaker) {
                    notify("請先聆聽目前同學。");
                    return;
                  }
                  if (!m.queue.length) {
                    notify("請先邀請同學舉手。");
                    return;
                  }
                  update((d) => {
                    d.meeting.speaker = d.meeting.queue.shift()!;
                  });
                }}
              >
                主席同意下一位發言
              </button>
              {m.speaker && (
                <div className="dialogue">
                  <b>{characters.find((c) => c.id === m.speaker)!.name}</b>
                  <p>
                    {m.speaker === "mi"
                      ? "我支持安靜閱讀，也希望大家考慮怕吵的人。"
                      : m.speaker === "hao"
                        ? "分成安靜區與討論區，可以一起使用。"
                        : "也可以每天輪流，記下使用的時間。"}
                  </p>
                  <button
                    onClick={() =>
                      update((d) => {
                        d.meeting.heard.push(d.meeting.speaker!);
                        d.meeting.speaker = null;
                      })
                    }
                  >
                    我聽完了
                  </button>
                </div>
              )}
              <button
                className="wide"
                onClick={() => {
                  if (m.heard.length < 3 || m.speaker || m.queue.length) {
                    notify("三種意見都聽完，才能表決。");
                    return;
                  }
                  update((d) => {
                    d.meeting.voted = true;
                  });
                  notify("示範表決完成：分區方案18票通過，接著聽聽少數需要。");
                }}
              >
                進行教材示範表決
              </button>
              {m.voted && (
                <div className="votes">
                  <p>
                    教材固定示範・共28票
                    <br />
                    不是實際學生投票結果
                  </p>
                  {plans.map((v, i) => (
                    <div key={v}>
                      {v}
                      <b>{sampleVotes[i]} 票</b>
                      <meter aria-label={v} max={28} value={sampleVotes[i]} />
                    </div>
                  ))}
                </div>
              )}
              <Field
                label="小米還擔心太吵，你會如何照顧少數？"
                value={m.minority}
                placeholder="例如：將討論桌移遠，一週後再檢查"
                onChange={(v) =>
                  update((d) => {
                    d.meeting.minority = v;
                  })
                }
              />
            </>
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
          <button className="wide" disabled={m.done} onClick={next}>
            {m.done
              ? "✓ 班會已完成"
              : m.step === 5
                ? "宣布散會並儲存決議"
                : "完成目前程序"}
          </button>
          {m.done && (
            <div className="feedback">
              <h3>會議紀錄</h3>
              <pre>{m.minutes}</pre>
              <button
                className="secondary"
                onClick={() =>
                  update((d) => {
                    d.meeting = {
                      step: 0,
                      heard: [],
                      queue: [],
                      speaker: null,
                      seconded: false,
                      voted: false,
                      minority: "",
                      minutes: "",
                      done: false,
                    };
                  })
                }
              >
                重新演練班會
              </button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
