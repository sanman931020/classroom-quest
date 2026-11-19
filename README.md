# 我們這一班！Classroom Quest・班會大挑戰

國小三上社會第三單元「快樂的班級生活」的 3D 班會模擬遊戲。學生輸入自己的班級與名字，選擇討論主題（選舉班級幹部／班會提案）與班會角色（主席、司儀、記錄、學生），在教室裡處理常見狀況、做出決定，再觀察影響、修正與反思。全介面附注音，學生輸入可用麥克風。全部為預設分支，不使用 AI 或付費服務。

## 使用

Node.js 22.12 以上（開發使用 24.18）。

```powershell
npm ci
npm run dev -- --port 5190 --strictPort
```

開啟 http://127.0.0.1:5190 。檢查：

```powershell
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`dist` 為純靜態輸出（Vite 相對 base），可放到 GitHub Pages。進度只存在同一瀏覽器（localStorage），可在學習單匯出 JSON。

## 文件

- 第二階段交接：`docs/PHASE2_HANDOFF.md`
- 第三階段 Prompt：`docs/PHASE3_NEXT_PROMPT.md`
- 玩法：`docs/GAMEPLAY_SPEC.md`；現況：`docs/DEVELOPMENT_STATUS.md`；素材：`docs/ASSET_MANIFEST.md`；介面契約：`docs/UI_GAME_CONTRACT.md`；測試：`docs/TEST_REPORT.md`

教材依據為小組課本內容與排版稿（DOCX），遊戲台詞與情境為自編延伸，已在小百科標示「課本／遊戲延伸」。
