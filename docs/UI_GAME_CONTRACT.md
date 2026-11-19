# UI 與遊戲邏輯契約 v1

完整型別以 `src/game/types.ts` 為唯一來源，資料以 `src/data/content.ts` 為準。

```ts
type ActivityProps = {
  s: Progress;
  update: (fn: (draft: Progress) => void) => void;
  notify: (message: string) => void;
};
// 視圖事件範例
const outcome = place(s.positions, 'table', {x: 7, y: 0});
if (outcome.ok) update(draft => {
  draft.positions = outcome.positions;
  draft.readingDone = false;
});
notify(outcome.reason);
```

## 對接規則

1. 角色 ID 固定 `anan/zhe/mi/hao/teacher`，不用名稱作 key。Avatar 接收 `{id, small?}`，正式素材由此統一替換。點角色先加入 clues，再讀 data 的 need；追問讀 followup。動畫可由局部 state 呈現 idle、speaking、thinking、happy，但不作完成條件。
2. 家具 ID `shelf/table/mat`，座標是邏輯格 x0–7、y0–2；第4排禁止放置。新2.5D場景須先逆投影到格點再呼叫 place，不能存像素座標。失敗保留舊位置。
3. `simulate(s)` 回傳 pass、checks、distance、feedback；不能隨機改結果。公約／位置／分類變動取消 readingDone。
4. `nextMeeting(s)` 只判斷允許前進與理由，UI成功後推進或保存紀錄。step0–5，speaker一次一人，queue FIFO，heard代表聽完。6/18/4是只讀教材示範。
5. `serviceComplete(s)` 依 station 和 `answers['station:task']` 判斷。切站保留其他站答案，正確並提交才加入completed，改錯須撤銷完成。
6. 三張成果為 rule、proposal、week+improvement；導覽不清除。儲存由App統一執行，視圖不直接寫localStorage；匯出用download。變更schema需migration。

GameEvent 是 navigate/talk/move 的預留格式，目前沒有全域 dispatch；整合請用 ActivityProps 與既有控制器，不要假定匯流排已存在。

Codex維護核心：game/types、simulation、storage、data程序與固定數據、核心測試。Claude可修改CSS、Avatar、assets與activities呈現層；抽視覺元件時保留事件行為和ActivityProps。

---

# 第二階段擴充（向後相容）

1. **`simulate(s)` 新增 `flags: { needs, classified, space }`**：只加欄位，不改判斷；舊呼叫不受影響。
2. **班會紀錄 `MeetingExt`**（`src/storage/meetingExt.ts`，key `classroom-quest-meeting-v1`）：班級、名字、主題、角色、決策 `choices`（decisionId→optionId）、影響預測、配套措施、論點卡、幹部配對、實驗室方案、反思。與 Progress v1 分開，**Progress schema 未改**。`restoreExt` 會丟棄未知決策／選項並截斷名字長度。由 App 統一 `saveExt`；視圖透過 `updateExt(draft => …)` 修改。
3. **介面偏好 `Prefs`**（`src/ui/prefs.tsx`，key `classroom-quest-ui-v1`）：sound、volume、motion、lowPower、view（3d/2d）、zhuyin。於 `<html>` 設定 `data-motion`、`data-lowpower`、`data-zhuyin`。
4. **活動 props**：`Meeting` 使用 `ActivityProps & { ext, updateExt, goHome, openSheets, openHandbook, startChapter }`。
5. **決策資料** `Decision { id, topic, role, step, trigger?, speaker, prompt, question, options[{ id, label, good, effect, result, tags? }] }`；`trigger`：seconded／interrupt／offtopic／quiet／tie，觸發時機寫在 `Meeting.tsx` `decisionReady`。新增情境只需加資料，不需改引擎。
6. **場景 props** `ClassroomProps`（2.5D 與 3D 共用）：`cast: CastMember[]`（新增 `nameTag`）、`board`、`voteBoard`、`proposalCard`、`classLabel`、`camera`。3D 版以 `remapSeat` 把 2.5D 座位換成面向鏡頭的 3D 座位；邏輯座標不變。
7. 仍遵守：六步驟不得加成七步、6/18/4 不得加入玩家票或隨機、發言權 FIFO、危險情況找大人。
