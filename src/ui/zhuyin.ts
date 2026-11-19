/**
 * 注音破音字校正（Bpmf 注音字型 IVS）。
 *
 * Bpmf Huninn 每個字預設顯示第一個讀音；在字後加上異體選擇器
 * U+E01E1、U+E01E2… 可改用第 2、3… 個讀音（順序依 ButTaiwan/bpmfvs
 * phonetic/phonic_table_Z.txt）。本檔以「詞」為單位指定讀音，
 * 例如「班長」的「長」要讀 ㄓㄤˇ（第 2 讀音）。
 *
 * 讀音索引：0＝預設（不加選擇器），1＝第 2 讀音，以此類推。
 * 只列出遊戲文字中預設讀音會錯的詞；新增台詞時請檢查破音字。
 */
const VS_BASE = 0xe01e0;

/** 詞 → 每個字的讀音索引 */
export const WORDS: Record<string, number[]> = {
  // 長：ㄔㄤˊ／ㄓㄤˇ
  班長: [0, 1], 股長: [0, 1], 校長: [0, 1], 組長: [0, 1], 隊長: [0, 1], 家長: [0, 1], 長大: [1, 0], 成長: [0, 1], 會長: [0, 1], 社長: [0, 1],
  // 還：ㄏㄞˊ／ㄏㄨㄢˊ
  借還: [0, 1], 還書: [1, 0], 歸還: [0, 1], 還給: [1, 0], 還錢: [1, 0], 忘了還: [0, 0, 1],
  // 重：ㄓㄨㄥˋ／ㄔㄨㄥˊ
  重新: [1, 0], 重來: [1, 0], 重玩: [1, 0], 重數: [1, 1], 重複: [1, 0], 重寫: [1, 0], 重做: [1, 0], 重選: [1, 0], 重演: [1, 0],
  // 數：ㄕㄨˋ／ㄕㄨˇ（動詞）
  數一數: [1, 0, 1], 數票: [1, 0], 數完: [1, 0], 數清楚: [1, 0, 0], 再數: [0, 1], 一邊數: [0, 0, 1], 數到: [1, 0], 數一次: [1, 0, 0], 數得: [1, 1],
  // 調：ㄊㄧㄠˊ／ㄉㄧㄠˋ
  調查: [1, 0],
  // 處：ㄔㄨˇ／ㄔㄨˋ
  好處: [0, 1], 壞處: [0, 1], 長處: [0, 1], 到處: [0, 1], 處處: [1, 1],
  // 得：ㄉㄜˊ／˙ㄉㄜ
  覺得: [0, 1], 記得: [0, 1], 做得: [0, 1], 說得: [0, 1], 聽得: [0, 1], 看得: [0, 1], 寫得: [0, 1], 來得: [0, 1], 變得: [0, 1], 值得: [0, 1], 懂得: [0, 1], 捨得: [0, 1], 顯得: [0, 1], 弄得: [0, 1], 吵得: [0, 1], 玩得: [0, 1], 過得: [0, 1], 記得到: [0, 1, 0],
  // 為：ㄨㄟˊ／ㄨㄟˋ
  因為: [0, 1], 為了: [1, 0], 為什麼: [1, 0, 0], 為大家: [1, 0, 0], 為同學: [1, 0, 0], 為班級: [1, 0, 0], 為別人: [1, 0, 0],
  // 分：ㄈㄣ／ㄈㄣˋ
  充分: [0, 1], 部分: [0, 1], 一分子: [0, 1, 0], 分子: [1, 0], 身分: [0, 1], 本分: [0, 1], 成分: [0, 1], 過分: [0, 1],
  // 當：ㄉㄤ／ㄉㄤˋ
  適當: [0, 1], 恰當: [0, 1], 當作: [1, 0], 當成: [1, 0], 上當: [0, 1], 妥當: [0, 1],
  // 應：ㄧㄥ／ㄧㄥˋ
  回應: [0, 1], 反應: [0, 1], 答應: [1, 1], 適應: [0, 1], 對應: [0, 1],
  // 相：ㄒㄧㄤˋ／ㄒㄧㄤ
  相信: [1, 0], 互相: [0, 1], 相同: [1, 0], 相處: [1, 0], 相反: [1, 0], 相關: [1, 0], 相似: [1, 0], 相比: [1, 0],
  // 量：ㄌㄧㄤˋ／ㄌㄧㄤˊ
  商量: [0, 1], 量一量: [1, 0, 1],
  // 角：ㄐㄧㄠˇ／ㄐㄩㄝˊ
  角色: [1, 0], 主角: [0, 1], 配角: [0, 1],
  // 省：ㄕㄥˇ／ㄒㄧㄥˇ
  反省: [0, 1], 自省: [0, 1],
  // 要：ㄧㄠˋ／ㄧㄠ
  要求: [1, 0],
  // 了：˙ㄌㄜ／ㄌㄧㄠˇ
  了解: [1, 0], 了不起: [1, 0, 0],
  // 便：ㄅㄧㄢˋ／ㄆㄧㄢˊ
  便宜: [1, 0],
  // 好：ㄏㄠˇ／ㄏㄠˋ
  喜好: [0, 1], 愛好: [0, 1], 好奇: [1, 0], 好學: [1, 0],
  // 空：ㄎㄨㄥ／ㄎㄨㄥˋ
  空格: [1, 0], 空白: [1, 0], 有空: [0, 1], 空位: [1, 0],
  // 樂：ㄌㄜˋ／ㄩㄝˋ
  音樂: [0, 1], 樂器: [1, 0],
  // 著：˙ㄓㄜ／ㄓㄨˋ／ㄓㄠ／ㄓㄠˊ
  著急: [3, 0], 睡著: [0, 3], 著名: [1, 0],
  // 地：ㄉㄧˋ／˙ㄉㄜ（副詞）
  慢慢地: [0, 0, 1], 好好地: [0, 0, 1], 認真地: [0, 0, 1], 安靜地: [0, 0, 1], 輕輕地: [0, 0, 1], 大聲地: [0, 0, 1], 小聲地: [0, 0, 1], 開心地: [0, 0, 1], 清楚地: [0, 0, 1], 有禮貌地: [0, 0, 0, 1],
  // 的：˙ㄉㄜ／ㄉㄧˊ／ㄉㄧˋ
  目的: [0, 2], 的確: [1, 0],
  // 思：ㄙ／ㄙㄞ／˙ㄙ
  意思: [0, 2],
  // 與：ㄩˇ／ㄩˋ
  參與: [0, 1],
  // 謝：ㄒㄧㄝˋ／˙ㄒㄧㄝ
  謝謝: [0, 1],
  // 切：ㄑㄧㄝ／ㄑㄧㄝˋ
  親切: [0, 1], 一切: [0, 1],
  // 教：ㄐㄧㄠˋ／ㄐㄧㄠ（動詞）
  教大家: [1, 0, 0],
  // 子、字：輕聲
  名字: [0, 1], 桌子: [0, 1], 椅子: [0, 1], 樣子: [0, 1], 孩子: [0, 1], 句子: [0, 1], 本子: [0, 1], 日子: [0, 1], 帽子: [0, 1], 箱子: [0, 1], 盒子: [0, 1], 杯子: [0, 1], 影子: [0, 1], 鞋子: [0, 1], 房子: [0, 1], 院子: [0, 1],
  // 頭：輕聲
  前頭: [0, 1], 裡頭: [0, 1], 外頭: [0, 1],
  // 背：ㄅㄟˋ／ㄅㄟ
  背書包: [1, 0, 0],
  // 中：ㄓㄨㄥ／ㄓㄨㄥˋ
  猜中: [0, 1], 打中: [0, 1], 看中: [0, 1],
  // 更：ㄍㄥˋ／ㄍㄥ
  更改: [1, 0], 變更: [0, 1],
};

