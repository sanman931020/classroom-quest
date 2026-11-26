import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1024, height: 768 } });
test.setTimeout(150_000);

/** 每個流程結束後：玩過時念到的每一句，都要有預錄的臺灣口音音檔 */
test.afterEach(async ({ page }, info) => {
  const heard = await page.evaluate(() => window.__narration ?? {}).catch(() => ({}) as Record<string, { part: string; text: string }>);
  const manifest = await page.evaluate(() => fetch("./voice/game/manifest.json").then((r) => (r.ok ? r.json() : {}))).catch(() => ({}));
  // 朗讀音檔尚未產生（沒有 manifest）時：先只提醒，改用裝置內建語音
  if (!Object.keys(manifest).length) {
    info.annotations.push({ type: "warning", description: "public/voice/game/manifest.json 尚未產生，朗讀使用裝置內建語音" });
    return;
  }
  const missing = Object.entries(heard)
    .filter(([k]) => !(k in manifest))
    .map(([id, l]) => ({ id, ...l }));
  if (missing.length) {
    console.log("NARRATION-MISSING " + JSON.stringify(missing));
    await info.attach("narration-missing", { body: JSON.stringify(missing, null, 1), contentType: "application/json" });
  }
  expect(missing.map((m) => `${m.part}:${m.text}`), "朗讀句子缺少音檔").toEqual([]);
});

async function enter(page: Page, cls = "四年五班", name = "小明", zhuyin = false) {
  await page.goto("/");
  // 流程測試以純文字比對；注音破音字校正另有專門測試
  await page.evaluate((z) => {
    localStorage.clear();
    localStorage.setItem("classroom-quest-ui-v1", JSON.stringify({ zhuyin: z }));
  }, zhuyin);
  await page.reload();
  await page.getByPlaceholder("如：三年二班").fill(cls);
  await page.getByPlaceholder("如：小明").fill(name);
  await expect(page.locator(".home-intro")).toContainText(`歡迎來到${cls}`);
}

async function choose(page: Page, label: string | RegExp) {
  await page.locator(".dialogue-choices").getByRole("button", { name: label }).click();
}

async function start(page: Page) {
  await page.getByRole("button", { name: "開始探索" }).click();
  // 上課鐘聲後的開場說明
  await expect(page.getByRole("dialog", { name: "開場說明" })).toBeVisible();
  await page.getByRole("button", { name: "跳過說明" }).click();
}

async function pick(page: Page, topic: string, role: string) {
  await start(page);
  await page.getByRole("group", { name: "討論主題" }).getByRole("button", { name: new RegExp(topic) }).click();
  await page.getByRole("group", { name: "班會角色" }).getByRole("button", { name: new RegExp(`^${role}`) }).click();
  await page.getByRole("button", { name: /開始！/ }).click();
}

test("入口輸入班級與名字，畫面帶入", async ({ page }) => {
  await enter(page);
  await page.screenshot({ path: "test-results/01-home.png" });
  await page.getByRole("button", { name: "開始探索" }).click();
  await expect(page.getByRole("dialog", { name: "開場說明" })).toContainText("上課囉");
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByRole("button", { name: /開始！/ }).click();
  await expect(page.getByText("小明，今天要討論什麼？")).toBeVisible();
  await expect(page.locator(".hud-title")).toContainText("四年五班・小明");
  await page.screenshot({ path: "test-results/02-topic.png" });
  await page.reload();
  await expect(page.locator(".hud-title")).toContainText("四年五班・小明");
});

