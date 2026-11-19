import type { CharacterId } from "../game/types";

/**
 * 班會大挑戰：劇情、論點卡、主席決策與影響規則（第二階段新增資料）。
 * 全部為依課本 p.5–12 學習目標自編的遊戲延伸內容，非課本原文。
 * 規則是可解釋的確定性資料：同樣的選擇，永遠得到同樣的影響。
 */

export type Meter = "order" | "fair" | "voice";
export const METERS: { id: Meter; label: string; hint: string }[] = [
  { id: "order", label: "會議秩序", hint: "大家是否輪流發言、聽得清楚" },
  { id: "fair", label: "公平公正", hint: "主席是否讓每種想法都有機會" },
  { id: "voice", label: "大家被聽見", hint: "不同同學的想法有沒有說出來" },
];
export type Feeling = "happy" | "idle" | "worried" | "confused";
export type Effect = Partial<Record<Meter, number>> & {
  feel?: Partial<Record<CharacterId, Feeling>>;
};

export type DecisionOption = {
  id: string;
  label: string;
  /** 好的程序做法；用於引導性回饋，不會讓遊戲失敗 */
  good: boolean;
  effect: Effect;
  /** 選擇後看到的影響說明 */
  result: string;
  /** 影響後續模擬的標記：books＝書本問題有被提出／記錄；yun＝小芸的意見被聽見 */
  tags?: ("books" | "yun" | "me" | "reason" | "cooperate" | "kind")[];
};
/** 學生可扮演的班會角色（課本 p.7：主席、司儀、記錄） */
export type MeetingRole = "chair" | "emcee" | "recorder" | "student";
export const ROLES: { id: MeetingRole; name: string; duty: string; tip: string }[] = [
  { id: "chair", name: "主席", duty: "負責主持班會進行。", tip: "決定誰可以發言、什麼時候表決，要公平對待每個人。" },
  { id: "emcee", name: "司儀", duty: "協助宣布班會程序。", tip: "依照六個程序的順序宣布，也提醒大家發言規則。" },
  { id: "recorder", name: "記錄", duty: "負責記錄會議的內容。", tip: "清楚記下每個人的意見、表決結果和少數意見。" },
  { id: "student", name: "學生", duty: "參加班會，提出自己的看法。", tip: "發言前先舉手，專心聆聽，對事不對人，也要遵守表決結果。" },
];
/** 討論主題 */
export type TopicId = "election" | "proposal";
export const TOPICS: { id: TopicId; title: string; sub: string; pages: string; steps: string[] }[] = [
  { id: "election", title: "選舉班級幹部", sub: "選出願意為大家服務的班長", pages: "課本 p.5–6", steps: ["提名人選", "徵求附議，進行討論", "舉手表決", "宣布結果"] },
  { id: "proposal", title: "班會提案：閱讀角怎麼用？", sub: "討論並決定班級的事情", pages: "課本 p.7–12", steps: ["班會開始", "主席報告", "班長及各股股長報告", "提案討論", "臨時動議", "散會"] },
];
export type Decision = {
  id: string;
  topic: TopicId;
  role: MeetingRole;
  /** 對應正式六步驟（0–5） */
  step: number;
  /** 需要在討論中特定時機才出現的事件 */
  trigger?: "seconded" | "interrupt" | "offtopic" | "quiet" | "tie";
  speaker: CharacterId;
  /** 情境台詞 */
  prompt: string;
  question: string;
  options: DecisionOption[];
};

