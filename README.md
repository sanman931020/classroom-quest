# 我們這一班 Classroom Quest

國小三上社會第三單元「快樂的班級生活」互動核心原型。三個活動可獨立啟動：閱讀角改造、班會大挑戰、校園服務。

## 使用

Node.js 22.12 以上（本次使用 24.18）。

```powershell
npm ci
npm run dev
```

開啟終端顯示的 Local URL（預設 http://127.0.0.1:5173）。

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

端對端測試需先執行 `npx playwright install chromium`。GitHub Pages 可將 `dist` 內容部署至靜態網站，Vite 使用相對 base，無伺服器 API 或歷史路由需求。

進度存在同一瀏覽器的 localStorage；不會跨裝置同步。可隨時匯出 JSON 學習成果。頁尾儲存提示若顯示失敗，請保留頁面並匯出。沒有帳號、排行榜或收集學生姓名。

教材依據是使用者提供的 DOCX 課本內容與排版稿，非原版翰林教材全文。未將參考課文或圖片打包至網站。所有遊戲台詞為依學習目標自編的互動轉化。CSS 角色與場景為原型素材；正式水彩紙雕美術、音效與語音待後續製作。

從 `docs/CLAUDE_HANDOFF.md` 接手，完整可貼上的任務位於 `CLAUDE_CODE_NEXT_PROMPT.md`。
