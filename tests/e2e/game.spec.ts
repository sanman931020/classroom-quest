import { test, expect } from "@playwright/test";
test("觸控拖曳、觸控替代與三場景平板版面", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5189/");
  await page.getByRole("button", { name: /閱讀角改造計畫/ }).tap();
  await page.getByLabel("教室家具配置").scrollIntoViewIfNeeded();
  const source = await page
    .getByRole("button", { name: "選取討論桌椅" })
    .boundingBox();
  const target = await page
    .getByRole("button", { name: "放置家具於第8欄第1排" })
    .boundingBox();
  const cdp = await context.newCDPSession(page);
  const start = {
    x: source!.x + source!.width / 2,
    y: source!.y + source!.height / 2,
  };
  const end = {
    x: target!.x + target!.width / 2,
    y: target!.y + target!.height / 2,
  };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [end],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(
    page.getByRole("button", { name: "選取討論桌椅" }),
  ).toHaveAttribute("style", /left: 88/);
  await page.getByRole("button", { name: "討論桌椅", exact: true }).tap();
  await page.getByRole("button", { name: "放置家具於第7欄第1排" }).tap();
  await expect(
    page.getByRole("button", { name: "選取討論桌椅" }),
  ).toHaveAttribute("style", /left: 76/);
  await page.getByRole("button", { name: "返回活動地圖" }).tap();
  for (const activity of ["閱讀角改造計畫", "班會大挑戰", "校園服務特攻隊"]) {
    await page.getByRole("button", { name: new RegExp(activity) }).tap();
    for (const [width, height] of [
      [1024, 768],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width, height });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    if (activity === "校園服務特攻隊")
      await page.screenshot({
        path: "test-results/service.png",
        fullPage: true,
      });
    await page.getByRole("button", { name: "返回活動地圖" }).tap();
  }
  await context.close();
});
test("閱讀角完整改造與滑鼠拖曳", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /快樂的班級生活/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/home.png",
    fullPage: false,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /閱讀角改造計畫/ }).click();
  for (const [name, category] of [
    ["安安", "公平使用"],
    ["阿哲", "環境整理"],
    ["小米", "聲音干擾"],
    ["浩浩", "公平使用"],
    ["林老師", "公約原則"],
  ]) {
    await page
      .getByRole("button", { name: new RegExp(name + ".*聊一聊") })
      .click();
    await page.getByLabel(name + "問題分類").selectOption(category);
  }
  await page.getByRole("button", { name: "我可以怎麼幫忙？" }).click();
  await expect(
    page.getByText("模擬是練習；實際試行後，還要聽聽每一位同學。"),
  ).toBeVisible();
  await page.getByLabel("什麼時間？").fill("午休時");
  await page.getByLabel("要怎麼做？").fill("閱讀小聲，討論到討論桌");
  await page.getByLabel("我已照顧安靜與討論兩種需要").check();
  await page.getByLabel("我們有時間、空間和物品做到").check();
  await page.getByLabel("教室家具配置").scrollIntoViewIfNeeded();
  const table = await page
    .getByRole("button", { name: "選取討論桌椅" })
    .boundingBox();
  const target = await page
    .getByRole("button", { name: "放置家具於第8欄第1排" })
    .boundingBox();
  await page.mouse.move(
    table!.x + table!.width / 2,
    table!.y + table!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    target!.x + target!.width / 2,
    target!.y + target!.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "啟動情境模擬" }).click();
  await expect(page.getByText("改造計畫通過！")).toBeVisible();
  await page.screenshot({ path: "test-results/reading.png", fullPage: true });
  await page.reload();
  await expect(page.getByText("✓ 公約小檢查已完成並儲存")).toBeVisible();
  await page.getByRole("button", { name: "重設家具" }).click();
  await page.getByRole("button", { name: "啟動情境模擬" }).click();
  await expect(page.getByText("再調整一下")).toBeVisible();
});
test("班會完整選舉、發言與決議紀錄", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /班會大挑戰/ }).click();
  await page.getByRole("button", { name: "完成目前程序" }).click();
  await expect(page.getByRole("status")).toContainText("先完成四步驟");
  await page.getByLabel("提名班長（任期：本次教學演練）").selectOption("安安");
  await page.getByRole("button", { name: "確認提名" }).click();
  await page.getByRole("button", { name: "我附議，完成討論" }).click();
  await page.getByLabel("我的舉手支持").selectOption("阿哲");
  await page.getByRole("button", { name: "舉手支持", exact: true }).click();
  await page.getByRole("button", { name: "宣布選舉結果" }).click();
  await page.getByLabel("我發現的問題").fill("閱讀角聲音互相干擾");
  await page.getByLabel("我的提案").fill("分區使用");
  await page.getByLabel("我的理由").fill("讓大家的需要都有被照顧");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "完成目前程序" }).click();
  await page.getByRole("button", { name: "進行教材示範表決" }).click();
  await expect(page.getByRole("status")).toContainText("三種意見都聽完");
  await page.getByRole("button", { name: "徵求附議", exact: true }).click();
  for (const name of ["小米", "浩浩", "阿哲"]) {
    await page
      .getByRole("button", { name: new RegExp(name + ".*舉手申請") })
      .click();
    await page.getByRole("button", { name: "主席同意下一位發言" }).click();
    await page.getByRole("button", { name: "我聽完了" }).click();
  }
  await page.getByRole("button", { name: "進行教材示範表決" }).click();
  await expect(page.getByText("18 票")).toBeVisible();
  await page
    .getByLabel("小米還擔心太吵，你會如何照顧少數？")
    .fill("把討論桌放遠，一週後再次討論");
  await page.getByRole("button", { name: "完成目前程序" }).click();
  await page
    .getByLabel("臨時動議紀錄（沒有可填無）")
    .fill("下週再檢查歸還書籍情況");
  await page.getByRole("button", { name: "完成目前程序" }).click();
  await page.getByRole("button", { name: "宣布散會並儲存決議" }).click();
  await expect(
    page.getByRole("button", { name: "✓ 班會已完成" }),
  ).toBeDisabled();
  await expect(page.locator("pre")).toContainText("下週再檢查歸還書籍情況");
  await page.screenshot({ path: "test-results/meeting.png", fullPage: true });
});
test("三入口、獨立服務與重新整理恢復", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /閱讀角改造計畫/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /班會大挑戰/ })).toBeVisible();
  await page.getByRole("button", { name: /校園服務特攻隊/ }).click();
  await page
    .getByRole("button", { name: "紙類回收", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "塑膠回收", exact: true }).click();
  await page
    .getByRole("button", { name: "通知老師並遠離", exact: true })
    .click();
  await page.getByRole("button", { name: "完成本站服務" }).click();
  await page
    .getByRole("button", { name: "😊 笑臉", exact: true })
    .first()
    .click();
  await page.getByLabel("星期一，我發現").fill("大家有一起整理");
  await page.reload();
  await expect(page.getByLabel("星期一，我發現")).toHaveValue("大家有一起整理");
  await page.getByRole("button", { name: "返回活動地圖" }).click();
  await expect(page.getByText("已完成 1 / 3 個活動")).toBeVisible();
});
test("家具點選替代、程序跳步提示與平板寬度", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /閱讀角改造計畫/ }).click();
  await page.getByRole("button", { name: "討論桌椅", exact: true }).click();
  await page.getByRole("button", { name: "放置家具於第8欄第1排" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "選取討論桌椅" }),
  ).toHaveAttribute("style", /left: 88/);
  await page.getByRole("button", { name: "返回活動地圖" }).click();
  await page.getByRole("button", { name: /班會大挑戰/ }).click();
  await page.getByRole("button", { name: "4. 提案討論" }).click();
  await expect(page.getByRole("status")).toContainText("請依序");
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