test("主題一：主席主持選舉四步驟，平票再表決", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await pick(page, "選舉班級幹部", "主席");
  // 幹部配對（一次只顯示一張任務卡）
  await page.getByRole("button", { name: "先略過" }).click();
  // 步驟一：提名人選（常見狀況：好笑不是理由）
  await expect(page.locator(".dialogue-box")).toContainText("因為他很好笑");
  await choose(page, /請浩浩說說/);
  await expect(page.locator(".impact-card")).toContainText("提名有了好理由");
  await page.getByRole("group", { name: "提名班長" }).getByRole("button", { name: /安安/ }).click();
  await page.getByRole("button", { name: /確認提名/ }).click();
  // 步驟二：徵求附議，進行討論（起鬨）
  await choose(page, /有沒有人附議/);
  await choose(page, /請大家安靜/);
  await page.getByRole("button", { name: /徵求附議/ }).click();
  await page.getByRole("button", { name: /完成討論/ }).click();
  // 步驟三：舉手表決 → 平票
  await page.getByRole("group", { name: "我的舉手支持" }).getByRole("button", { name: /阿哲/ }).click();
  await page.getByRole("button", { name: /舉手表決/ }).click();
  await expect(page.locator(".dialogue-box")).toContainText("平票");
  await page.screenshot({ path: "test-results/03-election-tie.png" });
  await choose(page, /再說一次服務計畫/);
  await choose(page, /只能舉手一次/);
  await page.getByRole("button", { name: /再表決一次/ }).click();
  // 步驟四：宣布結果
  await choose(page, /謝謝兩位候選人/);
  await page.getByRole("button", { name: /宣布結果/ }).click();
  await expect(page.getByRole("dialog", { name: "選舉完成！" })).toBeVisible();
  await page.screenshot({ path: "test-results/04-election-done.png" });
  await page.locator(".completion-card").getByRole("button", { name: "觀察決定的影響" }).click();
  await expect(page.locator(".ending-card")).toContainText("公平的選舉主持人");
  await expect(page.locator(".week-strip button")).toHaveCount(5);
  await page.screenshot({ path: "test-results/05-election-impact.png" });
});

test("主題一：不好的選擇會帶來不同結局", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await pick(page, "選舉班級幹部", "學生");
  await page.getByRole("button", { name: "先略過" }).click();
  await choose(page, /開玩笑提名/);
  await expect(page.locator(".impact-card")).toContainText("尷尬");
  await page.getByRole("group", { name: "提名班長" }).getByRole("button", { name: /阿哲/ }).click();
  await page.getByRole("button", { name: /確認提名/ }).click();
  await choose(page, /一起拍桌子/);
  await page.getByRole("button", { name: /徵求附議/ }).click();
  await choose(page, /說得很有自信/);
  await page.getByRole("button", { name: /完成討論/ }).click();
  await page.getByRole("group", { name: "我的舉手支持" }).getByRole("button", { name: /阿哲/ }).click();
  await page.getByRole("button", { name: /舉手表決/ }).click();
  await choose(page, /我們贏/);
  await choose(page, /跟好朋友一樣/);
  await page.getByRole("button", { name: /再表決一次/ }).click();
  await choose(page, /我才不要聽他的/);
  await page.getByRole("button", { name: /宣布結果/ }).click();
  await page.locator(".completion-card").getByRole("button", { name: "觀察決定的影響" }).click();
  await expect(page.locator(".ending-card")).toContainText("重新演練");
  await expect(page.locator(".ending-card")).toHaveClass(/level-low/);
});

