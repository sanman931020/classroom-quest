import type { Look, Marker, Mood, Pose } from "../art/Character";

/**
 * 學習小短片（遊戲內動畫）。舞台座標 1280×720，角色以腳底為錨點。
 * 每部 ≤ 90 秒；台詞為依課本學習重點自編，課本原文已標示來源。
 */
export type Actor = {
  id: string;
  look: Look;
  x: number;
  y?: number;
  scale?: number;
  /** 進場：從哪裡滑入（相對 x 位移），進場時間（場景內秒數） */
  enterFrom?: number;
  enterAt?: number;
  /** [秒, 姿勢, 表情, 標記?] 依時間切換 */
  acts?: [number, Pose, Mood, Marker?][];
  sash?: string;
  tag?: string;
};
export type Caption = { at: number; who: string; look?: Look; text: string };
export type Tally = { at: number; dur: number; rows: { label: string; to: number; color?: string }[]; note?: string };
export type Scene = {
  dur: number;
  banner?: string;
  board?: { title: string; lines: string[]; revealAt?: number[]; highlight?: number };
  actors: Actor[];
  captions: Caption[];
  tally?: Tally;
  /** 結尾整理卡片 */
  recap?: { title: string; items: string[] };
  confetti?: number;
  clap?: number;
};
export type Short = { id: ShortId; title: string; sub: string; scenes: Scene[] };
export type ShortId = "election" | "meeting" | "majority";

const F = 640; // 地板線
const ROLE = { chair: "#e98a7c", emcee: "#d6b563", recorder: "#65afa5" };

