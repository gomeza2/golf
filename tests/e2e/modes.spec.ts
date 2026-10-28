import { test, expect, type Page } from "@playwright/test";
async function local(page: Page, mode: "Arrastre" | "Pulso") {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(mode) }).click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Control del tiro" }),
  ).toBeEnabled();
  await expect(page.locator(".turn-intro")).toHaveCount(0);
}
test("catalogue starts a single 18-hole round and keeps the chosen control", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Vuelta completa/ }).click();
  await expect(
    page.getByRole("button", { name: /Vuelta completa/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Arrastre/ }).click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await expect(page.locator(".selected-round")).toContainText("18 hoyos");
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Control del tiro" }),
  ).toHaveValue("pull");
  await expect(
    page.getByRole("heading", { name: /Jardín de rebotes/ }),
  ).toBeVisible();
});
test("pull-and-release fires once, while a small drag or Escape never fires", async ({
  page,
}) => {
  await local(page, "Arrastre");
  await page.mouse.move(640, 290);
  await page.mouse.down();
  await page.mouse.move(645, 295);
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await page.mouse.move(640, 290);
  await page.mouse.down();
  await page.mouse.move(640, 410, { steps: 6 });
  await expect(
    page.getByRole("progressbar", { name: "Potencia de arrastre" }),
  ).toHaveAttribute("aria-valuenow", "67");
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await page.mouse.move(640, 290);
  await page.mouse.down();
  await page.mouse.move(640, 400, { steps: 6 });
  await page.screenshot({ path: "work/pull-gesture.png" });
  await page.mouse.up();
  await expect(page.getByText("Pelota en movimiento")).toBeVisible();
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
});
test("pulse charges a live meter, cancels on focus loss and fires only on release", async ({
  page,
}) => {
  await local(page, "Pulso");
  const button = page.getByRole("button", {
    name: "MANTENER Y SOLTAR",
    exact: true,
  });
  await button.hover();
  await page.mouse.down();
  const progress = page.getByRole("progressbar", { name: "Pulso de potencia" });
  await expect
    .poll(async () => Number(await progress.getAttribute("aria-valuenow")))
    .toBeGreaterThan(10);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await button.hover();
  await page.mouse.down();
  await page.waitForTimeout(520);
  await page.screenshot({ path: "work/pulse-gesture.png" });
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await page.mouse.up();
  await expect(page.getByText("Pelota en movimiento")).toBeVisible();
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
});
test("touch pulling releases a real shot without a separate launch button", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await local(page, "Arrastre");
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 300, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 410, id: 1 }],
    });
    await expect
      .poll(async () =>
        Number(
          await page
            .getByRole("progressbar", { name: "Potencia de arrastre" })
            .getAttribute("aria-valuenow"),
        ),
      )
      .toBeGreaterThan(50);
    await expect(page.locator(".turn-toast b")).toHaveText("0/12");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: 195, y: 410, id: 1 },
        { x: 250, y: 300, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [{ x: 250, y: 300, id: 2 }],
    });
    await expect(page.locator(".turn-toast strong")).toHaveText("Golfista 1");
    await expect(page.locator(".turn-toast b")).toHaveText("0/12");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.getByText("Pelota en movimiento")).toBeVisible();
    await expect(page.locator(".turn-toast b")).toHaveText("1/12");
    await page.screenshot({ path: "work/touch-pull.png" });
  } finally {
    await context.close();
  }
});
