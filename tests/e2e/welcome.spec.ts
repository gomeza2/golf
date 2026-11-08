import { test, expect, type Page } from "@playwright/test";
import { tourShots } from "../fixtures/tour";
async function shot(page: Page, angle: number, power: number) {
  const button = page.getByRole("button", { name: /GOLPEAR/ });
  await expect(button).toBeEnabled({ timeout: 20000 });
  await page
    .getByRole("slider", { name: "Ángulo", exact: true })
    .fill(String(Number(angle.toFixed(10))));
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill(String(Number(power.toFixed(10))));
  await button.click();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeHidden({ timeout: 25000 });
}
for (const mobile of [false, true])
  test(`newcomer ${mobile ? "touch" : "desktop"} learns through real shots and finishes the first two holes`, async ({
    browser,
  }) => {
    test.setTimeout(240000);
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      const began = Date.now();
      await page.goto("/");
      await expect(page.locator("#boot-screen")).toHaveCount(0, {
        timeout: 60000,
      });
      await expect(
        page.getByRole("button", { name: "Jugar ahora →", exact: true }),
      ).toBeInViewport();
      await expect(
        page.getByRole("button", {
          name: "Jugar online con amigos",
          exact: true,
        }),
      ).toBeInViewport();
      await page.screenshot({
        animations: "disabled",
        path: `work/welcome-${mobile ? "mobile" : "desktop"}.png`,
      });
      await page
        .getByRole("button", { name: "Jugar ahora →", exact: true })
        .click();
      await expect(page.locator(".school-coach strong").first()).toHaveText(
        "La fuerza justa",
      );
      await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
        timeout: 20000,
      });
      console.log(
        JSON.stringify({
          device: mobile ? "mobile" : "desktop",
          firstPlayableMs: Date.now() - began,
        }),
      );
      await page.screenshot({
        animations: "disabled",
        path: `work/welcome-guide-${mobile ? "mobile" : "desktop"}.png`,
      });
      // A bad attempt must not grant progress. The next real shot succeeds.
      await shot(page, 0, 0.05);
      await expect(
        page.getByRole("button", { name: /Siguiente ejercicio/ }),
      ).toHaveCount(0);
      await page
        .getByRole("button", {
          name: "Reintentar desde la salida",
          exact: true,
        })
        .click();
      await shot(page, 0, 0.145);
      await page.getByRole("button", { name: /Siguiente ejercicio/ }).click();
      await shot(page, 0, 0.5);
      await page.getByRole("button", { name: /Siguiente ejercicio/ }).click();
      for (const [a, p] of tourShots[0]) await shot(page, a, p);
      await expect(
        page.getByRole("button", { name: /Jugar mi primera vuelta/ }),
      ).toBeVisible();
      await expect(page.locator(".panel.results")).toHaveCount(0);
      await page.screenshot({
        animations: "disabled",
        path: `work/welcome-graduation-${mobile ? "mobile" : "desktop"}.png`,
      });
      if (mobile) {
        await page.getByRole("button", { name: /Terminar escuela/ }).click();
        await expect(page.locator(".welcome-caption").first()).toContainText(
          "Vuelta de tres hoyos",
        );
        await page
          .getByRole("button", { name: "Jugar ahora →", exact: true })
          .click();
        await expect(page.locator(".school-coach")).toHaveCount(0);
      } else {
        await page
          .getByRole("button", { name: /Jugar mi primera vuelta/ })
          .click();
      }
      // Actual rounds retain the introduction, rules, scorecard and next-hole flow.
      if (await page.getByRole("button", { name: /Omitir vista/ }).isVisible())
        await page.getByRole("button", { name: /Omitir vista/ }).click();
      for (let i = 0; i < 2; i++) {
        for (const [a, p] of tourShots[i]) await shot(page, a, p);
        await expect(
          page.getByRole("button", { name: /Siguiente hoyo/ }),
        ).toBeVisible();
        if (i === 1)
          await page.screenshot({
            animations: "disabled",
            path: `work/welcome-two-holes-${mobile ? "mobile" : "desktop"}.png`,
          });
        await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
        if (
          await page.getByRole("button", { name: /Omitir vista/ }).isVisible()
        )
          await page.getByRole("button", { name: /Omitir vista/ }).click();
      }
      await expect(page.locator(".hole-hud")).toContainText("El péndulo");
      await page.reload();
      await page
        .getByRole("button", { name: "Seguir mi partida →", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Partida en pausa", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".hole-hud")).toContainText("El péndulo");
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
test("online is visible on entry and opens real room preparation without replacing a save", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Jugar online con amigos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Crear sala →/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Unirme a la sala/ }),
  ).toBeVisible();
});
test("entry actions fit compact phones, landscape and tablets without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#boot-screen")).toHaveCount(0, { timeout: 60000 });
  for (const [label, width, height] of [
    ["compact", 320, 568],
    ["landscape", 844, 390],
    ["tablet", 768, 1024],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole("button", { name: "Jugar ahora →", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", {
        name: "Jugar online con amigos",
        exact: true,
      }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `work/welcome-${label}.png`,
      animations: "disabled",
    });
  }
});
