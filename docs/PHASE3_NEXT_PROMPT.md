# 《我們這一班！Classroom Quest》第三階段開發 Prompt（可直接貼上）

---

你是本專案的資深教育遊戲設計師、互動系統工程師、前端遊戲開發者與技術整合負責人。請直接接手現有專案，把「班會大挑戰」做成國小三、四年級學生可以**從頭玩到尾、一看就懂、每個決定都有清楚後果**的完整班會模擬遊戲。本階段要實際開發、測試、修正與交付，不要只提計畫。

## 〇、專案現況（第二階段結束時，請以實際程式碼為準）

- 專案路徑：`C:\Users\53M\Desktop\大學coding\classroom-quest`，分支 `feature/visual`（最後提交見 `git log -1`）。原始第一階段資料夾 `C:\Users\53M\Documents\ChatGPT\ai coding\classroom-quest` 不要修改。沒有 GitHub 遠端，不得自行建立或推送。
- 技術：React 19、TypeScript 5、Vite 7、three.js 0.170、@react-three/fiber 9、@react-three/drei 10、Vitest 5、Playwright、ESLint 9。字型 `@fontsource/bpmf-huninn`（OFL-1.1，注音）。
- **範圍已由使用者決定：只保留「班會大挑戰」一個活動**（閱讀角改造、校園服務的視圖已移除；核心引擎函式與測試保留）。
- 遊戲流程：提出問題 → 主持討論 → 聆聽不同意見 → 做出決定 → 觀察決策影響 → 修正與反思。**全部為預設分支與確定性規則，不接任何 AI／付費 API。**
- 討論主題：①選舉班級幹部（課本 p.5–6 四步驟：提名人選→徵求附議，進行討論→舉手表決→宣布結果，含平票處理）②班會提案「閱讀角怎麼用？」（課本 p.7–12 正式六程序，教材示範票數 6／18／4）。
- 角色：主席、司儀、記錄、學生，各有自己的常見狀況分支與三段結局。
- 3D：學生站在教室內（四面牆、天花板、窗外校園），拖曳＝轉頭環顧，永遠看不到教室外殼；省電／不支援 WebGL 時改用 2.5D SVG。
- 注音：全介面國字旁有注音，破音字以詞彙字典修正；學生輸入可用麥克風語音輸入。
- 入口：學生在首頁輸入「我的班級／我的名字」（鍵盤輸入），全程帶入。開始時有上課鐘聲、背景音樂與林老師開場說明。
- 學習小短片 3 部（`src/shorts/`）：選幹部四步驟、開班會囉、服從多數尊重少數，各 ≤ 90 秒，出現在對應關卡、首頁、小百科、教師入口。新增主題時請同步新增對應短片（資料驅動，修改 `shortsData.ts` 即可）。

## 一、開始前必做

1. 閱讀：`README.md`、`docs/PHASE2_HANDOFF.md`、`docs/DEVELOPMENT_STATUS.md`、`docs/GAMEPLAY_SPEC.md`、`docs/UI_GAME_CONTRACT.md`、`docs/ASSET_MANIFEST.md`、`docs/CONTENT_MAPPING.md`、`docs/TEST_REPORT.md`。
2. 閱讀教材：`C:\Users\53M\Desktop\115-1\教科書設計與實作\第三單元_快樂的班級生活_課本內容與排版稿.docx`（專案根目錄 `source-reading.local.txt` 為抽出的純文字，已 gitignore）。重點：p.5–6 幹部與選舉、p.7–8 班會角色與六程序、p.9–10 提案、p.11–12 表決方式（舉手／起立／投票）、服從多數尊重少數。
3. `git status`、`git log --oneline -5`，保留所有未提交修改；建立新分支 `feature/phase3-gameplay`。
4. `npm ci`；`npm run typecheck`、`npm run lint`、`npm test`、`npx playwright install chromium`、`npm run test:e2e`、`npm run build` 先跑一次基線。
5. 啟動 `npm run dev -- --port 5190 --strictPort`，以 1024×768 與 1280×800 實際把兩個主題 × 四個角色各玩一次，列出卡住、看不懂、需要捲動、文字太多的地方。
6. 交接文件與程式不一致時，以程式為準並記錄差異。

## 二、主要檔案與介面

