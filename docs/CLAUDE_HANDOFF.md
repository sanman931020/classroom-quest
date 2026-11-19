# Claude Code 視覺與體驗開發交接

## 專案現況

路徑：`C:\Users\53M\Documents\ChatGPT\ai coding\classroom-quest`，獨立 Git 倉庫，未改動上層既有專案。主要分支 `feature/gameplay`，穩定分支 `main`，視覺預留 `feature/visual`。精確提交請執行 `git log -1 --oneline`；本文件與測試報告一併存在交付提交中，避免在同一提交內自我引用未產生的 SHA。

React19、TypeScript5、Vite7，Vitest5、Playwright、ESLint9、Prettier。精確版本依 package-lock。Node24.18驗證。未使用PixiJS／GSAP／Tailwind／IndexedDB；無後端。進度採localStorage version1。

```powershell
cd "C:\Users\53M\Documents\ChatGPT\ai coding\classroom-quest"
npm ci
npm run dev -- --port 5189 --strictPort
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

預覽 http://127.0.0.1:5189 。測試會自行啟動5189，執行E2E前停止手動預覽或使用另一個預覽埠。5173可能被其他專案使用，請勿結束不屬於本專案的程序。測試結果與限制見 TEST_REPORT。

三活動皆具操作邏輯：讀線索／分支、公約與格點家具模擬；四步驟選舉、正式六步驟班會與發言權、教材示範表決、少數照顧及紀錄；四服務站選擇與安全任務、任一站完成開啟五日回饋。三張成果自動保存、JSON匯出、回到原場景。

仍待完成：正式水彩角色、完整2.5D等角場景、細緻動作與轉場、音效、語音、真實iPad Safari測試。服務操作目前按鈕式，不是動畫物件搬運；角色是CSS簡化佔位。公約檢查為結構與自評，不理解自然語言。匯出JSON無匯入、無跨裝置同步；外部字體失敗回退系統字體。未取得原版翰林教材PDF，教材對應依使用者DOCX稿內來源標示。

## 不可破壞的核心

Codex維護 `src/game/types.ts`、`src/simulation/engine.ts`、`src/storage/progress.ts`、`src/data/content.ts` 的教材程序與固定資料、`tests/core.test.ts`。請先讀 UI_GAME_CONTRACT，再修改視圖。保留 ActivityProps 的 s/update/notify、角色與家具ID、格點座標及版本1 schema；擴充資料先提migration與回歸測試。GameEvent僅預留型別，沒有現成全域dispatch。

不得將正式六步驟改成七步；不得把6/18/4當真實投票、加上學習者一票或改為隨機票數；不得讓動畫蓋掉核心模擬結果。角色舉手、主席同意、一人發言、聽完、再下一人的狀態不可省略。遇霸凌、威脅、受傷或危險，一律找老師或家長，不讓學生自行對質調查。維持三個活動，四服務站是同一活動內地點。

## 視覺任務與驗收

|順序與任務|檔案及可改範圍|既有介面|驗收|
|---|---|---|---|
|首頁|main.tsx首頁區、styles.css、assets|navigate與完成旗標|三入口清晰、可獨立進入、已完成狀態準確|
|虛擬教室|Reading呈現、CSS及場景圖|place/simulate|格點逆投影正確，家具不擋通道，字不烙圖|
|可互動家具|Reading家具區、獨立FurnitureView|FurnitureId、positions|拖曳／吸附／非法回退／點選替代都保留|
|班會場景|Meeting呈現、黑板與座位|nextMeeting、meeting狀態|六程序可完成，回饋與發言佇列可見|
|校園地圖|Service地圖與任務呈現|stations、serviceComplete|四站可點、獨立開局、任一站通關開回饋|
|五位角色|shared.tsx Avatar、assets|id/small|外觀符合固定設定、同角色跨場景一致|
|對話動畫|Reading/Meeting對話呈現|need/followup/speaker|動畫不阻擋文字閱讀、不遺漏對話分支|
|三活動UI/UX|activities呈現與共用元件|ActivityProps|錯誤提示清楚，保留成果和程序，不加第四活動|
|回饋轉場|CSS、可新增effects元件|notify/pass/done|150–350ms、可降低動態，不能改狀態時序|
|平板操作|CSS、Pointer轉換與布局|相同place與邏輯座標|1024×768、1280×800、真機Safari；觸控熱區48px以上|
|音效與語音|新增media adapter、設定UI|既有對話文字與事件|使用者手勢啟動、可關閉、不自動錄音、不代替文字|
|素材全替換|assets與引用處|ASSET_MANIFEST|列出已換／未換，無佔位冒充正式、無不明授權圖片|

## 設計系統

溫暖水彩＋立體紙雕，35度左右等角視角；保留簡潔、可辨識熱區。暖紙白#F7F2E8、青綠#65AFA5、珊瑚#E98A7C、芥末#D6B563、森林#405D4A。深綠文字／淺底，狀態同時有文字或圖示，不能只靠顏色。Noto Sans TC優先，無網路退回系統；正文至少16px，任務標題20–24px、首頁主標36–44px。現有部分次要小字可放大，但不得壓縮任務熱區。

學生頭身1:3、老師1:4；依文件外觀辨識，衣服淺藍或黃。背景／地面／家具／人物／特效／UI分層，人物按腳底y排序。家具圖與熱區解耦，保留底中錨點。文字以HTML呈現，可讀、不失真。對話區保持穩定，避免跳動；長內容允許垂直滾動，不強塞在單屏。

按鈕至少48×48，選取態與錯誤態明確。轉場150–350ms，不閃爍，不以長動畫阻止操作；prefers-reduced-motion停用不必要動態。音效輕柔短促、音量可調、有靜音，錯誤不使用責罵聲。語音需附可讀字幕、停止重播能力及合法素材來源。

## 實際執行順序

1. 讀README、CONTENT_MAPPING、ARCHITECTURE、UI_GAME_CONTRACT、GAMEPLAY_SPEC、TEST_REPORT，先跑基線。
2. `git worktree add ..\classroom-quest-visual feature/visual`；確認分支不被其他worktree使用，再安裝相依。
3. 先做設計token與五角色設定，更新素材manifest，保留舊互動基線。
4. 美化首頁與閱讀角，核對投影座標、拖曳、觸控及鍵盤替代。
5. 班會座位、舉手與說話動畫，跑完整六步驟與固定票數回歸。
6. 校園地圖與服務任務呈現、五日回饋；保持任一站完成即可結束主要服務任務。
7. 音效／語音／轉場，加入關閉與降低動態設定。
8. 真實Safari/iPad、兩平板比例和桌面測試，修復遮擋、滾動、字級與性能；完成build/lint/typecheck/單元/E2E。
9. 更新狀態、素材清單和測試報告，提交視覺分支；用正常merge合併，禁止force push或覆蓋gameplay提交。

沒有已授權GitHub遠端；Sites來源倉庫用於本次發布，與GitHub不同。要新增GitHub時使用使用者提供的倉庫URL：`git remote add origin <URL>`，再正常push。不要創造URL或把短效Sites憑證寫入檔案。最終提交訊息和SHA以git log為準。

完整可複製任務在根目錄 `CLAUDE_CODE_NEXT_PROMPT.md`。
