import { test, expect, type Page } from "@playwright/test";
import { aceShots } from "../fixtures/aces";
test("two friends complete a whole cup through real controls, keep the cumulative result and replay", async ({
  browser,
}) => {
  test.setTimeout(240000);
  const ca = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    cb = await browser.newContext();
  await Promise.all(
    [ca, cb].map((c) =>
      c.addInitScript(() => {
        localStorage.setItem("golf-graphics-mode", "low");
        localStorage.setItem("golf-control-mode", "pulse");
      }),
    ),
  );
  try {
    const a = await ca.newPage(),
      b = await cb.newPage();
    await a.goto("/");
    await a.getByRole("button", { name: /Jugar online/ }).click();
    await a.getByRole("textbox", { name: "Tu nombre" }).fill("Ana");
    await a.getByRole("button", { name: /Crear sala/ }).click();
    await expect(a.getByTestId("room-code")).toHaveText(/^[A-F0-9]{6}$/);
    const code = await a.getByTestId("room-code").innerText();
    await a
      .getByRole("combobox", { name: "Tipo de encuentro" })
      .selectOption("risk");
    await expect(
      a.getByRole("region", { name: "Preparación de copa" }),
    ).toContainText("Ruinas del Cielo");
    await b.goto("/?room=" + code);
    await b.getByRole("button", { name: /Jugar online/ }).click();
    await b.getByRole("textbox", { name: "Tu nombre" }).fill("Luis");
    await b.getByRole("button", { name: /Unirme/ }).click();
    await expect(
      b.getByRole("combobox", { name: "Tipo de encuentro" }),
    ).toHaveValue("risk");
    await expect(
      b.getByRole("combobox", { name: "Tipo de encuentro" }),
    ).toBeDisabled();
    await expect(a.locator(".players")).toContainText("Luis", {
      timeout: 15000,
    });
    await a.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await b.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await a.getByRole("button", { name: /Comenzar partida/ }).click();
    await expect(a.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
      timeout: 15000,
    });
    await expect(a.locator(".locked-control")).toContainText("Clásico");
    await a.getByRole("button", { name: "Ver copa", exact: true }).click();
    await expect(
      a.getByRole("dialog", { name: "Marcador de la copa" }),
    ).toContainText("El reloj online sigue corriendo");
    await a.getByRole("button", { name: "Cerrar marcador" }).click();
    await a
      .getByRole("slider", { name: "Ángulo", exact: true })
      .fill(String(Number(aceShots[0].angle.toFixed(10))));
    await a
      .getByRole("slider", { name: "Potencia", exact: true })
      .fill(String(aceShots[0].power));
    await a.getByRole("button", { name: /GOLPEAR/ }).click();
    async function concede(page: Page) {
      await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
        timeout: 15000,
      });
      await page
        .getByRole("button", { name: "Más ajustes", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Ceder este hoyo", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Confirmar: 12 golpes", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Confirmar: 12 golpes", exact: true })
        .click();
    }
    for (let round = 0; round < 2; round++) {
      for (let hole = 0; hole < 3; hole++) {
        if (round !== 0 || hole !== 0) await concede(a);
        await concede(b);
        if (hole < 2) {
          await expect(
            a.getByRole("button", { name: /Siguiente hoyo/ }),
          ).toBeVisible();
          await a.getByRole("button", { name: /Siguiente hoyo/ }).click();
        }
      }
      await expect(
        a.getByRole("region", { name: "Clasificación de la copa" }),
      ).toContainText(`VUELTA ${round + 1}/2`);
      if (round === 0) {
        await a.screenshot({
          path: "work/cup-between-rounds-mobile.png",
          fullPage: true,
          animations: "disabled",
        });
        await a.getByRole("button", { name: /Siguiente vuelta/ }).click();
      }
    }
    for (const page of [a, b]) {
      const table = page.getByRole("region", {
        name: "Clasificación de la copa",
      });
      await expect(table).toContainText("Ana gana la copa.");
      await expect(table.locator("tbody tr").first()).toContainText("61");
      await expect(table.locator("tbody tr").last()).toContainText("72");
    }
    await a.screenshot({
      path: "work/cup-final-mobile.png",
      fullPage: true,
      animations: "disabled",
    });
    await a.getByRole("button", { name: /La revancha/ }).click();
    await expect(a.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
      timeout: 15000,
    });
    await a.getByRole("button", { name: "Ver copa", exact: true }).click();
    await expect(
      a.getByRole("dialog").locator("tbody tr").first(),
    ).toContainText("0");
    await a.getByRole("button", { name: "Cerrar marcador" }).click();
    await a.getByRole("button", { name: "Salir", exact: true }).click();
    await expect(b.locator(".leaderboard")).toContainText("Ana · retirado");
  } finally {
    await ca.close();
    await cb.close();
  }
});

test("local concession completes a real capped round and cannot earn a challenge medal or personal record", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  await page.goto("/?challenge=c1-d-2026-11-02");
  await expect(page.locator("#boot-screen")).toHaveCount(0, { timeout: 30000 });
  await page.getByRole("button", { name: /Empezar reto individual/ }).click();
  for (let hole = 0; hole < 3; hole++) {
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
      timeout: 15000,
    });
    await page
      .getByRole("button", { name: "Más ajustes", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ceder este hoyo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar: 12 golpes", exact: true })
      .click();
    if (hole < 2)
      await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
  }
  const result = page.getByRole("region", { name: "Resultado del desafío" });
  await expect(result).toContainText("Vuelta con límite: sin marca");
  await expect(result).toContainText("36 golpes");
  expect(
    await page.evaluate(() => localStorage.getItem("club-challenges-v7-c1")),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("club-personal-normal-v7")),
  ).toBeNull();
});