export const DECISIONS: Decision[] = [
  /* ===================== 主席：主持討論、維持秩序、公平發言 ===================== */
  {
    id: "open",
    topic: "proposal",
    role: "chair",
    step: 0,
    speaker: "anan",
    prompt: "主席，鐘聲響了，可是有些同學還在聊天。我們要開始了嗎？",
    question: "身為主席，你要怎麼開始班會？",
    options: [
      { id: "wait", label: "請司儀提醒大家坐好，安靜後再宣布開始", good: true, effect: { order: 15 }, result: "大家坐好了。後排的同學也聽得很清楚。" },
      { id: "shout", label: "不用等，直接大聲宣布開始", good: false, effect: { order: -10, feel: { mi: "confused" } }, result: "後排同學沒聽到開始，還有人在聊天。會議一開始就有點亂。" },
    ],
  },
  {
    id: "report",
    topic: "proposal",
    role: "chair",
    step: 1,
    speaker: "teacher",
    prompt: "主席報告時，可以讓大家知道今天要討論什麼。",
    question: "你要怎麼做主席報告？",
    options: [
      { id: "agenda", label: "說明今天的議題：午休時，閱讀角怎麼用？", good: true, effect: { order: 5, fair: 5 }, result: "大家知道今天要討論什麼，開始想自己的意見。" },
      { id: "myway", label: "先說出自己的答案：只能安靜看書", good: false, effect: { fair: -15, feel: { hao: "worried" } }, result: "主席先說了答案，浩浩不太敢說不同的想法。主席要讓大家公平表達。" },
    ],
  },
  {
    id: "officers",
    topic: "proposal",
    role: "chair",
    step: 2,
    speaker: "zhe",
    prompt: "我是衛生股長。報告：閱讀角有一本書被弄髒了，還有一本不見了。",
    question: "股長報告後，你要怎麼處理？",
    options: [
      { id: "thank", label: "謝謝股長，記下來，等一下討論時一起想辦法", good: true, effect: { voice: 10, feel: { zhe: "happy" } }, result: "阿哲覺得自己的報告有被重視。書本的問題也被記下來了。", tags: ["books"] },
      { id: "rush", label: "時間不夠了，請股長快點說完", good: false, effect: { voice: -10, feel: { zhe: "worried" } }, result: "阿哲沒說完就停下來。大家不知道書本受損的事。" },
    ],
  },
  {
    id: "interrupt",
    topic: "proposal",
    role: "chair",
    step: 3,
    trigger: "interrupt",
    speaker: "hao",
    prompt: "（小米說話時，浩浩突然大聲說）我覺得一定要有討論區啦！",
    question: "有人插話了，主席要怎麼辦？",
    options: [
      { id: "wait", label: "請浩浩先舉手，等小米說完再請他發言", good: true, effect: { order: 10, voice: 5, feel: { mi: "happy", hao: "idle" } }, result: "小米把話說完了。浩浩舉手排隊，等一下也能好好說。" },
      { id: "let", label: "讓浩浩直接說", good: false, effect: { order: -15, voice: -10, feel: { mi: "worried" } }, result: "小米的話被打斷了，她不想再說。先讓正在發言的同學說完，比較尊重。" },
    ],
  },
  {
    id: "quiet",
    topic: "proposal",
    role: "chair",
    step: 3,
    trigger: "quiet",
    speaker: "teacher",
    prompt: "主席，坐在後面的小芸一直沒有說話，她好像有想法。",
    question: "表決之前，你要怎麼做？",
    options: [
      { id: "invite", label: "邀請還沒發言的同學說說看", good: true, effect: { voice: 15, fair: 5 }, result: "小芸說：「不管用哪個方案，都要愛惜書本。」大家多了一個重要的想法。", tags: ["yun", "books"] },
      { id: "skip", label: "大家應該說完了，直接準備表決", good: false, effect: { voice: -15, fair: -5 }, result: "小芸的想法沒有被聽見。意見充分表達後再表決，才能做出更好的決定。" },
    ],
  },
  {
    id: "motion",
    topic: "proposal",
    role: "chair",
    step: 4,
    speaker: "hao",
    prompt: "我有一個臨時動議：最近有同學把書帶回家忘了還，可以討論嗎？",
    question: "臨時提出的新問題，你要怎麼處理？",
    options: [
      { id: "record", label: "請記錄寫下來，下次班會再好好討論", good: true, effect: { voice: 10, order: 5, feel: { hao: "happy" } }, result: "臨時動議被記錄下來，下次班會可以接著討論。", tags: ["books"] },
      { id: "ignore", label: "今天不討論新問題", good: false, effect: { voice: -10, feel: { hao: "worried" } }, result: "浩浩的問題沒有被記下來，下次可能也會被忘記。" },
    ],
  },

  /* ===================== 司儀：依序宣布程序、提醒規則 ===================== */
  {
    id: "e-open",
    topic: "proposal",
    role: "emcee",
    step: 0,
    speaker: "anan",
    prompt: "（主席安安）司儀，可以宣布班會開始了嗎？還有人在聊天。",
    question: "身為司儀，你要怎麼宣布？",
    options: [
      { id: "remind", label: "先提醒「請大家坐好」，安靜後宣布「班會開始」", good: true, effect: { order: 15 }, result: "大家坐好了，每個人都聽到班會開始。" },
      { id: "rush", label: "趁大家在聊天，趕快宣布開始", good: false, effect: { order: -10, feel: { mi: "confused" } }, result: "很多同學沒聽到宣布，主席要再說一次。" },
    ],
  },
  {
    id: "e-next1",
    topic: "proposal",
    role: "emcee",
    step: 1,
    speaker: "anan",
    prompt: "（主席安安）司儀，下一個程序是什麼？",
    question: "請宣布下一個程序。",
    options: [
      { id: "right", label: "宣布：「主席報告」", good: true, effect: { order: 5 }, result: "程序順利進行，主席開始報告今天的議題。" },
      { id: "jump", label: "宣布：「提案討論」", good: false, effect: { order: -10, fair: -5 }, result: "跳過主席報告和幹部報告，大家還不知道今天的議題。程序要依序進行。" },
    ],
  },
  {
    id: "e-next2",
    topic: "proposal",
    role: "emcee",
    step: 2,
    speaker: "zhe",
    prompt: "（主席報告完畢）接下來要請誰說話呢？",
    question: "請宣布下一個程序。",
    options: [
      { id: "right", label: "宣布：「班長及各股股長報告」", good: true, effect: { order: 5, voice: 5, feel: { zhe: "happy" } }, result: "股長報告了閱讀角的書本問題，大家都聽到了。", tags: ["books"] },
      { id: "jump", label: "宣布：「臨時動議」", good: false, effect: { order: -10, voice: -5, feel: { zhe: "worried" } }, result: "股長沒有機會報告，書本受損的事沒人知道。" },
    ],
  },
  {
    id: "e-interrupt",
    topic: "proposal",
    role: "emcee",
    step: 3,
    trigger: "interrupt",
    speaker: "hao",
    prompt: "（小米說話時，浩浩突然大聲說）我覺得一定要有討論區啦！",
    question: "身為司儀，你可以怎麼協助？",
    options: [
      { id: "rule", label: "提醒大家：「發言要先舉手，經主席同意才能說。」", good: true, effect: { order: 10, voice: 5, feel: { mi: "happy" } }, result: "浩浩停下來舉手。小米可以把話說完。" },
      { id: "silent", label: "這是主席的事，我不用說話", good: false, effect: { order: -10, feel: { mi: "worried" } }, result: "插話沒有被提醒，小米說到一半就停住了。司儀也可以幫忙提醒規則。" },
    ],
  },
  {
    id: "e-quiet",
    topic: "proposal",
    role: "emcee",
    step: 3,
    trigger: "quiet",
    speaker: "anan",
    prompt: "（主席安安）三位同學都說完了，司儀可以宣布表決嗎？",
    question: "表決前，你要宣布什麼？",
    options: [
      { id: "ask", label: "宣布：「還沒發言的同學，可以舉手說說看。」", good: true, effect: { voice: 15 }, result: "小芸舉手說：「不管用哪個方案，都要愛惜書本。」", tags: ["yun", "books"] },
      { id: "vote", label: "宣布：「現在馬上表決。」", good: false, effect: { voice: -15, fair: -5 }, result: "小芸沒有機會說話。意見充分表達後再表決比較好。" },
    ],
  },
  {
    id: "e-motion",
    topic: "proposal",
    role: "emcee",
    step: 4,
    speaker: "hao",
    prompt: "（浩浩看起來有話想說）",
    question: "提案討論結束了，接下來要宣布什麼？",
    options: [
      { id: "motion", label: "宣布：「臨時動議，有沒有新的問題？」", good: true, effect: { voice: 10, feel: { hao: "happy" } }, result: "浩浩提出：借書忘了還。這個問題被記錄下來。", tags: ["books"] },
      { id: "end", label: "直接宣布：「散會。」", good: false, effect: { voice: -10, order: -5, feel: { hao: "worried" } }, result: "跳過臨時動議，浩浩想說的問題沒有機會提出來。" },
    ],
  },
  {
    id: "e-close",
    topic: "proposal",
    role: "emcee",
    step: 5,
    speaker: "teacher",
    prompt: "（林老師在教室後面微笑看著大家）",
    question: "最後一個程序，你要怎麼宣布？",
    options: [
      { id: "guide", label: "宣布「散會」，並請林老師指導", good: true, effect: { fair: 5, feel: { teacher: "happy" } }, result: "林老師提醒大家：一週後要一起檢查閱讀角。" },
      { id: "bye", label: "直接說：「下課了！」", good: false, effect: { fair: -5 }, result: "少了老師的指導，大家不知道一週後要檢查什麼。" },
    ],
  },

  /* ===================== 記錄：清楚、完整、公正地記下意見 ===================== */
  {
    id: "r-open",
    topic: "proposal",
    role: "recorder",
    step: 0,
    speaker: "anan",
    prompt: "（司儀安安）記錄，班會要開始囉，你準備好了嗎？",
    question: "開會前，記錄要先做什麼？",
    options: [
      { id: "prep", label: "寫好日期和議題，準備記下大家的話", good: true, effect: { order: 5 }, result: "紀錄本上寫好了日期和「閱讀角怎麼用？」，之後很容易查到。" },
      { id: "later", label: "等有重要的事再開始寫", good: false, effect: { order: -5 }, result: "開頭沒有日期和議題，之後很難找到這次的決定。" },
    ],
  },
  {
    id: "r-officers",
    topic: "proposal",
    role: "recorder",
    step: 2,
    speaker: "zhe",
    prompt: "我是衛生股長。報告：閱讀角有一本書被弄髒了，還有一本不見了。",
    question: "股長的報告，你要怎麼記？",
    options: [
      { id: "note", label: "記下：一本書弄髒、一本不見", good: true, effect: { voice: 10, feel: { zhe: "happy" } }, result: "書本的問題被寫進紀錄，討論時大家就會想到。", tags: ["books"] },
      { id: "skip", label: "這不是今天的議題，不用記", good: false, effect: { voice: -10, feel: { zhe: "worried" } }, result: "書本受損的事沒有被記下來，很快就被忘記了。" },
    ],
  },
  {
    id: "r-interrupt",
    topic: "proposal",
    role: "recorder",
    step: 3,
    trigger: "interrupt",
    speaker: "hao",
    prompt: "（小米說話時，浩浩突然大聲說）我覺得一定要有討論區啦！",
    question: "兩個人的話同時出現，你要怎麼記錄？",
    options: [
      { id: "clear", label: "先記完小米的話，等浩浩經主席同意發言後再記他的", good: true, effect: { order: 5, voice: 5, feel: { mi: "happy" } }, result: "紀錄清楚分開了誰說了什麼。" },
      { id: "mix", label: "把兩個人的話寫在一起", good: false, effect: { order: -5, voice: -5 }, result: "紀錄分不清是誰說的，之後大家可能會誤會。" },
    ],
  },
  {
    id: "r-quiet",
    topic: "proposal",
    role: "recorder",
    step: 3,
    trigger: "quiet",
    speaker: "teacher",
    prompt: "記錄，你翻看紀錄，發現坐在後面的小芸一句話都還沒說。",
    question: "表決前，你要怎麼做？",
    options: [
      { id: "tell", label: "小聲提醒主席：「還有同學沒發言。」", good: true, effect: { voice: 15, fair: 5 }, result: "主席請小芸發言，她說：「都要愛惜書本。」你把它記了下來。", tags: ["yun", "books"] },
      { id: "keep", label: "不用管，記下已經有的意見就好", good: false, effect: { voice: -15 }, result: "小芸的想法沒有出現在紀錄裡。" },
    ],
  },
  {
    id: "r-minority",
    topic: "proposal",
    role: "recorder",
    step: 4,
    speaker: "mi",
    prompt: "表決通過分區。小米小聲說：「我還是擔心會吵……」",
    question: "會議紀錄要怎麼寫表決結果？",
    options: [
      { id: "both", label: "寫下「分區 18 票通過」，也寫下小米的擔心和改善做法", good: true, effect: { fair: 15, feel: { mi: "happy" } }, result: "紀錄同時保留了多數的決定和少數的意見，一週後可以檢查。" },
      { id: "win", label: "只寫通過的方案就好", good: false, effect: { fair: -15, feel: { mi: "worried" } }, result: "少數意見沒有被記下來，一週後就沒人記得小米的擔心。" },
    ],
  },
  {
    id: "r-close",
    topic: "proposal",
    role: "recorder",
    step: 5,
    speaker: "teacher",
    prompt: "班會快結束了。",
    question: "散會前，記錄可以怎麼做？",
    options: [
      { id: "read", label: "唸一次紀錄，請大家確認有沒有寫錯", good: true, effect: { fair: 10, order: 5 }, result: "浩浩說：「對，還有臨時動議。」紀錄更完整了。", tags: ["books"] },
      { id: "close", label: "把紀錄本收起來就好", good: false, effect: { fair: -5 }, result: "沒有確認，紀錄可能有寫錯或漏掉的地方。" },
    ],
  },
  /* ===================== 學生：參與、表達、聆聽、遵守 ===================== */
  {
    id: "s-open",
    topic: "proposal",
    role: "student",
    step: 0,
    speaker: "hao",
    prompt: "（班會要開始了，浩浩轉過來小聲說）欸，你昨天有看那本漫畫嗎？",
    question: "司儀準備宣布開始了，你要怎麼做？",
    options: [
      { id: "sit", label: "小聲說「下課再聊」，坐好準備開會", good: true, effect: { order: 10 }, result: "你們坐好了，司儀很快就宣布班會開始。" },
      { id: "chat", label: "跟浩浩繼續聊漫畫", good: false, effect: { order: -10, feel: { anan: "worried" } }, result: "司儀要停下來等你們安靜，全班一起等了好久。" },
    ],
  },
  {
    id: "s-listen",
    topic: "proposal",
    role: "student",
    step: 1,
    speaker: "anan",
    prompt: "（主席安安）今天要討論：午休時，閱讀角怎麼用？",
    question: "主席報告時，你覺得有點無聊，你會……",
    options: [
      { id: "focus", label: "專心聽議題，先想想自己的意見", good: true, effect: { voice: 5 }, result: "你知道今天要討論什麼，心裡已經有想法了。" },
      { id: "doodle", label: "在桌上畫畫、跟旁邊的人玩", good: false, effect: { order: -10 }, result: "你錯過了議題，等一下不太知道大家在討論什麼。" },
    ],
  },
  {
    id: "s-officers",
    topic: "proposal",
    role: "student",
    step: 2,
    speaker: "zhe",
    prompt: "（衛生股長阿哲報告書被弄髒時，後面有人笑說：「弄髒一本書又沒什麼。」）",
    question: "你會怎麼做？",
    options: [
      { id: "respect", label: "小聲提醒：「先聽股長說完。」", good: true, effect: { voice: 5, order: 5, feel: { zhe: "happy" } }, result: "阿哲把報告說完，大家知道書本的問題需要解決。", tags: ["books"] },
      { id: "laugh", label: "跟著一起笑", good: false, effect: { voice: -10, feel: { zhe: "worried" } }, result: "阿哲覺得報告不被重視，聲音越來越小。書本的問題被忽略了。" },
    ],
  },
  {
    id: "s-interrupt",
    topic: "proposal",
    role: "student",
    step: 3,
    trigger: "interrupt",
    speaker: "hao",
    prompt: "（小米說話時，浩浩大聲插話，旁邊同學也開始起鬨：「對啦！對啦！」）",
    question: "你也很想說話，你會……",
    options: [
      { id: "hand", label: "舉手，等主席同意再說", good: true, effect: { order: 10, feel: { mi: "happy" } }, result: "你安靜舉手，起鬨的聲音停了下來，小米把話說完。" },
      { id: "shout", label: "跟著一起大聲說「對啦！」", good: false, effect: { order: -15, voice: -5, feel: { mi: "worried" } }, result: "教室變得很吵，主席要花時間維持秩序，小米也不想說了。" },
    ],
  },
  {
    id: "s-speak",
    topic: "proposal",
    role: "student",
    step: 3,
    trigger: "quiet",
    speaker: "anan",
    prompt: "（主席安安）還有沒有同學想發言？請舉手。",
    question: "輪到你了，你要說什麼？",
    options: [
      { id: "reason", label: "「我支持分區，因為兩種需要都能照顧到。也要記得愛惜書本。」", good: true, effect: { voice: 15, fair: 5 }, result: "你說出主張和理由，大家多了一個清楚的想法。", tags: ["me", "books"] },
      { id: "whatever", label: "「隨便啦，都可以。」", good: false, effect: { voice: -5 }, result: "你的想法沒有說清楚，大家不知道你真正在乎什麼。" },
      { id: "attack", label: "「小米的想法很奇怪。」", good: false, effect: { fair: -15, feel: { mi: "worried" } }, result: "批評人而不是討論想法，會讓同學難過、不敢再說。討論要對事不對人。" },
    ],
  },
  {
    id: "s-motion",
    topic: "proposal",
    role: "student",
    step: 4,
    speaker: "anan",
    prompt: "（司儀）現在是臨時動議，有沒有新的問題？",
    question: "你發現有同學借書常常忘了還，你會……",
    options: [
      { id: "raise", label: "舉手提出：「借書忘了還，可以怎麼辦？」", good: true, effect: { voice: 10 }, result: "問題被記錄下來，下次班會可以一起想辦法。", tags: ["books"] },
      { id: "complain", label: "不說，下課再跟朋友抱怨", good: false, effect: { voice: -5 }, result: "問題沒有在班會提出，就沒有機會一起解決。" },
    ],
  },
  {
    id: "s-accept",
    topic: "proposal",
    role: "student",
    step: 5,
    speaker: "teacher",
    prompt: "（如果你支持的是「只能安靜看書」，結果沒有通過……）",
    question: "散會時，你會怎麼想、怎麼做？",
    options: [
      { id: "follow", label: "遵守決議，一起試行；有意見下次班會再提", good: true, effect: { fair: 10, order: 5 }, result: "大家一起試行新規則。一週後還可以檢討修改。" },
      { id: "refuse", label: "不服氣：「我才不要遵守！」", good: false, effect: { fair: -10, order: -10, feel: { anan: "worried" } }, result: "表決結果很難讓每個人滿意，但要遵守通過的決定；有不同想法，可以用提案再討論。" },
    ],
  },
  /* ===== 常見狀況（討論中觸發）：偏心好朋友、離題、跟著好朋友舉手、寫不完、講不停 ===== */
  {
    id: "friend",
    topic: "proposal",
    role: "chair",
    step: 3,
    trigger: "seconded",
    speaker: "hao",
    prompt: "（有兩位同學舉手。你的好朋友浩浩比較晚舉手，一直對你眨眼睛。）",
    question: "你要先請誰說話？",
    options: [
      { id: "order", label: "照舉手的順序，先舉手的先說", good: true, effect: { fair: 15 }, result: "大家看到主席很公平，都願意好好排隊。" },
      { id: "buddy", label: "先讓好朋友浩浩說", good: false, effect: { fair: -15, feel: { mi: "worried" } }, result: "先舉手的同學覺得不公平：「為什麼他可以先說？」主席要對每個人都一樣。" },
    ],
  },
  {
    id: "offtopic",
    topic: "proposal",
    role: "chair",
    step: 3,
    trigger: "offtopic",
    speaker: "hao",
    prompt: "（有同學開始說：「下禮拜運動會，我們要穿什麼？」）",
    question: "討論跑到別的事情了，你要怎麼辦？",
    options: [
      { id: "back", label: "說：「這個可以等臨時動議再說，我們先討論閱讀角。」", good: true, effect: { order: 10 }, result: "大家回到閱讀角的問題，討論繼續進行。" },
      { id: "follow", label: "跟著一起聊運動會", good: false, effect: { order: -15 }, result: "時間一直過去，閱讀角的問題還沒討論完。" },
    ],
  },
  {
    id: "e-seconded",
    topic: "proposal",
    role: "emcee",
    step: 3,
    trigger: "seconded",
    speaker: "hao",
    prompt: "（附議之後，有幾位同學沒有舉手，就直接說起話來。）",
    question: "身為司儀，你可以怎麼協助？",
    options: [
      { id: "remind", label: "宣布：「想發言的同學，請先舉手。」", good: true, effect: { order: 10 }, result: "大家安靜下來，一個一個舉手。" },
      { id: "none", label: "不用說，讓大家自己講", good: false, effect: { order: -10 }, result: "好幾個人同時說話，誰也聽不清楚。" },
    ],
  },
  {
    id: "e-long",
    topic: "proposal",
    role: "emcee",
    step: 3,
    trigger: "offtopic",
    speaker: "hao",
    prompt: "（有一位同學已經說了好久，還在說，後面的人一直等。）",
    question: "司儀可以怎麼做？",
    options: [
      { id: "time", label: "有禮貌地提醒：「請說重點，還有同學在等喔。」", good: true, effect: { order: 5, voice: 10 }, result: "他說完重點，後面的同學也有機會發言。" },
      { id: "stop", label: "大聲說：「你好吵，不要再說了！」", good: false, effect: { order: -5, fair: -10, feel: { hao: "worried" } }, result: "同學覺得很丟臉，不想再發言。提醒要有禮貌。" },
    ],
  },
  {
    id: "r-friend",
    topic: "proposal",
    role: "recorder",
    step: 3,
    trigger: "seconded",
    speaker: "hao",
    prompt: "（好朋友浩浩小聲說：「你只要寫我的意見就好啦！」）",
    question: "你要怎麼記錄？",
    options: [
      { id: "fair", label: "說：「每個人的意見我都要記。」", good: true, effect: { fair: 15 }, result: "紀錄很公正，大家都相信這份紀錄。" },
      { id: "only", label: "好吧，只寫好朋友的意見", good: false, effect: { fair: -15, feel: { mi: "worried" } }, result: "別人的意見不見了。紀錄只寫一邊，對其他人不公平。" },
    ],
  },
  {
    id: "r-fast",
    topic: "proposal",
    role: "recorder",
    step: 3,
    trigger: "offtopic",
    speaker: "mi",
    prompt: "（同學說得很快，你來不及寫。）",
    question: "記錄要怎麼辦？",
    options: [
      { id: "ask", label: "舉手請主席讓他再說一次重點", good: true, effect: { voice: 10 }, result: "同學再說一次，你清楚記下了重點。" },
      { id: "guess", label: "自己猜他的意思，隨便寫", good: false, effect: { voice: -10 }, result: "紀錄寫錯了，同學看到說：「我不是這個意思！」" },
    ],
  },
  {
    id: "s-friend",
    topic: "proposal",
    role: "student",
    step: 3,
    trigger: "seconded",
    speaker: "hao",
    prompt: "（浩浩小聲說：「等一下表決，你跟我一起舉手喔！」）",
    question: "你會怎麼做？",
    options: [
      { id: "think", label: "說：「我先聽完大家的想法，再自己決定。」", good: true, effect: { fair: 10 }, result: "你仔細聽每一種意見，再做出自己的決定。" },
      { id: "follow", label: "好朋友說的就對，跟著他舉手", good: false, effect: { fair: -10 }, result: "你還沒聽完就決定了。表決要依照自己的想法，不是看好朋友。" },
    ],
  },
  {
    id: "s-offtopic",
    topic: "proposal",
    role: "student",
    step: 3,
    trigger: "offtopic",
    speaker: "hao",
    prompt: "（你突然想到運動會的事，好想馬上說出來。）",
    question: "現在正在討論閱讀角，你會……",
    options: [
      { id: "wait", label: "先記在心裡，等臨時動議再提", good: true, effect: { order: 10 }, result: "討論沒有被打斷，你也在臨時動議時有機會說。" },
      { id: "say", label: "馬上大聲說運動會的事", good: false, effect: { order: -15 }, result: "大家開始聊運動會，閱讀角的事討論不完。" },
    ],
  },
];

