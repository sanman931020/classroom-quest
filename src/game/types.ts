export type Scene = "home" | "reading" | "meeting" | "service";
export type CharacterId = "anan" | "zhe" | "mi" | "hao" | "teacher";
export type FurnitureId = "shelf" | "table" | "mat";
export type Point = { x: number; y: number };
export type Rule = {
  when: string;
  who: string;
  action: string;
  care: boolean;
  possible: boolean;
};
export type Proposal = { problem: string; plan: string; reason: string };
export type Day = { mood: string; observation: string };
export type Station = "clean" | "traffic" | "library" | "council";
export interface Progress {
  version: 1;
  scene: Scene;
  clues: CharacterId[];
  categories: Partial<Record<CharacterId, string>>;
  rule: Rule;
  positions: Record<FurnitureId, Point>;
  readingDone: boolean;
  election: { step: number; nominee: string; vote: string; winner: string };
  meeting: {
    step: number;
    heard: CharacterId[];
    queue: CharacterId[];
    speaker: CharacterId | null;
    seconded: boolean;
    voted: boolean;
    minority: string;
    minutes: string;
    done: boolean;
  };
  proposal: Proposal;
  service: {
    station: Station;
    role: CharacterId;
    answers: Record<string, string>;
    completed: Station[];
  };
  week: Day[];
  improvement: string;
}
export type GameEvent =
  | { type: "navigate"; scene: Scene }
  | { type: "talk"; id: CharacterId }
  | { type: "move"; id: FurnitureId; point: Point };
