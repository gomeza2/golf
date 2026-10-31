import { test, expect, type Page } from "@playwright/test";
import { LOCAL_ROUND_KEY } from "../../src/localRound";
import { PRACTICE_KEY } from "../../src/practiceRecords";
import { aceShots } from "../fixtures/aces";
async function stored(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "null"),
    LOCAL_ROUND_KEY,
  );
}
async function fire(page: Page, angle: number, power: number) {
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page
    .getByRole("slider", { name: "Ángulo", exact: true })
    .fill(String(Number(angle.toFixed(10))));
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill(String(power));
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
}
test("reload mid-shot preserves the lie, shot, names, aim and remaining turn, and recovery waits in pause", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page
    .getByRole("textbox", { name: "Jugador 1", exact: true })
    .fill("Ana");
  await page.getByRole("button", { name: /Añadir jugador/ }).click();
  await page
    .getByRole("textbox", { name: "Jugador 2", exact: true })
    .fill("Luis");
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await fire(page, 0.4, 0.7);
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const saved = page.getByRole("region", { name: "Partida local guardada" });
  await expect(saved).toContainText("Ana · Luis");
  await expect(saved).toContainText("Clásico");
  const checkpoint = await stored(page);
  expect(checkpoint.state.moving).toBe(true);
  expect(checkpoint.state.players[0].strokes).toBe(1);
  expect(checkpoint.aim).toEqual({ angle: 0.4, power: 0.7 });
  await page.screenshot({ path: "work/recovery-desktop.png" });
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Partida en pausa" }),
  ).toBeVisible();
  const clock = await page.locator(".shot-top b").innerText();
  await page.waitForTimeout(1200);
  expect(await page.locator(".shot-top b").innerText()).toBe(clock);
  expect((await stored(page)).state.time).toBe(checkpoint.state.time);
  await expect(page.locator(".turn-toast")).toContainText("Ana");
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect(page.locator(".turn-toast strong")).toHaveText("Luis", {
    timeout: 25000,
  });
  expect((await stored(page)).state.players[0].strokes).toBe(1);
  expect((await stored(page)).state.players[1].strokes).toBe(0);
});
test("mobile saves on leaving, keeps the locked control and lets a new round replace the save", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Vuelta completa/ }).click();
  await page
    .locator(".shot-mode-picker")
    .getByRole("button", { name: /Precisión/ })
    .click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(
    page.getByRole("button", { name: "MANTENER Y SOLTAR" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Guardado automático activo",
  );
  await page
    .getByRole("button", { name: "Salir al club", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Partida local guardada" }),
  ).toContainText("Hoyo 1/18 · Precisión");
  await page
    .locator(".shot-mode-picker")
    .getByRole("button", { name: /Clásico/ })
    .click();
  await page.screenshot({ path: "work/recovery-mobile.png" });
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await expect(page.locator(".locked-control")).toContainText("Precisión");
  await page
    .getByRole("button", { name: "Salir al club", exact: true })
    .click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await expect(page.getByText(/Comenzar sustituirá/)).toBeVisible();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.locator(".locked-control")).toContainText("Clásico");
  expect((await stored(page)).control).toBe("classic");
});
test("the actual between-hole result survives reload and advances to the right next hole", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Club del As/ }).click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await fire(page, aceShots[0].angle, aceShots[0].power);
  await expect(
    page.getByRole("button", { name: /Siguiente hoyo/ }),
  ).toBeVisible({ timeout: 25000 });
  await page.reload();
  const checkpoint = await stored(page);
  expect(checkpoint.state.phase).toBe("scores");
  expect(checkpoint.state.players[0].scores).toEqual([1]);
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect(
    page.getByRole("columnheader", { name: "H1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
  await expect(
    page.getByRole("heading", { name: /La firma de la banda/ }),
  ).toBeVisible();
  expect((await stored(page)).state.players[0].scores).toEqual([1]);
  await fire(page, aceShots[1].angle, aceShots[1].power);
  await expect(
    page.getByRole("button", { name: /Siguiente hoyo/ }),
  ).toBeVisible({ timeout: 25000 });
  expect((await stored(page)).state.players[0].scores).toEqual([1, 1]);
});
test("an interrupted practice finishes once, clears recovery and preserves its mark after another reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Club del As/ }).click();
  await page.locator(".training-picker summary").click();
  await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
  await fire(page, aceShots[0].angle, aceShots[0].power);
  await page.reload();
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect(page.locator(".practice-summary strong")).toContainText(
    "Oro · 1 golpe",
    { timeout: 25000 },
  );
  await expect.poll(() => stored(page)).toBeNull();
  const mark = await page.evaluate(
    (key) => localStorage.getItem(key),
    PRACTICE_KEY,
  );
  expect(mark).not.toBeNull();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reanudar partida", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), PRACTICE_KEY),
  ).toBe(mark);
});
test("a corrupt save can be discarded without removing preferences, and unavailable storage does not block play", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => {
    localStorage.setItem(key, "{broken");
    localStorage.setItem("golf-control-mode", "pull");
  }, LOCAL_ROUND_KEY);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Recuperación local" }),
  ).toContainText("no se puede recuperar");
  await page
    .getByRole("button", { name: "Descartar guardado", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Recuperación local" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("golf-control-mode")),
  ).toBe("pull");
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota full", "QuotaExceededError");
    };
  });
  await page.reload();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.locator(".locked-control")).toContainText("Retroceso");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "El navegador no permitió guardar",
  );
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect(page.locator(".pull-instruction strong")).toHaveText(
    "TIRA HACIA ATRÁS",
  );
  await page.mouse.move(640, 290);
  await page.mouse.down();
  await page.mouse.move(640, 400, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
});