| 用途 | 檔案 | 重要介面 |
|---|---|---|
| App 殼、主選單、疊層、開場說明 | `src/app/main.tsx` | `navigate(scene, chapter?, topic?)`、`Intro`、`Handbook`、`Sheets`、`Teacher` |
| 班會活動 | `src/activities/Meeting.tsx`（約 1,400 行，**請先拆分**） | `MeetingProps = ActivityProps & { ext, updateExt, goHome, openSheets, openHandbook, startChapter }`；`decisionReady()` 決定情境觸發時機；子階段 `sub` |
| 主題二資料 | `src/data/meetingStory.ts` | `Decision{ id, topic, role, step, trigger?, speaker, prompt, question, options[{id,label,good,effect,result,tags?}] }`、`ROLES`、`TOPICS`、`ARGUMENTS`、`MEASURES`、`PREDICTION_KEY`、`ENDINGS` |
| 主題一資料、小百科 | `src/data/electionStory.ts` | `ELECTION_DECISIONS`、`HANDBOOK` |
| 影響引擎 | `src/simulation/meetingImpact.ts` | `computeMeters`、`computeFeelings`、`simulateWeek`、`simulateElectionWeek`、`roleEnding`、`hasTag` |
| 班會紀錄儲存 | `src/storage/meetingExt.ts`（key `classroom-quest-meeting-v1`） | `MeetingExt`、`restoreExt`、`displayClass/displayName` |
| 第一階段核心（不可破壞） | `src/game/types.ts`、`src/data/content.ts`、`src/simulation/engine.ts`、`src/storage/progress.ts` | `nextMeeting`（六程序前進條件）、Progress v1 |
| 3D 場景 | `src/scenes3d/Classroom3D.tsx`、`Character3D.tsx`、`materials.ts`、`MeetingScene.tsx` | `ClassroomProps`、`CastMember`、`remapSeat`、`CameraRig`（環顧鏡頭） |
| 2.5D 備援 | `src/scenes/Classroom.tsx`、`src/art/*` | 同 `ClassroomProps` |
| UI 元件 | `src/components/ui.tsx`、`icons.tsx`、`PlayLayout.tsx`、`shared.tsx`、`VoiceInput.tsx` | `DialogueBox`、`Overlay`、`Completion`、`Field{voice}`、`MicButton` |
| 偏好、音訊、注音 | `src/ui/prefs.tsx`、`sfx.ts`、`zhuyin.ts`、`tokens.css` | `Prefs{sound,music,volume,motion,lowPower,view,zhuyin}`、`sfx.play/schoolBell/startMusic`、`annotate/startZhuyinFix` |
| 測試 | `tests/core.test.ts`、`tests/meeting.test.ts`、`tests/e2e/game.spec.ts` | E2E 預設關閉注音以純文字比對 |

## 三、本階段要完成的工作

### 3.1 讓遊戲更直覺（使用者第二階段回饋）

1. **第一次遊玩教學（coach marks）**：用手指動畫與高亮直接指出下一步要點哪裡（例如「點小米，請她舉手」「按這裡同意發言」），每個角色第一次只出現一次，可重看；保存在 `Prefs.seen`。
2. **把主要操作搬進 3D 場景**：點同學＝邀請舉手；發言同學頭上出現「聽完了」按鈕；講桌上出現「完成這個程序」；表決時同學真的一個個舉手、黑板即時畫「正」字。右側面板只保留說明與次要操作。
3. **依角色換視角與站位**：主席站在講台看全班、司儀站在黑板旁、記錄坐在記錄桌（看到紀錄本）、學生坐在自己的座位（看到前方的主席）。仍維持環顧鏡頭、不看到教室外殼。
4. **選擇後的後果用畫面呈現**：同學表情泡泡、儀表數字跳動、教室聲音（吵雜聲／安靜）變化，文字卡縮短為一句。
5. **「再試一次這一題」**：選了需要再想的做法後，可以立即重選同一題比較兩種結果（保留第一次選擇紀錄，結局以第一次為準或兩者並列，請設計清楚）。
6. **選項文字縮短**：每個選項 ≤ 14 字並配圖示；完整說明放在「說明」按鈕。用語維持國小中年級可理解。
7. **六格旅程地圖**：畫面上方固定顯示「提出問題→主持討論→聆聽→決定→觀察→修正」，目前所在格子發亮。
8. **對話朗讀**：每句台詞旁有喇叭按鈕，先用瀏覽器 TTS（zh-TW），保留第四階段換成預錄配音的介面。語音無法播放時不影響遊戲。
9. 持續遵守：**決策過程不需要垂直捲動**（`tests/e2e` 已有檢查，請擴充到每一步）。

### 3.2 擴充主題與情境（必須符合課本）

1. 把主題二的資料（論點卡、方案、票數、配套、一週規則）抽成可重用的 `TopicDef`，**閱讀角主題仍使用教材固定票數 6／18／4**。
2. 新增至少一個「決議事情」主題，例如：
   - 「訂定班級公約」（課本 p.3–4：清楚、公平、做得到；「指定男生去打掃外掃區」不公平的例子）。
   - 「班級活動怎麼決定」（如同樂會、打掃工作分配）。
   新主題的票數必須標示為「遊戲模擬」，不得與課本數字混淆。
