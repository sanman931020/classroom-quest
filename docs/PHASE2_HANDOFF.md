# 第二階段交接（Claude Code → 第三階段）

## 位置與分支

- 專案：`C:\Users\53M\Desktop\大學coding\classroom-quest`（從 `C:\Users\53M\Documents\ChatGPT\ai coding\classroom-quest` 以 `git clone` 複製；原資料夾未更動，仍在 `feature/gameplay`）。
- 分支：`feature/visual`。提交：`c91d0af`（checkpoint）、`cfd8f73`（3D、主題、角色、注音、姓名），以及本文件所在的文件提交（以 `git log -1` 為準）。
- 沒有 GitHub 遠端，未推送、未部署。

## 啟動

```powershell
cd "C:\Users\53M\Desktop\大學coding\classroom-quest"
npm ci
npm run dev -- --port 5190 --strictPort   # 開 http://127.0.0.1:5190
npm run typecheck; npm run lint; npm test
npx playwright install chromium; npm run test:e2e   # 自動使用 5189
npm run build
```

## 第二階段實際成果（以使用者中途指示為準）

使用者在開發中將範圍改為「**只保留班會大挑戰**」，並要求：模擬班會流程與每種決定的影響（類似 AI ARGUE／ARGUVERSE 的論點互動，但全部預設分支、不接 API）、可選班會角色（主席／司儀／記錄／學生）且各有任務與結局、蒐集國小中年級常見狀況、可選討論主題（選幹部依課本四步驟、決議事情依六程序）、平票等正規處理方式、3D 場景、學生輸入班級與名字、國字旁加注音。以上皆已實作，詳見 `docs/DEVELOPMENT_STATUS.md`、`docs/GAMEPLAY_SPEC.md`。

## 檔案地圖

| 層 | 檔案 |
|---|---|
| App 殼、主選單、設定、說明、小百科、學習單、教師入口、姓名表單 | `src/app/main.tsx` |
| 班會活動（主題、角色、章節、選舉、六程序、影響、反思） | `src/activities/Meeting.tsx` |
| 主題二資料（角色、決策、論點卡、配套、影響預測、結局） | `src/data/meetingStory.ts` |
| 主題一資料（選舉決策、平票、小百科） | `src/data/electionStory.ts` |
| 影響引擎（儀表、表情、一週模擬、結局） | `src/simulation/meetingImpact.ts` |
| 班會紀錄儲存 | `src/storage/meetingExt.ts` |
| 3D 場景 | `src/scenes3d/Classroom3D.tsx`、`Character3D.tsx`、`materials.ts`、`MeetingScene.tsx`（3D／2.5D 切換） |
| 2.5D 備援 | `src/scenes/Classroom.tsx`、`src/art/Character.tsx`、`props.tsx`、`iso.ts`、`SvgDefs.tsx` |
| UI 元件 | `src/components/ui.tsx`、`icons.tsx`、`PlayLayout.tsx`、`shared.tsx` |
| 偏好、音效、tokens | `src/ui/prefs.tsx`、`sfx.ts`、`tokens.css`；樣式 `src/app/styles.css` |
| 核心（第一階段，未改判斷） | `src/game/types.ts`、`src/data/content.ts`、`src/simulation/engine.ts`（僅新增 flags）、`src/storage/progress.ts` |
| 測試 | `tests/core.test.ts`、`tests/meeting.test.ts`、`tests/e2e/game.spec.ts` |
| 截圖 | `docs/screenshots/01-home.png` … `08-handbook.png` |

## 操作說明（展示用）

1. 開啟網站 → 輸入班級（如「四年五班」）與名字 → 進入教室。可點教室裡的角色聽他們說話。
2. 開始探索 → 選主題（選舉班級幹部／閱讀角提案）→ 選角色 → 開始。
3. 對話框出現情境時選一個做法，右側立刻顯示「這樣做的影響」，上方三條儀表與角色表情跟著改變。
4. 選舉：提名 → 附議與討論 → 舉手表決（會平票，練習處理）→ 宣布結果。
5. 提案：寫提案單 → 六程序 → 邀請舉手、輪流發言、收論點卡 → 預測影響 → 表決 → 照顧少數 → 臨時動議 → 散會。
6. 觀察影響（一週模擬與角色結局）→ 修正反思（如果重來一次、模擬實驗室、反思）→ 換角色或主題再玩。
7. HUD：小百科（平票等處理方式）、學習單（列印、匯出 JSON）、音效、暫停（章節、設定、說明）。設定可關注音、切換平面模式、省電、減少動畫。

## 已知問題與風險（第三階段請先處理）

1. **注音破音字**：已建立詞彙→讀音字典（`src/ui/zhuyin.ts`）並全頁套用；但只涵蓋目前台詞，新增或修改台詞時必須檢查破音字，並請熟悉國語注音的老師逐頁校對。
2. `Meeting.tsx` 約 1,400 行，應拆成章節元件與 hooks。
3. 3D 未在真機 iPad 測效能；省電模式會改用 2.5D。
4. Canvas 黑板文字沒有注音、解析度有限。
5. 選舉候選人固定；主題二只有一個議題。
6. 無角色配音；背景音樂與鐘聲為合成音；教師模式為第一版。
7. 語音輸入依賴瀏覽器雲端語音服務（Google／Apple），需確認學校隱私政策。
