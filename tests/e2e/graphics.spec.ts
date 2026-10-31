import { test, expect, type Page } from "@playwright/test";
const ratio = (page: Page) =>
  page
    .locator("canvas")
    .evaluate((c: HTMLCanvasElement) => c.width / c.clientWidth);
test("mobile quality changes the real drawing buffer, stays selectable and persists across reload", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      const sizes: number[] = [];
      Object.defineProperty(window, "__golfTextureSizes", { get: () => sizes });
      const proto = WebGL2RenderingContext.prototype,
        image = proto.texImage2D,
        storage = proto.texStorage2D;
      proto.texImage2D = function (...args: any[]) {
        if (
          args.length === 9 &&
          typeof args[3] === "number" &&
          args[3] === args[4]
        )
          sizes.push(args[3]);
        return Reflect.apply(image, this, args);
      };
      proto.texStorage2D = function (...args: Parameters<typeof storage>) {
        if (args[3] === args[4]) sizes.push(args[3]);
        return storage.apply(this, args);
      };
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator("#boot-screen")).toHaveCount(0, {
      timeout: 30000,
    });
    await page.getByRole("button", { name: "Ajustes", exact: true }).click();
    const select = page.getByRole("combobox", {
      name: "Calidad visual",
      exact: true,
    });
    await expect(select).toHaveValue("auto");
    await select.selectOption("low");
    await expect.poll(() => ratio(page)).toBeCloseTo(0.8, 2);
    await select.selectOption("high");
    await expect.poll(() => ratio(page)).toBeCloseTo(2, 2);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (
            window as unknown as { __golfTextureSizes: number[] }
          ).__golfTextureSizes.includes(2048),
        ),
      )
      .toBe(true);
    await page.screenshot({ path: "work/graphics-mobile-settings.png" });
    await page.getByRole("button", { name: "Entendido", exact: true }).click();
    await page.reload();
    await expect(page.locator("#boot-screen")).toHaveCount(0, {
      timeout: 30000,
    });
    await expect.poll(() => ratio(page)).toBeCloseTo(2, 2);
    await page.getByRole("button", { name: "Ajustes", exact: true }).click();
    await expect(select).toHaveValue("high");
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
test("changing graphics during a paused shot keeps the ball, clock, strokes and recovery intact", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const ball = page.locator(".hole-map circle").last();
  const position = async () => [
    await ball.getAttribute("cx"),
    await ball.getAttribute("cy"),
  ];
  const frozen = await position(),
    clock = await page.locator(".shot-top b").innerText();
  await page
    .getByRole("button", { name: "Sonido y controles", exact: true })
    .click();
  const select = page.getByRole("combobox", {
    name: "Calidad visual",
    exact: true,
  });
  await select.selectOption("low");
  await expect.poll(() => ratio(page)).toBeCloseTo(0.8, 2);
  await select.selectOption("high");
  await expect.poll(() => ratio(page)).toBeCloseTo(1, 2);
  expect(await position()).toEqual(frozen);
  expect(await page.locator(".shot-top b").innerText()).toBe(clock);
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
  await page.getByRole("button", { name: "Entendido", exact: true }).click();
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect.poll(position).not.toEqual(frozen);
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
    timeout: 25000,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
  await expect(page.locator(".locked-control")).toContainText("Clásico");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-render-mode",
    "high",
  );
});
test("hidden tabs stop issuing real WebGL draw calls and resume when visible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "invalid");
    let calls = 0;
    Object.defineProperty(window, "__golfDrawCalls", { get: () => calls });
    const proto = WebGL2RenderingContext.prototype,
      draw = proto.drawElements;
    proto.drawElements = function (...args: Parameters<typeof draw>) {
      calls++;
      return draw.apply(this, args);
    };
  });
  const calls = () =>
    page.evaluate(
      () => (window as unknown as { __golfDrawCalls: number }).__golfDrawCalls,
    );
  await page.goto("/");
  await expect(page.locator("#boot-screen")).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-render-mode",
    "auto",
  );
  await expect.poll(calls).toBeGreaterThan(10);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-render-loop",
    "paused",
  );
  await page.waitForTimeout(200);
  const stopped = await calls();
  await page.waitForTimeout(500);
  expect(await calls()).toBe(stopped);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-render-loop",
    "active",
  );
  await expect.poll(calls).toBeGreaterThan(stopped);
});
