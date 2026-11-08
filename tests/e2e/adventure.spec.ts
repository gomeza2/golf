import { test, expect, type Page } from "@playwright/test";
import { adventureRiskShots } from "../fixtures/adventure";
import { wrapAngle } from "../../shared/shot";
async function fire(page: Page, a: number, p: number) {
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
    timeout: 15000,
  });
  await page
    .getByRole("slider", { name: "Ángulo", exact: true })
    .fill(String(Number(wrapAngle(a).toFixed(10))));
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill(String(Number(p.toFixed(10))));
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeHidden({ timeout: 25000 });
}
test("a full Cumbres round uses high terrain, an oblique summit ace and real overpasses in three distinct places", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Jugar Cumbres y Mareas", exact: true })
    .click();
  await expect(page.locator(".selected-round")).toContainText(
    "Cumbres y Mareas",
  );
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  for (let h = 0; h < 3; h++) {
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
      timeout: 15000,
    });
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-scenery",
      ["glacier", "lighthouse", "aqueduct"][h],
    );
    await page.getByRole("button", { name: "Ver campo", exact: true }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `work/cumbres-hole-${h + 1}.png` });
    await page
      .getByRole("button", { name: "Seguir pelota", exact: true })
      .click();
    for (const [a, p] of adventureRiskShots[h]) await fire(page, a, p);
    if (h < 2)
      await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
  }
  await expect(
    page.getByText("Nuevo récord personal: 8 golpes", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("club-personal-normal-v7-p2")!).records[
          "cumbres:classic"
        ].best,
    ),
  ).toBe(8);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "work/cumbres-complete.png" });
});
test("mobile practice shows the actual lift windows and an upper route above the ground tunnel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  await page.goto("/");
  const card = page
    .locator(".course-choice")
    .filter({ hasText: "Cumbres y Mareas" });
  await card.click();
  await page.locator(".training-picker summary").click();
  await page
    .getByRole("combobox", { name: "Hoyo de entrenamiento" })
    .selectOption("2");
  await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  const gates = page.locator(".hole-map rect[aria-label^='Compuerta']");
  await expect(gates).toHaveCount(3);
  const first = await gates.first().getAttribute("aria-label");
  await expect
    .poll(() => gates.first().getAttribute("aria-label"), { timeout: 10000 })
    .not.toBe(first);
  await page.getByRole("button", { name: "Cerrar mapa", exact: true }).click();
  await fire(page, ...adventureRiskShots[2][0]);
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
  await page.getByRole("button", { name: "Ver campo", exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "work/cumbres-valves-mobile.png" });
});
