/**
 * 匯出短片台詞清單（供 scripts/gen_voices.py 產生人聲音檔）。
 * 執行：npx tsx scripts/dump-voice-lines.ts > voice-lines.json
 */
import { SHORTS } from "../src/shorts/shortsData";
import { lineId, voicePart, speakText } from "../src/shorts/voiceLines";

const out: { id: string; part: string; text: string }[] = [];
for (const s of SHORTS)
  s.scenes.forEach((sc, si) =>
    sc.captions.forEach((c, ci) => out.push({ id: lineId(s.id, si, ci), part: voicePart(c.look, c.who), text: speakText(c.text) })),
  );
process.stdout.write(JSON.stringify(out, null, 1));