const VS_RE = /[\u{E01E0}-\u{E01EF}]/gu;
const keys = Object.keys(WORDS).sort((a, b) => b.length - a.length);
const WORD_RE = new RegExp(keys.join("|"), "g");

export function stripVS(text: string) {
  return text.replace(VS_RE, "");
}

/** 為文字中的破音字詞插入讀音選擇器（可重複呼叫，結果不變） */
export function annotate(text: string) {
  const plain = stripVS(text);
  if (!/[一-鿿]/.test(plain)) return plain;
  return plain.replace(WORD_RE, (w) =>
    Array.from(w)
      .map((ch, i) => {
        const idx = WORDS[w][i] ?? 0;
        return idx > 0 ? ch + String.fromCodePoint(VS_BASE + idx) : ch;
      })
      .join(""),
  );
}

const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CANVAS", "TITLE"]);
function processNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const p = node.parentElement;
    if (!p || SKIP.has(p.tagName) || p.isContentEditable || p.closest(".no-zhuyin")) return;
    const v = node.nodeValue ?? "";
    const n = annotate(v);
    if (n !== v) node.nodeValue = n;
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE && SKIP.has((node as Element).tagName)) return;
  node.childNodes.forEach(processNode);
}
function stripNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const v = node.nodeValue ?? "";
    const n = stripVS(v);
    if (n !== v) node.nodeValue = n;
    return;
  }
  node.childNodes.forEach(stripNode);
}

/**
 * 在整個頁面套用破音字校正：初次掃描＋ MutationObserver 監看新文字。
 * 回傳停止函式（關閉注音時會移除選擇器）。
 */
export function startZhuyinFix(root: HTMLElement = document.body) {
  processNode(root);
  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") processNode(m.target);
      else m.addedNodes.forEach(processNode);
    }
  });
  obs.observe(root, { subtree: true, childList: true, characterData: true });
  return () => {
    obs.disconnect();
    stripNode(root);
  };
}
