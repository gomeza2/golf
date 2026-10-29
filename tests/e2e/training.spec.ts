import { powerSpeed } from "../../shared/power";
import { test, expect, type Page } from "@playwright/test";
import { tourShots } from "../fixtures/tour";
import { getCourse, uniqueCourses } from "../../shared/courses";
import { wrapAngle } from "../../shared/shot";
import { RECORDS_KEY } from "../../src/personalRecords";
async function fire(page: Page, angle: number, power: number) {
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
test("a real practice finish earns a separate mark, can be retried and persists after reload", async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.goto("/");
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    RECORDS_KEY,
  );
  await page.locator(".training-picker summary").click();
  await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
  await expect(page.locator(".hole-hud")).toContainText("ENTRENAMIENTO");
  let strokes = 0;
  for (const [angle, power] of tourShots[0]) {
    if (await page.locator(".practice-summary").count()) break;
    await fire(page, angle, power);
    strokes++;
  }
  for (
    let i = 0;
    i < 4 && !(await page.locator(".practice-summary").count());
    i++
  ) {
    await page.getByRole("button", { name: "Mapa", exact: true }).click();
    const ball = page.locator(".hole-map circle").last(),
      x = Number(await ball.getAttribute("cx")),
      z = Number(await ball.getAttribute("cy")),
      cup = getCourse({ circuit: "sunset", hole: 0 }).cup;
    await page
      .getByRole("button", { name: "Cerrar mapa", exact: true })
      .click();
    const distance = Math.hypot(cup.x - x, cup.z - z);
    let low = 0.03,
      high = 0.8;
    for (let n = 0; n < 16; n++) {
      const p = (low + high) / 2,
        v = powerSpeed(p),
        range =
          v / 0.38 - (0.96 / (0.38 * 0.38)) * Math.log(1 + (0.38 * v) / 0.96);
      if (range < distance) low = p;
      else high = p;
    }
    await fire(
      page,
      Math.atan2(cup.x - x, -(cup.z - z)),
      Math.max(0.03, Math.round((low + high) * 50) / 100),
    );
    strokes++;
  }
  await expect(page.locator(".practice-summary strong")).toContainText(
    `${strokes} golpes`,
  );
  await expect(page.locator(".round-report")).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), RECORDS_KEY),
  ).toBe(before);
  await expect(
    page.getByRole("columnheader", { name: "H2", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "work/training-results.png" });
  await page.getByRole("button", { name: /Repetir hoyo/ }).click();
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await page.reload();
  await page.locator(".training-picker summary").click();
  await expect(page.getByLabel("Marca de entrenamiento")).toContainText(
    `${strokes} golpes`,
  );
  await expect(page.getByLabel("Marca de entrenamiento")).toContainText(
    "1 intento completado",
  );
});
test("mobile training selects the 18th actual hole and restarts without changing its control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Vuelta completa/ }).click();
  await page
    .locator(".shot-mode-picker")
    .getByRole("button", { name: /Retroceso/ })
    .click();
  await page.locator(".training-picker summary").click();
  await page
    .getByRole("combobox", { name: "Hoyo de entrenamiento" })
    .selectOption("17");
  await page.screenshot({ path: "work/training-mobile-picker.png" });
  await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(uniqueCourses[17].name) }),
  ).toBeVisible();
  await expect(page.locator(".hole-hud h2 span")).toHaveText("18");
  await expect(page.locator(".locked-control")).toContainText("Retroceso");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page.screenshot({ path: "work/pause-mobile.png" });
  await page
    .getByRole("button", { name: "Reiniciar práctica", exact: true })
    .click();
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await expect(page.locator(".locked-control")).toContainText("Retroceso");
  await expect(
    page.getByRole("heading", { name: new RegExp(uniqueCourses[17].name) }),
  ).toBeVisible();
});
test("local pause, inspection, settings and background keep the clock and moving ball frozen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Partida en pausa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuar partida", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Salir al club", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Continuar partida", exact: true }),
  ).toBeFocused();
  const timer = await page.locator(".shot-top b").innerText();
  await page.waitForTimeout(1200);
  expect(await page.locator(".shot-top b").innerText()).toBe(timer);
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Partida en pausa" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Mirar", exact: true }).click();
  await expect(page.locator(".camera-dock")).toContainText("PAUSA LOCAL");
  const inspecting = await page.locator(".shot-top b").innerText();
  await page.waitForTimeout(1200);
  expect(await page.locator(".shot-top b").innerText()).toBe(inspecting);
  await page
    .getByRole("button", { name: "Volver a apuntar", exact: true })
    .click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeDisabled();
  const background = await page.locator(".shot-top b").innerText();
  await page.waitForTimeout(1000);
  expect(await page.locator(".shot-top b").innerText()).toBe(background);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Partida en pausa" }),
  ).toBeVisible();
  const ball = page.locator(".hole-map circle").last();
  const position = async () => [
    await ball.getAttribute("cx"),
    await ball.getAttribute("cy"),
  ];
  const frozen = await position();
  await page.waitForTimeout(1000);
  expect(await position()).toEqual(frozen);
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect.poll(position).not.toEqual(frozen);
  await page.getByRole("button", { name: "Controles", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ajustes" })).toBeVisible();
  const settings = await position();
  await page.waitForTimeout(800);
  expect(await position()).toEqual(settings);
  await page.getByRole("button", { name: "Entendido", exact: true }).click();
  await expect.poll(position).not.toEqual(settings);
});