test("主題二：學生角色完成六程序班會、論點卡、少數意見與影響", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await pick(page, "閱讀角", "學生");
  await page.getByRole("button", { name: "使用預設（班長安安）" }).click();
  await page.getByRole("textbox", { name: "我發現的問題" }).fill("閱讀角聲音互相干擾");
  await page.getByRole("textbox", { name: "我的提案" }).fill("分成安靜區和討論區");
  await page.getByRole("textbox", { name: "我的理由" }).fill("兩種需要都能照顧到");
  await page.getByRole("button", { name: /帶著提案去開班會/ }).click();
  // 不能跳步
  await page.getByRole("button", { name: "4 提案討論" }).click();
  await expect(page.getByRole("status")).toContainText("請依序");
  await choose(page, /下課再聊/);
  await page.getByRole("button", { name: "完成目前程序" }).click();
  await choose(page, /專心聽議題/);
  await page.getByRole("button", { name: "完成目前程序" }).click();
  await choose(page, /先聽股長說完/);
  await page.getByRole("button", { name: "完成目前程序" }).click();
  // 提案討論
  await page.getByRole("button", { name: "徵求附議" }).click();
  await choose(page, /再自己決定/);
  await page.getByRole("button", { name: /小米.*舉手申請/ }).click();
  await page.getByRole("button", { name: /主席請下一位發言/ }).click();
  await choose(page, /舉手，等主席同意/);
  await page.getByRole("button", { name: "我聽完了" }).click();
  await choose(page, /等臨時動議再提/);
  for (const n of ["浩浩", "阿哲"]) {
    await page.getByRole("button", { name: new RegExp(`${n}.*舉手申請`) }).click();
    await page.getByRole("button", { name: /主席請下一位發言/ }).click();
    await page.getByRole("button", { name: "我聽完了" }).click();
  }
  await choose(page, /我支持分區/);
  await expect(page.locator(".card-chip")).toHaveCount(4);
  await page.getByRole("group", { name: "方案A的影響預測" }).getByRole("button", { name: "想討論的同學" }).click();
  await page.getByRole("group", { name: "方案B的影響預測" }).getByRole("button", { name: "想安靜看書的同學" }).click();
  await page.getByRole("group", { name: "方案C的影響預測" }).getByRole("button", { name: "每天都想使用的同學" }).click();
  await page.getByRole("button", { name: /進行教材示範表決/ }).click();
  await expect(page.locator(".task-card")).toContainText("6／18／4");
  await page.getByRole("button", { name: /把討論區放遠一點/ }).click();
  await page.getByRole("button", { name: /約定討論時小小聲/ }).click();
  await page.screenshot({ path: "test-results/06-proposal-vote.png" });
  await page.getByRole("button", { name: "完成目前程序" }).click();
  await choose(page, /借書忘了還/);
  await page.getByRole("textbox", { name: "臨時動議紀錄（沒有可填無）" }).fill("借書忘了還，下次提案");
  await page.getByRole("button", { name: "完成目前程序" }).click();
  await choose(page, /遵守決議/);
  await page.getByRole("button", { name: "宣布散會並儲存決議" }).click();
  await expect(page.getByRole("dialog", { name: "班會完成！" })).toBeVisible();
  await page.locator(".completion-card").getByRole("button", { name: "觀察決定的影響" }).click();
  await expect(page.locator(".ending-card")).toHaveClass(/level-high/);
  await page.screenshot({ path: "test-results/07-proposal-impact.png" });
  await page.reload();
  await expect(page.locator(".ending-card")).toBeVisible();
});

test("班會小百科有平票處理，平面模式與兩種平板比例", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "班會小百科" }).click();
  await page.getByRole("button", { name: /如果平票怎麼辦/ }).click();
  await expect(page.getByText("再討論、再表決")).toBeVisible();
  await page.screenshot({ path: "test-results/08-handbook.png" });
  await page.keyboard.press("Escape");
  // 平面模式（設定在遊戲中的暫停選單；這裡直接寫入偏好）
  await page.evaluate(() => localStorage.setItem("classroom-quest-ui-v1", JSON.stringify({ zhuyin: false, view: "2d" })));
  await page.reload();
  await start(page);
  await expect(page.locator("svg.classroom")).toBeVisible();
  for (const [width, height] of [
    [1024, 768],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const foot = await page.locator(".mission-foot").boundingBox();
    expect(foot!.y + foot!.height).toBeLessThanOrEqual(height + 1);
  }
});