/** 依角色取出決策 */
export const decisionsFor = (role: MeetingRole) => DECISIONS.filter((d) => d.role === role);

/** 角色結局：依照「好的做法」比例決定（確定性） */
export const ENDINGS: Record<MeetingRole, { high: string; mid: string; low: string; title: string }> = {
  student: {
    title: "學生",
    high: "你是會舉手表達、專心聆聽，也願意遵守決定的好夥伴。因為有你，班會討論得又順利又公平。",
    mid: "你參與了班會！有時候還可以更專心聆聽，或把理由說得更清楚。",
    low: "班會中有些時候變吵了，也有人覺得不被尊重。重新演練，看看不同的做法會怎麼改變班會。",
  },
  chair: {
    title: "主席",
    high: "你是讓每個人都敢說話的主席。大家輪流發言，少數意見也被照顧，班會的決定大家都願意遵守。",
    mid: "班會順利完成了！有幾個時候，可以再多想想怎麼讓每個人都有公平說話的機會。",
    low: "決定做出來了，但有些同學覺得自己沒有被聽見。試試重新演練，看看不同的主持方式會帶來什麼改變。",
  },
  emcee: {
    title: "司儀",
    high: "你是讓班會井然有序的司儀。程序一個接一個，大家都知道現在要做什麼。",
    mid: "班會完成了！有些程序宣布得不夠清楚，下次可以再依照六個程序的順序來宣布。",
    low: "有些程序被跳過了，大家有點搞不清楚。重新演練，試著依序宣布每個程序。",
  },
  recorder: {
    title: "記錄",
    high: "你是讓決定被好好留下來的記錄。誰說了什麼、少數意見、臨時動議，都清清楚楚。",
    mid: "紀錄完成了！還有一些重要的意見可以記得更完整。",
    low: "紀錄漏掉了一些重要的事，一週後很難檢查。重新演練，試著把每個人的意見都記下來。",
  },
};

