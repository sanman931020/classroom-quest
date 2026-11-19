你要接手《我們這一班！Classroom Quest》的第二階段：正式視覺、2.5D場景、動畫與平板體驗。這是台灣國小三上社會第三單元「快樂的班級生活」的班級自治模擬遊戲。第一階段已建立React/TypeScript/Vite靜態應用、核心規則與本機保存；請在這些成果上完成體驗，不要重寫成電子書或選擇題網站。

專案路徑：C:\Users\53M\Documents\ChatGPT\ai coding\classroom-quest。先檢查git status、分支及git log -1，保護現有成果。主要開發分支feature/gameplay、穩定main，視覺預留feature/visual。建議git worktree add ..\classroom-quest-visual feature/visual，在獨立目錄工作；分支已使用時先檢查，不強行覆蓋。不force push、不刪他人分支。沒有既定GitHub遠端；不得捏造或自動建立GitHub倉庫。

先讀docs/CLAUDE_HANDOFF.md、CONTENT_MAPPING.md、ARCHITECTURE.md、UI_GAME_CONTRACT.md、GAMEPLAY_SPEC.md、ASSET_MANIFEST.md、TEST_REPORT.md及DEVELOPMENT_STATUS.md。教材依據為使用者DOCX排版稿，沒有原版翰林PDF；遊戲台詞為自編，不打包第三方課文或插圖。

只有三個主要活動，請保持以下互動完整：
1. 閱讀角改造：五人線索與追問、分類、公約清楚公平做得到、8×4格家具拖曳吸附／防重疊／保留通道、點選替代、確定性空間模擬與角色回饋。家具table/mat/shelf各占一格，最下排禁止放置，桌與地墊距離至少三格為原型規則。
2. 班會：四步驟選舉，會前問題／提案／理由，六程序「班會開始、主席報告、班長及各股股長報告、提案討論、臨時動議、散會」，散會後導師指導。舉手排隊、主席同意、一人發言、聽完再下一位。教材固定6/18/4票，分區通過；票數必須標示教學示範，不能加上使用者一票或隨機改票。討論後照顧少數，保存決議和臨時動議。
3. 校園服務：衛生、交通、圖書志工、學生自治會四站是同一活動，不是四關。四站可探索，任一站完成開啟週一到週五心情、觀察、改善建議。未完成前兩活動時用明示預設情境。遇霸凌、威脅、受傷或危險，要找老師或家長，不讓學生調查或自行解決。

核心介面：src/game/types.ts定義Progress與固定ID，src/data/content.ts提供角色／程序／任務，src/simulation/engine.ts提供place、simulate、nextMeeting、serviceComplete，src/storage/progress.ts統一本機儲存與JSON匯出。活動元件使用ActivityProps={s,update,notify}；update接收draft修改函式。GameEvent只是預留型別，沒有現成全域dispatch。不要把像素寫入邏輯格座標，不改version1存檔格式；若真的要擴充需migration與回歸測試。公約為結構檢查及自評，不宣稱理解自然語言。localStorage沒有跨裝置同步，JSON目前只匯出不匯入。

本階段請依序完成：設計token與角色設定→首頁→2.5D教室與可互動家具→班會座位／舉手／對話→校園四站→三活動UI／回饋與轉場→可關閉音效和語音→真機平板與效能驗證。可改src/app/styles.css、shared.tsx的Avatar、assets及activities呈現層；保留核心邏輯、控制器與型別。需要抽出視圖元件可以做，但不要讓動畫成為完成條件。

視覺方向：溫暖水彩、立體紙雕、約35度等角2.5D。色彩紙白#F7F2E8、青綠#65AFA5、珊瑚#E98A7C、芥末#D6B563、森林#405D4A。學生約1:3頭身、老師1:4。安安短髮髮夾，阿哲圓框眼鏡，小米雙辮，浩浩刺短髮，林老師中長髮淺色襯衫。角色跨場景一致、可做idle/talk/raise-hand/happy/concern；全部文字由HTML渲染，不烙在背景。素材透明WebP/PNG，小圖SVG，來源合法，更新manifest的尺寸、錨點、圖層與熱區。

正文至少16px，觸控熱區至少48px。支援1024×768橫向4:3、1280×800橫向16:10及桌面。拖曳要有點選替代、取消與非法位置回復。動效150–350ms並遵守prefers-reduced-motion；音效須手勢啟動、可靜音，語音不得取代字幕。不要使用付費或無授權素材。

驗證命令：npm ci；npm run typecheck；npm run lint；npm test；npx playwright install chromium；npm run test:e2e；npm run build。預覽npm run dev -- --port 5189 --strictPort，測試自行占用5189，先停止該專案手動預覽；不要動其他專案的5173。Vite相對base，dist可靜態部署GitHub Pages。新增套件需確認免費與相容並更新lockfile。

驗收：三入口可進出、五角色與分支可讀、拖曳／吸附／重設／點選替代正常、模擬可重現、班會六步驟不可跳、發言權不衝突、示範票數正確、四服務站可獨立開始、任一站可開週回饋、學習單重新整理後保留、匯出可用、兩平板比例無遮擋、真機Safari觸控實測。更新測試報告，未測項目明說，不能宣稱全通過。把所有剩餘佔位、未完成音效與真機限制明列，附Git提交、啟動方式與素材替換清單，交付可操作的完整第二階段成果。
