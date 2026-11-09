import { test, expect } from "@playwright/test";

for (const mobile of [false, true]) {
  test(`Grandes travesías loads and plays its forest field on ${mobile ? "mobile" : "desktop"}`, async ({
    browser,
  }) => {
    test.setTimeout(120000);
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.addInitScript(() => {
        localStorage.setItem("golf-graphics-mode", "low");
        localStorage.setItem("golf-hole-intro", "false");
      });
      await page.goto("/");
      await expect(page.locator("#boot-screen")).toHaveCount(0, {
        timeout: 60000,
      });
      await page.getByRole("button", { name: /Grandes travesías/ }).click();
      await page
        .getByRole("button", { name: /Jugar en este dispositivo/ })
        .click();
      await expect(page.locator(".selected-round")).toContainText(
        "Grandes travesías",
      );
      await page
        .getByRole("button", { name: /Comenzar recorrido/ })
        .click();
      if (await page.getByRole("button", { name: /Omitir vista/ }).isVisible())
        await page.getByRole("button", { name: /Omitir vista/ }).click();

      const canvas = page.locator("canvas");
      await expect(canvas).toHaveAttribute("data-scenery", "forest");
      await page.screenshot({
        path: `work/expeditions-forest-${mobile ? "mobile" : "desktop"}.png`,
        animations: "disabled",
      });

      await page.getByRole("button", { name: "Ver campo", exact: true }).click();
      await expect
        .poll(
          async () => {
            const raw = await canvas.getAttribute("data-field-rect");
            if (!raw) return false;
            const bounds = JSON.parse(raw);
            const viewport = page.viewportSize()!;
            return (
              bounds.left >= 0 &&
              bounds.top >= 0 &&
              bounds.right <= viewport.width &&
              bounds.bottom <= viewport.height
            );
          },
          { timeout: 15000 },
        )
        .toBe(true);
      await page.getByRole("button", { name: "Seguir pelota", exact: true }).click();

      await page
        .getByRole("slider", { name: "Ángulo", exact: true })
        .fill("0");
      await page
        .getByRole("slider", { name: "Potencia", exact: true })
        .fill("0.18");
      await page.getByRole("button", { name: /GOLPEAR/ }).click();
      await expect(
        page.getByText("Pelota en movimiento", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Pelota en movimiento", { exact: true }),
      ).toBeHidden({ timeout: 25000 });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("all four expedition environments render their own scene on mobile practice", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  const environments = ["forest", "desert", "coast", "mountain"];
  for (let hole = 0; hole < environments.length; hole++) {
    await page.goto("/");
    await page.getByRole("button", { name: /Grandes travesías/ }).click();
    await page.locator(".training-picker summary").click();
    await page
      .getByRole("combobox", { name: "Hoyo de entrenamiento" })
      .selectOption(String(hole));
    await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-scenery",
      environments[hole],
    );
    await page.screenshot({
      path: `work/expeditions-${environments[hole]}-mobile.png`,
      animations: "disabled",
    });
  }
});
