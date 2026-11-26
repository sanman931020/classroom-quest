import type { Look } from "../art/Character";
import { characters } from "./content";
import type { Decision, MeetingRole, TopicId } from "./meetingStory";

/** 角色名字（含小宇、小芸） */
export const NAME: Record<string, string> = { ...Object.fromEntries(characters.map((c) => [c.id, c.name])), npc0: "小宇", npc9: "小芸" };

/** 對話台詞前綴決定說話者（例如「（主席）」） */
export function speakerOf(d: Decision, topic: TopicId, role: MeetingRole): { look: Look; name: string; role: string; text: string } {
  const m = d.prompt.match(/^（(主席安安|主席|司儀安安|司儀)）/);
  const text = m ? d.prompt.slice(m[0].length) : d.prompt;
  if (m) {
    if (m[1].startsWith("主席")) {
      if (topic === "election") return { look: "npc0", name: "小宇", role: "主席", text };
      return { look: "anan", name: "安安", role: "主席", text };
    }
    if (topic === "election") return { look: "hao", name: "浩浩", role: "司儀", text };
    return role === "recorder" || role === "student" ? { look: "npc0", name: "小宇", role: "司儀", text } : { look: "anan", name: "安安", role: "司儀", text };
  }
  const roleLabel = d.speaker === "teacher" ? "導師" : d.speaker === "zhe" && topic === "proposal" ? "衛生股長" : "同學";
  return { look: d.speaker, name: NAME[d.speaker], role: roleLabel, text };
}

