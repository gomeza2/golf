import { test, expect, type Page } from "@playwright/test";
import { riftRiskShots, riftSafeShots } from "../fixtures/rift";
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
    .fill(String(p));
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeHidden({ timeout: 25000 });
}
test("fresh visitors get the irregular course first, can change flags, and keep their selected profile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("golf-graphics-mode", "low"),
  );
  await page.goto("/");
  await expect(page.locator(".selected-round")).toContainText("Al Filo");
  const first = page
    .getByRole("group", { name: "Catálogo de recorridos" })
    .getByRole("button")
    .first();
  await expect(first).toContainText("Al Filo");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cruzadas", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cruzadas", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Jugar Al Filo/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
    timeout: 15000,
  });
  await expect(page.locator(".hole-hud")).toContainText(
    "La horquilla del vértigo",
  );
  await expect(page.locator(".hole-hud")).toContainText("82 m ruta amplia");
  await page.getByRole("button", { name: "Ver campo", exact: true }).click();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  const map = page.getByRole("img", { name: /Mapa de La horquilla/ });
  await expect(map.locator("circle").first()).toHaveAttribute("cx", "6.2");
  await expect(map.locator("circle").first()).toHaveAttribute("cy", "19.2");
  await expect(page.locator(".route-choice")).toContainText("puente");
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: "work/rift-horquilla-mobile.png",
    animations: "disabled",
  });
});
test("a complete new round plays real shortcuts, curved terrain and a diagonal descent without reset or penalties", async ({
  page,
}) => {
  test.setTimeout(300000);
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar Al Filo/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  const routes = [
    riftRiskShots[0],
    riftRiskShots[1],
    riftSafeShots[2],
    riftRiskShots[3],
  ];
  for (let hole = 0; hole < 4; hole++) {
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Ver campo", exact: true }).click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `work/rift-hole-${hole + 1}.png`,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Seguir pelota", exact: true })
      .click();
    for (const [a, p] of routes[hole]) await fire(page, a, p);
    if (hole < 3)
      await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
  }
  await expect(page.getByText("Nuevo récord personal: 14 golpes")).toBeVisible({
    timeout: 15000,
  });
  await page.screenshot({
    path: "work/rift-round-result.png",
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("club-personal-normal-v7")!).records[
          "rift:classic"
        ].best,
    ),
  ).toBe(14);
});