export const SHORTS: Short[] = [
  {
    id: "election",
    title: "選幹部，四步驟！",
    sub: "提名、附議與討論、舉手表決、宣布結果（還有平票怎麼辦）",
    scenes: [
      {
        dur: 7,
        banner: "選幹部，四步驟！",
        board: { title: "班長選舉", lines: [] },
        actors: [
          { id: "t", look: "teacher", x: 1080, enterFrom: 300, enterAt: 0.2, acts: [[0, "wave", "happy"]] },
          { id: "a", look: "anan", x: 300, enterFrom: -300, enterAt: 0.6, acts: [[0, "stand", "happy"]] },
          { id: "h", look: "hao", x: 470, enterFrom: -300, enterAt: 0.9, acts: [[0, "raise", "happy"]] },
        ],
        captions: [{ at: 0.5, who: "林老師", look: "teacher", text: "班上要選班長囉！選舉有四個步驟，一起來看看！" }],
      },
      {
        dur: 10,
        banner: "步驟一：提名人選",
        board: { title: "班長選舉", lines: ["候選人：", "阿哲", "安安"], revealAt: [0, 3, 7] },
        actors: [
          { id: "c", look: "npc0", x: 640, acts: [[0, "point", "talking"], [2, "stand", "idle"]], sash: ROLE.chair, tag: "主席" },
          { id: "h", look: "hao", x: 300, acts: [[0, "stand", "idle"], [1.5, "raise", "talking"], [5, "stand", "happy"]] },
          { id: "m", look: "mi", x: 960, acts: [[0, "stand", "idle"], [5.2, "raise", "talking"], [9, "stand", "happy"]] },
        ],
        captions: [
          { at: 0, who: "主席", look: "npc0", text: "請大家提名人選，要說出理由喔！" },
          { at: 1.6, who: "浩浩", look: "hao", text: "我提名阿哲！因為他做事很仔細。" },
          { at: 5.3, who: "小米", look: "mi", text: "我提名安安，她會每天檢查值日表。" },
        ],
      },
      {
        dur: 9,
        banner: "步驟二：徵求附議",
        board: { title: "班長選舉", lines: ["候選人：", "阿哲", "安安"], highlight: 0 },
        actors: [
          { id: "c", look: "npc0", x: 640, acts: [[0, "point", "talking"], [3, "stand", "happy"]], sash: ROLE.chair, tag: "主席" },
          { id: "s1", look: "npc3", x: 260, acts: [[0, "stand", "idle"], [2, "raise", "happy", "hand"]] },
          { id: "s2", look: "npc6", x: 420, acts: [[0, "stand", "idle"], [2.6, "raise", "happy", "hand"]] },
          { id: "s3", look: "npc4", x: 1000, acts: [[0, "stand", "idle"], [3.1, "raise", "happy", "hand"]] },
        ],
        captions: [
          { at: 0, who: "主席", look: "npc0", text: "有沒有人附議？贊成的請舉手！" },
          { at: 4, who: "旁白", text: "附議：一個人以上贊成這個提議，用舉手或口頭表達。" },
        ],
      },
      {
        dur: 9,
        banner: "進行討論：說說你會怎麼服務",
        actors: [
          { id: "a", look: "anan", x: 420, acts: [[0, "raise", "talking"], [4, "stand", "happy"]] },
          { id: "z", look: "zhe", x: 860, acts: [[0, "stand", "idle"], [4.2, "point", "talking"], [8, "stand", "happy"]] },
        ],
        captions: [
          { at: 0, who: "安安", look: "anan", text: "選我的話，我會每天確認值日表！" },
          { at: 4.2, who: "阿哲", look: "zhe", text: "選我的話，我會清楚記下大家的需要！" },
        ],
      },
      {
        dur: 11,
        banner: "步驟三：舉手表決",
        actors: [
          { id: "s1", look: "npc1", x: 200, acts: [[0, "stand", "idle"], [1, "raise", "happy"]] },
          { id: "s2", look: "npc2", x: 340, acts: [[0, "stand", "idle"], [2.5, "raise", "happy"]] },
          { id: "s3", look: "npc5", x: 940, acts: [[0, "stand", "idle"], [1.5, "raise", "happy"]] },
          { id: "s4", look: "npc7", x: 1080, acts: [[0, "stand", "idle"], [3, "raise", "happy"], [6.5, "stand", "confused"]] },
          { id: "t", look: "teacher", x: 640, enterFrom: 0, enterAt: 6.5, acts: [[0, "stand", "idle"], [6.6, "point", "talking"]] },
        ],
        tally: { at: 0.5, dur: 5, rows: [{ label: "安安", to: 14 }, { label: "阿哲", to: 14 }], note: "遊戲模擬票數" },
        captions: [
          { at: 0, who: "主席", look: "npc0", text: "贊成安安的請舉手……贊成阿哲的請舉手……" },
          { at: 5.6, who: "大家", text: "哇！14 比 14，平票了！" },
          { at: 6.8, who: "林老師", look: "teacher", text: "平票時，請候選人再說一次想法，大家再表決一次。" },
        ],
      },
      {
        dur: 6,
        banner: "再表決一次",
        actors: [
          { id: "s1", look: "npc1", x: 200, acts: [[0, "raise", "happy"]] },
          { id: "s3", look: "npc5", x: 940, acts: [[0, "raise", "happy"]] },
          { id: "s4", look: "npc7", x: 1080, acts: [[0, "stand", "thinking"], [1.5, "raise", "happy"]] },
        ],
        tally: { at: 0.3, dur: 4, rows: [{ label: "安安", to: 16 }, { label: "阿哲", to: 12 }], note: "遊戲模擬票數" },
        captions: [{ at: 0, who: "旁白", text: "每個人只舉手一次，用自己的想法決定喔！" }],
      },
      {
        dur: 9,
        banner: "步驟四：宣布結果",
        clap: 1,
        confetti: 1,
        actors: [
          { id: "c", look: "npc0", x: 520, acts: [[0, "point", "talking"]], sash: ROLE.chair, tag: "主席" },
          { id: "a", look: "anan", x: 760, acts: [[0, "wave", "happy"]] },
          { id: "z", look: "zhe", x: 960, acts: [[0, "stand", "idle"], [4, "wave", "happy"]] },
        ],
        captions: [
          { at: 0, who: "主席", look: "npc0", text: "安安當選班長！謝謝兩位候選人！" },
          { at: 4, who: "阿哲", look: "zhe", text: "沒選上也沒關係，我還是可以為大家服務！" },
        ],
      },
      {
        dur: 7,
        recap: { title: "選幹部四步驟", items: ["提名人選", "徵求附議，進行討論", "舉手表決", "宣布結果"] },
        actors: [
          { id: "a", look: "anan", x: 170, acts: [[0, "wave", "happy"]] },
          { id: "t", look: "teacher", x: 1110, acts: [[0, "stand", "happy"]] },
        ],
        captions: [{ at: 0, who: "林老師", look: "teacher", text: "記住四個步驟，選出願意為大家服務的人！" }],
      },
    ],
  },
  {
    id: "meeting",
    title: "開班會囉！",
    sub: "主席、司儀、記錄，和班會的六個程序",
    scenes: [
      {
        dur: 11,
        banner: "開班會囉！",
        actors: [
          { id: "p", look: "npc0", x: 330, enterFrom: -300, enterAt: 0.3, acts: [[0, "wave", "happy"], [2, "stand", "talking"]], sash: ROLE.chair, tag: "主席" },
          { id: "e", look: "anan", x: 640, enterFrom: 0, enterAt: 3.6, acts: [[0, "stand", "idle"], [4, "point", "talking"]], sash: ROLE.emcee, tag: "司儀" },
          { id: "r", look: "zhe", x: 950, enterFrom: 300, enterAt: 6.8, acts: [[0, "stand", "idle"], [7.2, "read", "talking"]], sash: ROLE.recorder, tag: "記錄" },
        ],
        captions: [
          { at: 0.5, who: "主席", look: "npc0", text: "我是主席，負責主持班會。" },
          { at: 4, who: "司儀", look: "anan", text: "我是司儀，協助宣布班會程序。" },
          { at: 7.2, who: "記錄", look: "zhe", text: "我是記錄，負責記下會議的內容。" },
        ],
      },
      {
        dur: 7,
        banner: "程序一：班會開始",
        board: { title: "班會程序", lines: ["1. 班會開始", "2. 主席報告", "3. 班長及各股股長報告", "4. 提案討論", "5. 臨時動議", "6. 散會"], highlight: 0 },
        actors: [
          { id: "e", look: "anan", x: 300, acts: [[0, "point", "talking"]], sash: ROLE.emcee, tag: "司儀" },
          { id: "s1", look: "npc2", x: 980, acts: [[0, "stand", "idle"], [2, "stand", "happy"]] },
        ],
        captions: [{ at: 0, who: "司儀", look: "anan", text: "請大家坐好。班會開始！" }],
      },
      {
        dur: 8,
        banner: "程序二：主席報告",
        board: { title: "班會程序", lines: ["1. 班會開始", "2. 主席報告", "3. 班長及各股股長報告", "4. 提案討論", "5. 臨時動議", "6. 散會"], highlight: 1 },
        actors: [{ id: "p", look: "npc0", x: 320, acts: [[0, "point", "talking"]], sash: ROLE.chair, tag: "主席" }],
        captions: [{ at: 0, who: "主席", look: "npc0", text: "今天要討論：午休時，閱讀角怎麼用？" }],
      },
      {
        dur: 9,
        banner: "程序三：班長及各股股長報告",
        board: { title: "班會程序", lines: ["1. 班會開始", "2. 主席報告", "3. 班長及各股股長報告", "4. 提案討論", "5. 臨時動議", "6. 散會"], highlight: 2 },
        actors: [
          { id: "z", look: "zhe", x: 330, acts: [[0, "stand", "worried"], [0.5, "point", "talking"]], tag: "衛生股長" },
          { id: "s1", look: "npc5", x: 1000, acts: [[0, "stand", "idle"], [4, "stand", "worried"]] },
        ],
        captions: [{ at: 0.5, who: "衛生股長", look: "zhe", text: "報告：閱讀角有一本書被弄髒了，還有一本不見了。" }],
      },
      {
        dur: 16,
        banner: "程序四：提案討論",
        board: { title: "班會程序", lines: ["1. 班會開始", "2. 主席報告", "3. 班長及各股股長報告", "4. 提案討論", "5. 臨時動議", "6. 散會"], highlight: 3 },
        actors: [
          { id: "p", look: "npc0", x: 230, acts: [[0, "stand", "talking"], [9, "point", "talking"], [13, "stand", "happy"]], sash: ROLE.chair, tag: "主席" },
          { id: "m", look: "mi", x: 640, acts: [[0, "raise", "idle", "hand"], [3, "stand", "talking"], [8, "stand", "worried"], [12, "stand", "talking"]] },
          { id: "h", look: "hao", x: 960, acts: [[0, "stand", "idle"], [6.5, "stand", "talking"], [9, "raise", "idle", "hand"]] },
        ],
        captions: [
          { at: 0, who: "旁白", text: "想發言，要先舉手，經過主席同意才能說。" },
          { at: 3, who: "小米", look: "mi", text: "我希望午休時，閱讀角可以安靜一點……" },
          { at: 6.5, who: "浩浩", look: "hao", text: "（插話）可是我們想討論漫畫啦！" },
          { at: 9, who: "主席", look: "npc0", text: "浩浩，請先舉手，等小米說完再請你說。" },
          { at: 12.5, who: "小米", look: "mi", text: "謝謝主席，我說完了！" },
        ],
      },
      {
        dur: 8,
        banner: "程序五：臨時動議",
        board: { title: "班會程序", lines: ["1. 班會開始", "2. 主席報告", "3. 班長及各股股長報告", "4. 提案討論", "5. 臨時動議", "6. 散會"], highlight: 4 },
        actors: [
          { id: "h", look: "hao", x: 380, acts: [[0, "raise", "talking", "hand"]] },
          { id: "r", look: "zhe", x: 900, acts: [[0, "read", "thinking"], [3.5, "read", "happy"]], sash: ROLE.recorder, tag: "記錄" },
        ],
        captions: [
          { at: 0, who: "浩浩", look: "hao", text: "我有臨時動議：借的書常常忘了還！" },
          { at: 3.5, who: "記錄", look: "zhe", text: "我記下來了，下次班會可以再討論。" },
        ],
      },
      {
        dur: 9,
        banner: "程序六：散會（會後請導師指導）",
        board: { title: "班會程序", lines: ["1. 班會開始", "2. 主席報告", "3. 班長及各股股長報告", "4. 提案討論", "5. 臨時動議", "6. 散會"], highlight: 5 },
        clap: 0.5,
        actors: [
          { id: "e", look: "anan", x: 300, acts: [[0, "point", "talking"], [3.5, "wave", "happy"]], sash: ROLE.emcee, tag: "司儀" },
          { id: "t", look: "teacher", x: 960, enterFrom: 300, enterAt: 3, acts: [[0, "stand", "idle"], [3.6, "stand", "talking"]] },
        ],
        captions: [
          { at: 0, who: "司儀", look: "anan", text: "散會！請林老師指導。" },
          { at: 3.6, who: "林老師", look: "teacher", text: "大家都有舉手、輪流說，真棒！" },
        ],
      },
      {
        dur: 8,
        recap: { title: "班會六個程序", items: ["班會開始", "主席報告", "班長及各股股長報告", "提案討論", "臨時動議", "散會"] },
        actors: [
          { id: "p", look: "npc0", x: 150, acts: [[0, "wave", "happy"]], sash: ROLE.chair },
          { id: "e", look: "anan", x: 1130, acts: [[0, "wave", "happy"]], sash: ROLE.emcee },
        ],
        captions: [{ at: 0, who: "旁白", text: "依照程序、先舉手再發言，班會就會又順利又公平！" }],
      },
    ],
  },
  {
    id: "majority",
    title: "服從多數，尊重少數",
    sub: "表決以後，也要照顧少數同學的想法",
    scenes: [
      {
        dur: 9,
        banner: "閱讀角怎麼用？",
        board: { title: "我們班的提案", lines: ["A. 只能安靜看書", "B. 分成安靜區和討論區", "C. 每天輪流使用"], revealAt: [1, 3, 5] },
        actors: [
          { id: "m", look: "mi", x: 260, acts: [[0, "read", "idle"], [1, "read", "talking"], [3, "read", "idle"]] },
          { id: "h", look: "hao", x: 640, acts: [[0, "stand", "idle"], [3, "point", "talking"], [5, "stand", "idle"]] },
          { id: "z", look: "zhe", x: 1020, acts: [[0, "stand", "idle"], [5, "raise", "talking"], [8, "stand", "happy"]] },
        ],
        captions: [
          { at: 1, who: "小米", look: "mi", text: "只能安靜看書！" },
          { at: 3, who: "浩浩", look: "hao", text: "分成兩區，想討論的人也有地方。" },
          { at: 5, who: "阿哲", look: "zhe", text: "每天輪流，比較公平。" },
        ],
      },
      {
        dur: 10,
        banner: "舉手表決",
        actors: [
          { id: "s1", look: "npc1", x: 180, acts: [[0, "stand", "idle"], [1, "raise", "happy"]] },
          { id: "s2", look: "npc2", x: 330, acts: [[0, "stand", "idle"], [2, "raise", "happy"]] },
          { id: "s3", look: "npc5", x: 950, acts: [[0, "stand", "idle"], [1.5, "raise", "happy"]] },
          { id: "s4", look: "npc8", x: 1100, acts: [[0, "stand", "idle"], [2.5, "raise", "happy"]] },
        ],
        tally: { at: 0.6, dur: 6, rows: [{ label: "A 安靜", to: 6 }, { label: "B 分區", to: 18, color: "#e98a7c" }, { label: "C 輪流", to: 4 }], note: "課本示範票數" },
        captions: [
          { at: 0, who: "主席", look: "npc0", text: "現在進行表決，贊成的人請舉手！" },
          { at: 7, who: "主席", look: "npc0", text: "根據表決結果，閱讀角分成安靜區和討論區。" },
        ],
      },
      {
        dur: 8,
        banner: "服從多數",
        clap: 0.3,
        actors: [
          { id: "h", look: "hao", x: 420, acts: [[0, "wave", "happy"]] },
          { id: "m", look: "mi", x: 860, acts: [[0, "stand", "idle"], [3, "stand", "worried"]] },
        ],
        captions: [
          { at: 0, who: "旁白", text: "表決通過的事，大家都要確實遵守。" },
          { at: 3.2, who: "小米", look: "mi", text: "可是……我還是擔心討論區會太吵……" },
        ],
      },
      {
        dur: 13,
        banner: "也要尊重少數",
        actors: [
          { id: "m", look: "mi", x: 640, acts: [[0, "stand", "worried"], [8.5, "stand", "happy"]] },
          { id: "a", look: "anan", x: 330, enterFrom: -300, enterAt: 0.3, acts: [[0, "stand", "talking"], [4.5, "stand", "idle"]] },
          { id: "z", look: "zhe", x: 950, enterFrom: 300, enterAt: 0.8, acts: [[0, "stand", "idle"], [4.5, "point", "talking"], [8.5, "stand", "happy"]] },
        ],
        captions: [
          { at: 0.5, who: "安安", look: "anan", text: "那我們把討論區放遠一點！" },
          { at: 4.5, who: "阿哲", look: "zhe", text: "討論的時候小小聲，一週後再一起檢查看看！" },
          { at: 8.6, who: "小米", look: "mi", text: "謝謝你們！這樣我就放心了。" },
        ],
      },
      {
        dur: 9,
        banner: "一起想辦法",
        confetti: 1,
        actors: [
          { id: "m", look: "mi", x: 400, acts: [[0, "read", "happy"]] },
          { id: "h", look: "hao", x: 880, acts: [[0, "stand", "happy"]] },
        ],
        captions: [{ at: 0, who: "旁白", text: "表決以後，照著多數人的決定去做；也要問問少數同學還有什麼困難，一起想辦法解決。" }],
      },
      {
        dur: 7,
        recap: { title: "記住這兩件事", items: ["服從多數：遵守表決的結果", "尊重少數：聽聽困難，一起想辦法"] },
        actors: [
          { id: "a", look: "anan", x: 170, acts: [[0, "wave", "happy"]] },
          { id: "m", look: "mi", x: 1110, acts: [[0, "wave", "happy"]] },
        ],
        captions: [{ at: 0, who: "林老師", look: "teacher", text: "服從多數，也尊重少數，班級才會更快樂！" }],
      },
    ],
  },
];

export const shortDuration = (s: Short) => s.scenes.reduce((a, b) => a + b.dur, 0);
export const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
export { F as FLOOR_Y };