/** 方案（與 content.plans 順序相同） */
export type PlanId = "A" | "B" | "C";
export const PLAN_IDS: PlanId[] = ["A", "B", "C"];

/** 論點卡：主張、理由、可能影響（Claim–Reason–Impact） */
export type ArgumentCard = {
  id: string;
  who: CharacterId | "yun" | "me";
  name: string;
  plan: PlanId | null;
  claim: string;
  reason: string;
  impact: string;
};
export const ARGUMENTS: ArgumentCard[] = [
  {
    id: "me",
    who: "me",
    name: "我",
    plan: "B",
    claim: "我支持分成安靜區和討論區。",
    reason: "兩種需要都能照顧到。",
    impact: "也要記得愛惜書本，看完放回原位。",
  },
  {
    id: "mi",
    who: "mi",
    name: "小米",
    plan: "A",
    claim: "午休時，閱讀角只能安靜看書。",
    reason: "午休的時候，我想安安靜靜的看書。",
    impact: "想討論漫畫的同學，就沒有地方可以聊。",
  },
  {
    id: "hao",
    who: "hao",
    name: "浩浩",
    plan: "B",
    claim: "分成安靜區和討論區。",
    reason: "分成兩區，想討論的人也有地方。",
    impact: "要安排位置，討論的聲音可能傳到安靜區。",
  },
  {
    id: "zhe",
    who: "zhe",
    name: "阿哲",
    plan: "C",
    claim: "每天輪流使用。",
    reason: "每天輪流，比較公平。",
    impact: "每個人要等比較久，也要記得是哪一天。",
  },
  {
    id: "yun",
    who: "yun",
    name: "小芸",
    plan: null,
    claim: "不管用哪個方案，都要愛惜書本。",
    reason: "上次有書被弄髒，還有一本不見了。",
    impact: "大家看完書要放回原位，書才不會不見。",
  },
];