3. 表決方式：加入課本的舉手、起立、投票三種表決，讓學生選擇並看到差異（例如投票較能保護隱私、舉手較快），標示哪些是課本內容、哪些是遊戲延伸。
4. 情境連鎖：早先的選擇影響後面的事件（例如主席讓人插話，後面插話的人變多；司儀念錯程序，後面有人搞混）。規則仍需確定性、可測試。
5. 每個主題 × 每個角色至少 6 個情境、至少 3 種不同結局內容；收錄更多中年級常見狀況（不舉手就說、開玩笑、只投好朋友、少數被嘲笑、會議時間不夠、有人哭了／生氣）。遇到霸凌、威脅、受傷等安全狀況，一律引導找老師或家長。
6. 候選人與提案：允許學生從固定清單選擇或自訂候選人名字／提案內容（自由文字只做完整性檢查，不假裝理解語意）。

### 3.3 學習成果與紀錄

1. 「我的班會紀錄」整合：主題、角色、每個決定與影響、表決結果（標示示範／模擬）、少數意見、改善做法、反思；可在學習單查看、列印、匯出 JSON。
2. 同一學生多次遊玩的紀錄要能保留（目前同一主題重玩會覆蓋），設計版本化欄位並寫 migration 與回歸測試；**不得改壞 Progress v1**。
3. 不得把 NPC 模擬票數標成真實學生投票；不得自動上傳任何學生資料。

### 3.4 程式品質

1. 先把 `Meeting.tsx` 拆為：`useMeetingFlow`（狀態與動作）、`ElectionPanel`、`ProposalPanel`、`MeetingPanel`、`ImpactPanel`、`ReflectPanel`、`buildCast()`。
2. 情境觸發條件從 `decisionReady` 的程式判斷改為資料描述（例如 `when: { heard: 1, speaker: null }`），並寫單元測試。
3. 注音：新增台詞時跑破音字檢查腳本（以 `phonic_table_Z.txt` 找出多音字並列出未在 `WORDS` 的詞），把結果放進 `docs/ZHUYIN_CHECK.md` 請老師校對。

## 四、測試與驗收

請補強並執行：

- 單元：每個主題 × 角色的決策資料完整性、情境連鎖、結局分級、表決方式差異、TopicDef 讀取、紀錄 migration、破音字詞典。
- E2E（Playwright，1024×768 與 1280×800）：兩個以上主題 × 四個角色的完整流程；錯誤程序被擋下；平票處理；再試一次；教學提示只出現一次；每一步面板不需捲動；重新整理後恢復；平面模式與省電模式；注音開關；語音輸入按鈕在不支援時隱藏。
- 實際以瀏覽器遊玩並檢查截圖，存到 `docs/screenshots/phase3/`。
- 必跑：`npm run typecheck`、`npm run lint`、`npm test`、`npm run test:e2e`、`npm run build`。
- 未測項目（例如真機 iPad Safari、真實語音辨識）要明確寫出，不得宣稱通過。

## 五、協作界線與風險

- 核心六程序不得改為七步；6／18／4 不得加入玩家票或隨機；發言權維持 FIFO；`nextMeeting` 的判斷不可放寬。若需修改核心，先寫重現測試、最小修改、更新 `docs/UI_GAME_CONTRACT.md`。
- 風險：3D 在舊 iPad 的效能（測 FPS，必要時降低 DPR、關閉描邊）；Html 標籤數量；注音字型載入大小；瀏覽器語音辨識會把聲音送到 Google／Apple（需在教師說明註明，並提供關閉選項）；`Meeting.tsx` 拆分時的回歸。
- 所有自編情境標示為遊戲延伸，不得宣稱是課本原文。

## 六、交付

1. 提交 Git commit（訊息清楚、附 Co-Authored-By）。
2. 更新 `docs/GAMEPLAY_SPEC.md`、`docs/DEVELOPMENT_STATUS.md`、`docs/ASSET_MANIFEST.md`、`docs/UI_GAME_CONTRACT.md`。
3. 新增 `docs/PHASE3_TEST_REPORT.md`、`docs/PHASE3_HANDOFF.md`。
4. 新增 `docs/PHASE4_NEXT_PROMPT.md`：第四階段要做的視覺精修（角色換成統一畫風的 glTF 或手繪貼圖）、角色配音與字幕、教師模式（投影、暫停、指定主題角色、本機成果）、平板操作與效能最佳化、完整測試、GitHub Pages 部署與最終文件（FINAL_PROJECT_REPORT、TEACHER_GUIDE、STUDENT_GUIDE、CONTENT_VERIFICATION、ASSET_LICENSES、DEPLOYMENT_GUIDE）。
5. 最後在終端直接輸出 `docs/PHASE4_NEXT_PROMPT.md` 的完整內容，並提供 5 分鐘展示操作順序。

請現在開始第三階段實際開發。
