import type { CharacterId, Progress, Station } from "../game/types";
export const characters: {
  id: CharacterId;
  name: string;
  look: string;
  color: string;
  need: string;
  category: string;
  followup: string;
}[] = [
  {
    id: "anan",
    name: "安安",
    look: "髮夾",
    color: "#e98a7c",
    need: "我們需要讓每個人都能使用閱讀角的約定。",
    category: "公平使用",
    followup: "先聽完大家，再一起訂定可以實行的約定。",
  },
  {
    id: "zhe",
    name: "阿哲",
    look: "眼鏡",
    color: "#65afa5",
    need: "書要放回原位，走道也要留出來。",
    category: "環境整理",
    followup: "讓書櫃容易找到，也留出通行的空間。",
  },
  {
    id: "mi",
    name: "小米",
    look: "雙辮子",
    color: "#d6b563",
    need: "我想安靜閱讀，討論桌可以離地墊遠一些嗎？",
    category: "聲音干擾",
    followup: "我支持一起使用，也希望安靜的需要被照顧。",
  },
  {
    id: "hao",
    name: "浩浩",
    look: "刺短髮",
    color: "#84a9ca",
    need: "我想和朋友聊漫畫，希望也有討論的地方。",
    category: "公平使用",
    followup: "有討論區，我就知道可以在哪裡聊天。",
  },
  {
    id: "teacher",
    name: "林老師",
    look: "中長髮",
    color: "#a69ab6",
    need: "規則要清楚、公平、做得到。你想先檢查哪一項？",
    category: "公約原則",
    followup: "模擬是練習；實際試行後，還要聽聽每一位同學。",
  },
];
export const meetingSteps = [
  "班會開始",
  "主席報告",
  "班長及各股股長報告",
  "提案討論",
  "臨時動議",
  "散會",
];
export const electionSteps = [
  "提名人選",
  "徵求附議，進行討論",
  "舉手表決",
  "宣布結果",
];
export const plans = ["只能安靜看書", "分成安靜區和討論區", "每天輪流使用"];
export const sampleVotes = [6, 18, 4];
export const officers = [
  ["班長", "統整幹部工作、協助班務"],
  ["衛生股長", "協助整潔工作"],
  ["學藝股長", "協助學習與布置"],
  ["體育股長", "協助器材借還"],
  ["風紀股長", "溫和提醒秩序"],
];
export const stations: {
  id: Station;
  name: string;
  icon: string;
  rule: string;
  tasks: {
    id: string;
    prompt: string;
    options: string[];
    correct: string;
    feedback: string;
  }[];
}[] = [
  {
    id: "clean",
    name: "衛生隊",
    icon: "♻",
    rule: "準時服務、正確分類；尖銳或不明物品請老師處理。",
    tasks: [
      {
        id: "paper",
        prompt: "把乾淨的廢紙放進適合的籃子。",
        options: ["紙類回收", "一般垃圾", "留在地上"],
        correct: "紙類回收",
        feedback: "乾淨紙張可回收，整理後保持通道暢通。",
      },
      {
        id: "bottle",
        prompt: "空寶特瓶應放在哪裡？",
        options: ["塑膠回收", "紙類回收", "書架"],
        correct: "塑膠回收",
        feedback: "依校內分類標示回收。",
      },
      {
        id: "sharp",
        prompt: "發現碎玻璃，現在怎麼做？",
        options: ["通知老師並遠離", "徒手撿起", "請同學踩住"],
        correct: "通知老師並遠離",
        feedback: "危險物品由大人處理，學生保持距離。",
      },
    ],
  },
  {
    id: "traffic",
    name: "交通服務隊",
    icon: "⚑",
    rule: "穿好服務背心、準時到場、公平親切；在老師指導下服務，不自行指揮車輛。",
    tasks: [
      {
        id: "line",
        prompt: "朋友想插隊，請安排他的行進位置。",
        options: ["請他排隊等候", "讓朋友先走", "趕走其他人"],
        correct: "請他排隊等候",
        feedback: "服務要公平對待每一位同學。",
      },
      {
        id: "car",
        prompt: "校門有車輛突然靠近，你要怎麼做？",
        options: ["退到安全處並通知老師", "跑去攔車", "自己站到馬路中間"],
        correct: "退到安全處並通知老師",
        feedback: "由老師處理交通危險，學生先保護自己。",
      },
    ],
  },
  {
    id: "library",
    name: "圖書志工隊",
    icon: "▤",
    rule: "依分類標示整理，借還要記錄；不嘲笑、不排擠借書的人。",
    tasks: [
      {
        id: "book",
        prompt: "把《動物圖鑑》送回合適的書架。",
        options: ["自然科學架", "漫畫架", "失物箱"],
        correct: "自然科學架",
        feedback: "依主題分類，讓下一位讀者容易找到。",
      },
      {
        id: "return",
        prompt: "同學歸還一本書，請完成服務。",
        options: ["核對借閱紀錄後歸架", "直接丟進箱子", "只幫自己的朋友"],
        correct: "核對借閱紀錄後歸架",
        feedback: "核對紀錄、友善服務每一個人。",
      },
    ],
  },
  {
    id: "council",
    name: "學生自治會",
    icon: "☏",
    rule: "整理需求、反映建議；遇到霸凌、威脅或受傷，立即告訴老師或家長。",
    tasks: [
      {
        id: "idea",
        prompt: "把「希望增加安靜閱讀座位」送往適合的處理管道。",
        options: [
          "整理需求後向老師反映",
          "刪掉少數人的意見",
          "公布同學姓名取笑",
        ],
        correct: "整理需求後向老師反映",
        feedback: "反映需求並尊重每位同學的意見。",
      },
      {
        id: "threat",
        prompt: "同學說自己受到威脅，你要如何協助？",
        options: ["陪他通知老師或家長", "自己調查對質", "答應永遠保密"],
        correct: "陪他通知老師或家長",
        feedback: "不獨自處理威脅或霸凌，立即尋求大人協助。",
      },
    ],
  },
];
export function initialProgress(): Progress {
  return {
    version: 1,
    scene: "home",
    clues: [],
    categories: {},
    rule: {
      when: "",
      who: "全班同學",
      action: "",
      care: false,
      possible: false,
    },
    positions: {
      shelf: { x: 1, y: 1 },
      mat: { x: 3, y: 2 },
      table: { x: 4, y: 2 },
    },
    readingDone: false,
    election: { step: 0, nominee: "", vote: "", winner: "" },
    meeting: {
      step: 0,
      heard: [],
      queue: [],
      speaker: null,
      seconded: false,
      voted: false,
      minority: "",
      minutes: "",
      done: false,
    },
    proposal: { problem: "", plan: "", reason: "" },
    service: { station: "clean", role: "anan", answers: {}, completed: [] },
    week: Array.from({ length: 5 }, () => ({ mood: "", observation: "" })),
    improvement: "",
  };
}
