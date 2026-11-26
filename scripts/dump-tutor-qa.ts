/**
 * 把AI小老師題庫輸出成文件 docs/TUTOR_QA.md。
 * 執行：npx tsx scripts/dump-tutor-qa.ts
 */
import { writeFileSync } from "node:fs";
import { TUTOR_QA, TUTOR_TOPICS } from "../src/data/tutorQA";

let md =
  "# AI小老師題庫\n\n右下角「AI小老師」能回答的問題。學生打字或用說的提問後，在這台裝置上用關鍵詞與相似度找最接近的題目回答；不連網、不使用外部 AI 服務，也不保存對話。找不到時會推薦相關問題並請學生問老師；出現欺負、危險等字詞時，先請學生告訴老師或家長（113 保護專線／110）。\n\n" +
  "來源：**課本**＝依課本 p.5–12；**遊戲延伸**＝常見狀況的處理方式（可和老師、全班約定）；**操作**＝遊戲說明。修改題庫：`src/data/tutorQA.ts`，改完執行 `npx tsx scripts/dump-tutor-qa.ts` 更新本文件。\n\n";
for (const t of TUTOR_TOPICS) {
  md += `## ${t}\n\n| 問題 | 回答 | 來源 |\n|---|---|---|\n`;
  for (const q of TUTOR_QA.filter((x) => x.topic === t)) md += `| ${q.q} | ${q.a.replace(/\|/g, "／")} | ${q.src} |\n`;
  md += "\n";
}
writeFileSync("docs/TUTOR_QA.md", md);
console.log(`${TUTOR_QA.length} questions`);
