import { test, expect, type Page } from "@playwright/test";
import { tourShots } from "../fixtures/tour";
import { SCHOOL_KEY } from "../../src/school";
import { RECORDS_KEY } from "../../src/personalRecords";
async function shoot(page: Page, angle: number, power: number) {
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page
    .getByRole("slider", { name: "Ángulo", exact: true })
    .fill(String(Number(angle.toFixed(10))));
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill(String(power));
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeHidden({ timeout: 25000 });
}
test("school completes three physical exercises, recovers the guide and locked control, and keeps local progress separate", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByRole("button", { name: /Aprender jugando/ }).click();
  await expect(page.locator(".school-coach strong")).toHaveText(
    "La fuerza justa",
  );
  const clock = await page.locator(".shot-top b").innerText();
  await page.waitForTimeout(1200);
  expect(await page.locator(".shot-top b").innerText()).toBe(clock);
  await shoot(page, 0, 0.145);
  await expect(
    page.getByRole("button", { name: /Siguiente ejercicio/ }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("club-local-round") || "{}").school
            ?.phase,
      ),
    )
    .toBe("passed");
  await page.evaluate(() => localStorage.setItem("golf-control-mode", "pull"));
  await page.reload();
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect(page.locator(".locked-control")).toContainText("Clásico");
  await page.getByRole("button", { name: /Siguiente ejercicio/ }).click();
  await expect(page.locator(".school-coach strong")).toHaveText(
    "Tu aliada, la banda",
  );
  await expect(page.locator(".locked-control")).toContainText("Clásico");
  await shoot(page, 0, 0.5);
  await page.getByRole("button", { name: /Siguiente ejercicio/ }).click();
  for (const [a, p] of tourShots[0]) await shoot(page, a, p);
  await expect(
    page.getByRole("button", { name: /Terminar escuela/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "work/school-completed.png",
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).progress,
      SCHOOL_KEY,
    ),
  ).toEqual({ classic: [0, 1, 2] });
  expect(
    await page.evaluate((key) => localStorage.getItem(key), RECORDS_KEY),
  ).toBeNull();
  await page.getByRole("button", { name: /Terminar escuela/ }).click();
  await page
    .locator(".shot-mode-picker")
    .getByRole("button", { name: /Clásico/ })
    .click();
  await expect(page.locator(".school-entry")).toContainText("3/3 completados");
});
test("touch pull control completes the same target without changing the chosen scheme", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await page
      .locator(".shot-mode-picker")
      .getByRole("button", { name: /Retroceso/ })
      .click();
    await page.getByRole("button", { name: /Aprender jugando/ }).click();
    await expect(page.locator('input[aria-label="Ángulo"]')).toBeEnabled();
    await page.screenshot({ path: "work/school-touch-target.png" });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 480, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 506.1, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
    await expect(
      page.getByRole("button", { name: /Siguiente ejercicio/ }),
    ).toBeVisible({ timeout: 25000 });
    await expect(page.locator(".locked-control")).toContainText("Retroceso");
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).progress,
        SCHOOL_KEY,
      ),
    ).toEqual({ pull: [0] });
  } finally {
    await context.close();
  }
});
