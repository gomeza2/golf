import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const APP_VERSION = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).version;
import { tourShots } from "../fixtures/tour";
import { wrapAngle } from "../../shared/shot";
test("release branding, real package version, precise power and thirty second turn are visible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Hoyo en Uno/);
  await expect(page.locator(".wordmark")).toContainText("HOYO EN UNO");
  await expect(page.locator(".edition")).toContainText(`v${APP_VERSION}`);
  await expect(page.locator(".edition")).not.toContainText("VOL.");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  const clock = await page.locator(".shot-top b").innerText();
  expect(Number.parseInt(clock)).toBeLessThanOrEqual(30);
  expect(Number.parseInt(clock)).toBeGreaterThan(25);
  const power = page.getByRole("slider", { name: "Potencia", exact: true });
  await power.fill("0.5");
  await expect(power.locator("..").locator("output")).toHaveText("50%");
  await power.fill("0.6");
  await expect(power.locator("..").locator("output")).toHaveText("60%");
  await power.fill("0.605");
  await expect(power.locator("..").locator("output")).toHaveText("60.5%");
  await page.screenshot({ path: "work/power-v020.png" });
});
test("a real two-stroke tower finish displays Eagle minus two and preserves the actual score", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".training-picker summary").click();
  await page
    .getByRole("combobox", { name: "Hoyo de entrenamiento" })
    .selectOption("1");
  await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
  for (const [angle, power] of tourShots[1]) {
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    await page
      .getByRole("slider", { name: "Ángulo", exact: true })
      .fill(String(Number(wrapAngle(angle).toFixed(10))));
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
  await expect(
    page.getByRole("heading", { name: "Eagle", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".hole-outcome")).toContainText("Eagle · -2");
  await expect(page.locator(".practice-summary strong")).toContainText(
    "Oro · 2 golpes",
  );
  await expect(
    page.getByRole("columnheader", { name: "H2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "H1", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "work/eagle-v020.png" });
});