test("注音模式：破音字依詞彙校正（班長、角色）", async ({ page }) => {
  await enter(page, "四年五班", "小明", true);
  await expect(page.locator("html")).toHaveAttribute("data-zhuyin", "on");
  await start(page);
  await expect(page.locator(".topic-card").first()).toBeVisible();
  const tab = await page.locator(".step-tab").first().innerText();
  expect(tab).toContain("角\u{E01E1}色");
  await page.getByRole("button", { name: "班會小百科" }).click();
  const hb = await page.locator(".handbook").innerText();
  expect(hb).toContain("班長\u{E01E1}");
  await page.screenshot({ path: "test-results/09-zhuyin.png" });
});

test("決策不需捲動：面板內容在平板畫面內", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await pick(page, "選舉班級幹部", "主席");
  const fits = async () =>
    page.evaluate(() => {
      const b = document.querySelector(".mission-body") as HTMLElement;
      return b.scrollHeight <= b.clientHeight + 2;
    });
  expect(await fits()).toBe(true);
  await page.getByRole("button", { name: "先略過" }).click();
  expect(await fits()).toBe(true);
});

test("學習小短片：從首頁開啟、跳段、播完，並在遊戲中出現提示", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await page.getByRole("button", { name: "小短片" }).click();
  await page.getByRole("button", { name: /服從多數，尊重少數/ }).click();
  const player = page.getByRole("dialog", { name: /小短片：服從多數/ });
  await expect(player).toBeVisible();
  await expect(player.locator(".short-time")).toContainText("0:56");
  await player.getByRole("button", { name: /跳到第 6 段/ }).click();
  await expect(player.getByText("看完了！")).toBeVisible({ timeout: 12_000 });
  await page.screenshot({ path: "test-results/10-short.png" });
  await player.getByRole("button", { name: "我看懂了" }).click();
  await expect(player).toBeHidden();
  // 遊戲中：選舉開始處有短片提示
  await pick(page, "選舉班級幹部", "主席");
  await expect(page.getByRole("button", { name: /先看小短片：選幹部四步驟/ })).toBeVisible();
});

test("小短片有人聲音檔：載入 MP3 並播放（聲音關也照樣播放）", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __played: string[] }).__played = [];
    const op = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as unknown as { __played: string[] }).__played.push(this.src.split("/").pop() ?? "");
      return op.call(this).catch(() => undefined);
    };
  });
  const mp3: number[] = [];
  page.on("response", (r) => r.url().includes("/voice/shorts/") && mp3.push(r.status()));
  await enter(page);
  // 首頁按「聲音關」
  await page.getByRole("button", { name: "關閉聲音" }).click();
  await page.getByRole("button", { name: "小短片" }).click();
  await page.getByRole("button", { name: /選幹部，四步驟/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __played: string[] }).__played), { timeout: 10_000 }).toContain("election-1-1.mp3");
  expect(mp3.length).toBeGreaterThan(0);
  expect(mp3.every((s) => s === 200 || s === 206 || s === 304)).toBe(true);
});

test("小老師：打字問問題，得到題庫的回答與推薦問題", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "打開小老師，問問題" }).click();
  const chat = page.getByRole("dialog", { name: "小老師聊天室" });
  await expect(chat).toContainText("我是小老師");
  await chat.getByRole("textbox", { name: "輸入問題" }).fill("如果投票一樣多怎麼辦");
  await chat.getByRole("button", { name: "送出" }).click();
  await expect(chat).toContainText("抽籤");
  await chat.getByRole("button", { name: "選幹部" }).click();
  await chat.getByRole("button", { name: "什麼是附議？" }).click();
  await expect(chat).toContainText("一個人以上贊成");
  await chat.getByRole("textbox", { name: "輸入問題" }).fill("有人一直欺負我");
  await chat.getByRole("textbox", { name: "輸入問題" }).press("Enter");
  await expect(chat).toContainText("告訴老師或家長");
  await page.screenshot({ path: "test-results/11-tutor.png" });
});