/** 影響預測：每個方案「最可能感到不方便的人」 */
export const STAKEHOLDERS = [
  { id: "talk", label: "想討論的同學" },
  { id: "quiet", label: "想安靜看書的同學" },
  { id: "wait", label: "每天都想使用的同學" },
] as const;
export type StakeholderId = (typeof STAKEHOLDERS)[number]["id"];
export const PREDICTION_KEY: Record<PlanId, { answer: StakeholderId; why: string }> = {
  A: { answer: "talk", why: "只能安靜看書，想討論的同學就沒有地方聊天。" },
  B: { answer: "quiet", why: "兩區離太近時，討論聲可能吵到想安靜看書的同學。" },
  C: { answer: "wait", why: "輪流使用，每個人都要等到自己的那一天。" },
};

/** 照顧少數的配套措施 */
export type Measure = {
  id: string;
  label: string;
  good: boolean;
  /** 加入少數意見紀錄的句子 */
  sentence: string;
  result: string;
  effect: Effect;
};
export const MEASURES: Measure[] = [
  {
    id: "far",
    label: "把討論區放遠一點",
    good: true,
    sentence: "討論區離安靜區遠一點",
    result: "安靜區和討論區分開了，聲音比較不會互相影響。",
    effect: { feel: { mi: "happy" } },
  },
  {
    id: "volume",
    label: "約定討論時小小聲",
    good: true,
    sentence: "討論時用小小聲說話",
    result: "大家約好音量，討論的同學也照顧到想安靜的人。",
    effect: { order: 5, feel: { mi: "happy" } },
  },
  {
    id: "shelf",
    label: "用書櫃隔開兩區",
    good: true,
    sentence: "用書櫃隔開兩區",
    result: "書櫃像一道小牆，安靜區更安心。",
    effect: { feel: { mi: "happy" } },
  },
  {
    id: "review",
    label: "試行一週後再一起檢查",
    good: true,
    sentence: "試行一週後再一起檢討",
    result: "一週後大家再看看效果，需要時可以再修改。",
    effect: { fair: 5 },
  },
  {
    id: "ignore",
    label: "多數已經決定了，不用再管",
    good: false,
    sentence: "",
    result: "服從多數，不代表可以忽略少數。小米的擔心還在，她會覺得自己的想法不重要。",
    effect: { fair: -20, feel: { mi: "worried" } },
  },
];

/** 一週試行模擬：依方案與配套措施決定每天的情況（確定性規則） */
export type DayMood = "happy" | "ok" | "sad";
export type WeekDay = { day: string; mood: DayMood; text: string; who: CharacterId };

export const DAYS = ["星期一", "星期二", "星期三", "星期四", "星期五"];
