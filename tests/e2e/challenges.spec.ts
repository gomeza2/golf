import { test, expect } from "@playwright/test";
import { aceShots } from "../fixtures/aces";
import { CHALLENGES_KEY } from "../../src/challengeRecords";
import { RECORDS_KEY } from "../../src/personalRecords";
const id = "c1-d-2026-11-02";
test("shared daily challenge completes a real round, recovers its locked attempt and records local medals without polluting ordinary records", async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() =>
    localStorage.setItem("golf-hole-intro", "false"),
  );
  await page.goto("/");
  await page
    .locator(".shot-mode-picker")
    .getByRole("button", { name: /Precisión/ })
    .click();
  await page.goto("/?challenge=" + id);
  const preview = page.getByRole("dialog", { name: "Preparar desafío" });
  await expect(preview).toContainText("Club del As");
  await preview.getByRole("button", { name: "Copiar enlace del reto" }).click();
  await expect(preview.getByRole("status")).toHaveText("Enlace copiado.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "?challenge=" + id,
  );
  await preview
    .getByRole("button", { name: /Empezar reto individual/ })
    .click();
  await expect(page.locator(".locked-control")).toContainText("Clásico");
  expect(
    await page.evaluate(() => localStorage.getItem("golf-control-mode")),
  ).toBe("pulse");
  await page.getByRole("button", { name: "Objetivos del reto" }).click();
  const goals = page.getByRole("dialog", { name: "Objetivos del reto" });
  await expect(goals).toBeVisible();
  const clock = await page.locator(".shot-top b").innerText();
  await page.waitForTimeout(1200);
  expect(await page.locator(".shot-top b").innerText()).toBe(clock);
  await goals.getByRole("button", { name: "Volver al reto" }).click();
  let attempt = "";
  for (let hole = 0; hole < 3; hole++) {
    const shot = aceShots[hole];
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    await page
      .getByRole("slider", { name: "Ángulo", exact: true })
      .fill(String(Number(shot.angle.toFixed(10))));
    await page
      .getByRole("slider", { name: "Potencia", exact: true })
      .fill(String(shot.power));
    await page.getByRole("button", { name: /GOLPEAR/ }).click();
    if (hole === 0) {
      await expect(
        page.getByRole("button", { name: /Siguiente hoyo/ }),
      ).toBeVisible({ timeout: 25000 });
      attempt = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("club-local-round")!).challenge
            .attempt,
      );
      await page.reload();
      await expect(
        page.getByRole("dialog", { name: "Preparar desafío" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: /Continuar reto guardado/ })
        .click();
      await page
        .getByRole("button", { name: "Continuar partida", exact: true })
        .click();
      await expect(page.locator(".locked-control")).toHaveCount(0);
      expect(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("club-local-round")!).challenge
              .attempt,
        ),
      ).toBe(attempt);
    }
    if (hole < 2)
      await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
  }
  const summary = page.getByRole("region", { name: "Resultado del desafío" });
  await expect(summary).toContainText("Oro · Reto completado", {
    timeout: 25000,
  });
  await expect(summary).toContainText("3 golpes");
  await expect(summary.locator('li[data-earned="true"]')).toHaveCount(3);
  await summary.getByRole("button", { name: "Copiar mi resultado" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "3 golpes",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "work/challenge-gold.png",
    animations: "disabled",
  });
  const record = await page.evaluate(
    ({ key, id }) => JSON.parse(localStorage.getItem(key)!).history[id],
    { key: CHALLENGES_KEY, id },
  );
  expect(record).toMatchObject({
    best: 3,
    medal: 3,
    rounds: 1,
    seen: [attempt],
  });
  expect(
    await page.evaluate((key) => localStorage.getItem(key), RECORDS_KEY),
  ).toBeNull();
  await page.getByRole("button", { name: /La revancha/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("club-local-round")!).challenge.attempt,
    ),
  ).not.toBe(attempt);
});
test("weekly preparation and objectives fit touch screens, while invalid links keep the catalogue usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?challenge=c1-w-2026-11-09");
  const dialog = page.getByRole("dialog", { name: "Preparar desafío" });
  await expect(dialog).toContainText("18 hoyos");
  await dialog.getByRole("button", { name: /Empezar reto individual/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page.getByRole("button", { name: "Objetivos del reto" }).click();
  await expect(page.getByRole("dialog")).toContainText("3 hoyos bajo par");
  await page.screenshot({ path: "work/challenge-mobile.png" });
  await page.getByRole("button", { name: "Cerrar desafío" }).click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page
    .getByRole("button", { name: "Salir al club", exact: true })
    .click();
  await page.goto("/?challenge=c1-d-2026-02-30");
  await expect(
    page.getByRole("dialog", { name: "Preparar desafío" }),
  ).toHaveCount(0);
  await page.locator(".club-activities > summary").click();
  await expect(
    page.getByRole("region", { name: "Retos del club" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Jugar en este/ }),
  ).toBeEnabled();
});
