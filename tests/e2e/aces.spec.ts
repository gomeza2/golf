import { test, expect } from "@playwright/test";
import { aceShots } from "../fixtures/aces";
for (const index of [0, 1])
  test(`challenge ${index + 1} renders its route and records a genuine hole in one`, async ({
    page,
  }) => {
    if (index === 0) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator(".catalog-intro")).toContainText(
      "21 hoyos distintos",
    );
    await page.getByRole("button", { name: /Club del As/ }).click();
    await page.locator(".training-picker summary").click();
    await page
      .getByRole("combobox", { name: "Hoyo de entrenamiento" })
      .selectOption(String(index));
    await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    if (index === 0) {
      await page
        .getByRole("button", { name: "Ver campo", exact: true })
        .click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: "work/ace-bridge-mobile.png" });
      await page
        .getByRole("button", { name: "Seguir pelota", exact: true })
        .click();
    }
    const shot = aceShots[index];
    await page
      .getByRole("slider", { name: "Ángulo", exact: true })
      .fill(String(Number(shot.angle.toFixed(10))));
    await page
      .getByRole("slider", { name: "Potencia", exact: true })
      .fill(String(shot.power));
    await page.getByRole("button", { name: /GOLPEAR/ }).click();
    await expect(
      page.getByText("Pelota en movimiento", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Hoyo en uno", exact: true }),
    ).toBeVisible({ timeout: 25000 });
    await expect(page.locator(".practice-summary strong")).toContainText(
      "Oro · 1 golpe",
    );
    await expect(page.locator(".hole-outcome")).toContainText(
      "Hoyo en uno · -2",
    );
    await page.screenshot({ path: `work/ace-result-${index}.png` });
  });
