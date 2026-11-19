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
