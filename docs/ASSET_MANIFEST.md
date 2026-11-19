# 素材清單（第二階段）

本階段沒有使用任何外部圖片、模型或錄音檔。所有視覺素材都是程式產生（three.js 幾何體、SVG、Canvas），可直接替換；所有文字由程式渲染，不烙在圖上。

## 字型

| 素材 | 用途 | 來源與授權 | 位置 |
|---|---|---|---|
| Bpmf Huninn（粉圓注音） | 注音模式全介面字型 | npm `@fontsource/bpmf-huninn` 5.3.1，OFL-1.1，打包在建置輸出內（可離線） | `src/app/main.tsx` import |
| LXGW WenKai TC／Noto Sans TC | 關閉注音時的標題／內文 | Google Fonts（OFL），離線時退回系統字 | `src/app/styles.css` |

## 3D（`src/scenes3d/`，程式幾何，佔位等級：可用但非最終手繪）

| 素材 | 狀態 | 替換方式 |
|---|---|---|
| 角色 anan / zhe / mi / hao / teacher / player / npcN | 幾何組合＋三階卡通材質；表情 idle/happy/confused/worried/thinking/talking；姿勢 stand/raise/wave/read/point/sit（可 seated+raise） | 換成 glTF 時保留 `Character3D` props 介面；錨點為腳底中央、面向 +z |
| 教室結構（地板、牆、窗、門、時鐘、三角旗、作品牆） | 程式幾何 | `Room` 元件內替換 |
| 課桌椅（12 組，面向鏡頭排列）、講桌、記錄桌 | 程式幾何 | `Desk`；座位座標由 `remapSeat` 從 2.5D 座位換算 |
| 閱讀角書櫃／地墊／討論桌 | 程式幾何，位置讀取 Progress.positions | `Shelf`／`Mat`／`Table` |
| 黑板、班級公約布告欄、表決板文字 | Canvas 貼圖（程式繪製文字） | `Blackboard`／`RulesBoard`／`VoteBoard3D` |
| 材質 | `MeshToonMaterial` + 3 階漸層貼圖，顏色快取 | `materials.ts` |

## 2.5D 備援（`src/art/`、`src/scenes/Classroom.tsx`）

| 素材 | 狀態 |
|---|---|
| SVG 分層角色（同 mood／pose） | 原創 SVG，可用 |
| 等角教室、家具、窗簾、陽光、黑板、布告欄 | 原創 SVG，水彩邊緣濾鏡（省電時關閉） |

## 介面

| 素材 | 狀態 |
|---|---|
| 圖示 34 個（`components/icons.tsx`） | 原創 SVG 線條圖示，不依賴 emoji |
| 紙紋 | 內嵌 SVG 噪點 data URI |
| 紙花、完成徽章 | CSS |

## 音效（`src/ui/sfx.ts`）

| 名稱 | 狀態 |
|---|---|
| tap / pick / drop / invalid / success / complete / whoosh / hand / tick / page / open | Web Audio 即時合成，原創、無授權問題；使用者手勢後才播放，可靜音與調音量 |
| 上課鐘聲 | Web Audio 合成鐘聲音色，旋律為西敏寺鐘聲（1793，公有領域） |
| 背景音樂 | 原創音樂盒循環（C 大調 I–vi–IV–V，88 BPM），Web Audio 即時合成，可關閉 |
| 短片人聲（43 句） | Kokoro-82M（hexgrad，Apache-2.0）在本機產生的 MP3：`public/voice/shorts/<短片>-<場景>-<句>.mp3`。角色聲音：林老師 zf_xiaoxiao、旁白 zf_xiaoni、安安 zf_xiaoyi、小米 zf_xiaobei、浩浩 zm_yunxia、阿哲 zm_yunxi、小宇 zm_yunjian、大家 zm_yunyang；兒童角色升調 1.12–1.24 倍。口音為標準普通話（非臺灣腔）。重新產生：`scripts/gen_voices.py`；可用同檔名真人錄音覆蓋 |
| 遊戲內對話配音 | **未製作**（第三／四階段） |

## 仍屬佔位、建議第三／四階段替換

1. 角色：幾何拼組，建議改為統一畫風的 glTF（低多邊形、2–5k 三角面／角色）或水彩貼圖卡片角色。
2. 黑板等 Canvas 文字解析度有限（1024×236），投影時可再提高或改 DOM 標籤。
3. 角色配音（目前無）；背景音樂可改為錄製的原創配樂。
4. 教室 3D 內裝（牆、天花板、吊扇、日光燈、窗外校園、置物櫃）皆為程式幾何。
