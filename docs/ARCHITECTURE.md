# 技術架構

React + TypeScript + Vite，純靜態輸出，無後端。刻意使用 DOM、CSS 與 Pointer Events 製作原型，讓平板、鍵盤與輔助技術能操作；PixiJS、GSAP、Tailwind、IndexedDB 均未安裝，屬原規畫的建議而非強制套件。沒有遠端 AI 呼叫、付費服務或隨機模擬。

## 模組

- `src/app/main.tsx`：載入、導覽、共用 Progress、儲存狀態、成果匯出。
- `src/activities/Reading.tsx`、`Meeting.tsx`、`Service.tsx`：三個場景的視圖與操作控制。
- `src/components/shared.tsx`：Avatar、Panel、Field、ActivityProps。
- `src/game/types.ts`：Scene、角色／家具 ID、Progress、GameEvent。
- `src/data/content.ts`：角色、台詞分支、分類、六步驟、選舉、方案、票數、服務任務及初始狀態。
- `src/simulation/engine.ts`：公約檢查、合法放置、確定性空間模擬、班會前進條件與服務完成判斷。
- `src/storage/progress.ts`：版本化 localStorage、基本型別與 ID／程序驗證、損毀存檔回復、JSON 匯出。
- `src/app/styles.css`：設計 token、紙雕原型、響應式、動畫降低偏好。

## 資料流

UI 呼叫 `update(draft => ...)` → App 以 functional setState 複製當前 Progress → 控制器寫入新狀態 → React 重繪 → effect 同步儲存。使用 `notify(message)` 顯示 aria-live 提示。場景保存於 Progress.scene，重新整理維持原活動。

`place`、`simulate`、`nextMeeting`、`serviceComplete` 為純函式。視覺替換不得複製其條件。GameEvent 是預留的公開事件格式，目前沒有全域事件匯流排；正式整合請透過 ActivityProps 和既有控制器，不應假定 dispatch API 已存在。

## 儲存

key 為 `classroom-quest-v1`、schema version 1。不含姓名、登入或跨裝置同步。儲存失敗顯示明確提示，可匯出目前記憶體狀態。JSON 成果只供備份與閱讀，目前沒有匯入介面。若要擴充 schema，須新增 migration，不能直接改 key 或破壞舊資料。

## 部署

`npm run build` 先 typecheck，再輸出 dist。相對 base 支援 GitHub Pages 子路徑。`.openai/hosting.json` 保存 Sites 身分與靜態輸出位置。無 SPA 深層 URL、無伺服器秘密。字體可選用外部 Google Fonts，離線時使用系統字體；不保證離線首次載入或 PWA 安裝。

技術參考：[Vite 官方入門](https://vite.dev/guide/)、[React 狀態管理](https://react.dev/learn/managing-state)。實際套件版本以 package-lock.json 為準。
