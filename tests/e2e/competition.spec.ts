import { test, expect, type Page } from "@playwright/test";
import { aceShots } from "../fixtures/aces";
async function ace(page: Page) {
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page
    .getByRole("slider", { name: "Ángulo", exact: true })
    .fill(String(Number(aceShots[0].angle.toFixed(10))));
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill(String(aceShots[0].power));
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
}
test("a real points duel awards completed aces, survives reload and keeps scores and tee honours", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Club del As/ }).click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page
    .getByRole("textbox", { name: "Jugador 1", exact: true })
    .fill("Ana");
  await page.getByRole("button", { name: /Añadir jugador/ }).click();
  await page
    .getByRole("textbox", { name: "Jugador 2", exact: true })
    .fill("Luis");
  await page.getByRole("button", { name: /Duelo por puntos/ }).click();
  await page.screenshot({ path: "work/points-mobile-setup.png" });
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.locator(".hole-hud")).toContainText("DUELO POR PUNTOS");
  await expect(page.locator(".match-format-picker")).toHaveCount(0);
  await ace(page);
  await expect(page.locator(".turn-toast strong")).toHaveText("Luis", {
    timeout: 25000,
  });
  const ana = page
    .locator(".leaderboard > div")
    .filter({ has: page.locator("strong", { hasText: /^Ana$/ }) });
  await expect(ana.locator("b")).toHaveText("4 pt");
  await expect(page.locator(".score-feedback")).toContainText("+4 pt");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Partida local guardada" }),
  ).toContainText("Duelo por puntos");
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Partida en pausa" }),
  ).toBeVisible();
  await expect(page.locator(".turn-toast strong")).toHaveText("Luis");
  await expect(ana.locator("b")).toHaveText("4 pt");
  await expect(page.locator(".score-feedback")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await ace(page);
  await expect(
    page.getByRole("heading", { name: "Cada hoyo suma.", exact: true }),
  ).toBeVisible({ timeout: 25000 });
  await expect(
    page.getByRole("columnheader", { name: "PUNTOS", exact: true }),
  ).toBeVisible();
  const cells = page.locator(".points-cell b");
  await expect(cells).toHaveText(["4", "4"]);
  await expect(page.locator(".points-cell small")).toHaveText([
    "1 golpe",
    "1 golpe",
  ]);
  await page.screenshot({ path: "work/points-mobile-scorecard.png" });
  await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
  await expect(
    page.getByRole("heading", { name: /La firma de la banda/ }),
  ).toBeVisible();
  await expect(page.locator(".turn-toast strong")).toHaveText("Ana");
  await expect(ana.locator("b")).toHaveText("4 pt");
  await page.getByRole("button", { name: "Controles", exact: true }).click();
  await expect(page.locator(".match-format-picker")).toHaveCount(0);
});
test("local points require two players, removing a rival restores strokes and online offers both formats", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  const points = page.getByRole("button", { name: /Duelo por puntos/ });
  await expect(points).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Menos golpes/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Añadir jugador/ }).click();
  await points.click();
  await expect(points).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Quitar jugador 2", exact: true })
    .click();
  await expect(points).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Menos golpes/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Volver al club/ }).click();
  await page.getByRole("button", { name: /Jugar online/ }).click();
  await expect(page.locator(".setup")).toContainText(
    "Online utiliza control Clásico",
  );
  await expect(page.locator(".match-format-picker")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /Duelo por puntos/ }),
  ).toBeEnabled();
});
