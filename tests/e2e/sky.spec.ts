import { test, expect } from "@playwright/test";
import { skyBridgeShots } from "../fixtures/sky";
test("temple and clock render their own terrain and mechanisms without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const hole of [1, 2]) {
    await page.goto("/");
    await page.getByRole("button", { name: /Ruinas del Cielo/ }).click();
    await page.locator(".training-picker summary").click();
    await page
      .getByRole("combobox", { name: "Hoyo de entrenamiento" })
      .selectOption(String(hole));
    await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    await page.getByRole("button", { name: "Ver campo", exact: true }).click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `work/sky-hole-${hole + 1}-desktop.png` });
  }
  expect(errors).toEqual([]);
});
test("mobile sky route has adaptive scenery and a real two-shot shortcut with saved progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Ruinas del Cielo/ }).click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(
    page.getByRole("heading", { name: /El claustro suspendido/ }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("data-scenery", "ruins");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page
    .getByRole("button", { name: "Sonido y controles", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Calidad visual", exact: true })
    .selectOption("high");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-scenery-count",
    "14",
  );
  await page.getByRole("button", { name: "Entendido", exact: true }).click();
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await page.getByRole("button", { name: "Ver campo", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "work/sky-mobile-high.png" });
  await page
    .getByRole("button", { name: "Seguir pelota", exact: true })
    .click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page
    .getByRole("button", { name: "Sonido y controles", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Calidad visual", exact: true })
    .selectOption("low");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-scenery-count",
    "4",
  );
  await page.getByRole("button", { name: "Entendido", exact: true }).click();
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  for (const [angle, power] of skyBridgeShots) {
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
  await expect(
    page.getByRole("heading", { name: "Eagle", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "work/sky-two-shot-result.png" });
  await page.reload();
  await page.getByRole("button", { name: /Reanudar partida/ }).click();
  await expect(
    page.getByRole("heading", { name: /El campo puede esperar/ }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-scenery-count",
    "4",
  );
});
