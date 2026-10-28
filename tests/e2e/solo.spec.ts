import { test, expect } from "@playwright/test";
import { tourShots } from "../fixtures/tour";
import { getCourse } from "../../shared/courses";
import { wrapAngle } from "../../shared/shot";
test("solo round keeps normal control locked, records a real finish and persists the best score", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto("/");
  await expect(
    page.locator(".shot-mode-picker").getByRole("button", { name: /Clásico/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Jugador 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Jugador 2", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  let strokes = 0;
  for (let hole = 0; hole < 3; hole++) {
    for (let i = 0; i < tourShots[hole].length; i++) {
      const [angle, power] = tourShots[hole][i];
      await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
      await expect(
        page.getByRole("combobox", { name: "Control del tiro" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Elevado", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("slider", { name: "Ángulo", exact: true })
        .fill(String(Number(wrapAngle(angle).toFixed(10))));
      await page
        .getByRole("slider", { name: "Potencia", exact: true })
        .fill(String(power));
      if (hole === 2 && i === tourShots[hole].length - 1)
        await page.screenshot({ path: "work/cup-approach.png" });
      await page.getByRole("button", { name: /GOLPEAR/ }).click();
      strokes++;
      await expect(page.getByText("Pelota en movimiento")).toBeVisible();
      await expect
        .poll(
          async () =>
            !(await page.getByText("Pelota en movimiento").isVisible()) &&
            ((await page.getByRole("button", { name: /GOLPEAR/ }).count()) ===
              0 ||
              (await page
                .getByRole("button", { name: /GOLPEAR/ })
                .isEnabled())),
          { timeout: 25000 },
        )
        .toBe(true);
      if ((await page.getByRole("button", { name: /GOLPEAR/ }).count()) === 0)
        break;
    }
    // Observe the real minimap for any final correction: moving obstacles use live time.
    for (
      let correction = 0;
      correction < 7 &&
      (await page.getByRole("button", { name: /GOLPEAR/ }).count()) > 0;
      correction++
    ) {
      await page.getByRole("button", { name: "Mapa", exact: true }).click();
      const ball = page.locator(".hole-map svg circle").last();
      const x = Number(await ball.getAttribute("cx")),
        z = Number(await ball.getAttribute("cy")),
        cup = getCourse({ circuit: "sunset", hole }).cup;
      await page
        .getByRole("button", { name: "Cerrar mapa", exact: true })
        .click();
      const distance = Math.hypot(cup.x - x, cup.z - z);
      let low = 0.03,
        high = 1;
      for (let n = 0; n < 16; n++) {
        const p = (low + high) / 2,
          v = 14 * p,
          range =
            v / 0.38 - (0.96 / (0.38 * 0.38)) * Math.log(1 + (0.38 * v) / 0.96);
        if (range < distance) low = p;
        else high = p;
      }
      await page
        .getByRole("slider", { name: "Ángulo", exact: true })
        .fill(String(Number(Math.atan2(cup.x - x, -(cup.z - z)).toFixed(10))));
      await page
        .getByRole("slider", { name: "Potencia", exact: true })
        .fill(String(Math.max(0.03, Math.round((low + high) * 50) / 100)));
      await page.getByRole("button", { name: /GOLPEAR/ }).click();
      strokes++;
      await expect(page.getByText("Pelota en movimiento")).toBeVisible();
      await expect
        .poll(
          async () =>
            !(await page.getByText("Pelota en movimiento").isVisible()) &&
            ((await page.getByRole("button", { name: /GOLPEAR/ }).count()) ===
              0 ||
              (await page
                .getByRole("button", { name: /GOLPEAR/ })
                .isEnabled())),
          { timeout: 25000 },
        )
        .toBe(true);
    }
    if (hole < 2) {
      await expect(
        page.getByRole("button", { name: /Siguiente hoyo/ }),
      ).toBeVisible({ timeout: 25000 });
      await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
    }
  }

  await expect(
    page.getByText(`Nuevo récord personal: ${strokes} golpes`),
  ).toBeVisible({ timeout: 25000 });
  await page.screenshot({ path: "work/solo-results.png" });
  await page.reload();
  await expect(
    page
      .getByRole("complementary")
      .filter({ has: page.locator(".personal-record") }),
  ).toBeVisible();
  await expect(page.locator(".personal-record")).toContainText(
    `${strokes} golpes`,
  );
  await expect(page.locator(".personal-record")).toContainText(
    "1 rondas válidas",
  );
});
test("a chosen control preference survives reload but has no switch during play", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".shot-mode-picker")
    .getByRole("button", { name: /Retroceso/ })
    .click();
  await page.reload();
  await expect(
    page
      .locator(".shot-mode-picker")
      .getByRole("button", { name: /Retroceso/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.locator(".locked-control")).toContainText("Retroceso");
  await page.getByRole("button", { name: "Controles", exact: true }).click();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.locator(".shot-mode-picker")).toHaveCount(0);
});
test("mobile controls leave the field visible, turn stays on the side and chosen names persist", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page
    .getByRole("textbox", { name: "Jugador 1", exact: true })
    .fill("Lucía");
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await expect(page.locator(".turn-toast")).toContainText("Lucía");
  const desk = await page.locator(".shot-panel").boundingBox(),
    turn = await page.locator(".turn-toast").boundingBox();
  expect(desk!.height).toBeLessThan(170);
  expect(turn!.x).toBeLessThan(20);
  expect(turn!.width).toBeLessThan(180);
  await expect(
    page.getByRole("button", { name: "Girar medio grado a la derecha" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Más ajustes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Girar medio grado a la derecha" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Menos ajustes", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Jugador 1", exact: true }),
  ).toHaveValue("Lucía");
});
