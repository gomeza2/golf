import { pulseShot } from "../../src/shotControls";
import { test, expect, type Page } from "@playwright/test";
async function start(
  page: Page,
  mode: "Retroceso" | "Precisión",
  expanded = true,
) {
  await page.goto("/");
  await page.getByRole("button", { name: /Club del atardecer/ }).click();
  await page
    .locator(".shot-mode-picker")
    .getByRole("button", { name: new RegExp(mode) })
    .click();
  await page.getByRole("button", { name: /Aprender jugando/ }).click();
  if (expanded) {
    await page
      .getByRole("button", { name: "Más ajustes", exact: true })
      .click();
    await expect(
      page.getByRole("slider", { name: "Ángulo", exact: true }),
    ).toBeEnabled();
  }
}
test("pull distinguishes the cancellation zone, restores the reference and performs a real fine putt", async ({
  page,
}) => {
  await start(page, "Retroceso");
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill("0.55");
  await page.mouse.move(640, 290);
  await page.mouse.down();
  await page.mouse.move(640, 390, { steps: 5 });
  await expect(page.getByText(/SUELTA PARA TIRAR/)).toBeVisible();
  await page.mouse.move(642, 292, { steps: 3 });
  await expect(
    page.getByText("SUELTA PARA CANCELAR", { exact: true }),
  ).toBeVisible();
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await page.getByRole("button", { name: "Más ajustes", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Potencia", exact: true }),
  ).toHaveValue("0.55");
  await page.getByRole("button", { name: /Arrastre fino/ }).click();
  await expect(
    page.getByRole("button", { name: /Arrastre fino/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(640, 290);
  await page.mouse.down();
  await page.mouse.move(640, 303, { steps: 3 });
  await expect(
    page.getByRole("button", { name: /Arrastre fino/ }),
  ).toBeDisabled();
  await page.screenshot({
    path: "work/controls-fine-pull.png",
    animations: "disabled",
  });
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
  const review = page.getByRole("status", {
    name: "Lectura del último golpe",
    exact: true,
  });
  await expect(review).toHaveAttribute("data-power", "0.03");
  await expect(review).toContainText("Ref. 35%");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("club-local-round")!).state.players[0]
            .pos.z,
      ),
    )
    .toBeLessThan(9);
  await expect(page.getByRole("button", { name: /Arrastre fino/ })).toBeEnabled(
    { timeout: 25000 },
  );
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await page.keyboard.press(" ");
  await expect(page.locator(".turn-toast b")).toHaveText("2/12");
  await expect(review).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reintentar desde la salida", exact: true })
    .click();
  await expect(review).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Arrastre fino/ }),
  ).toHaveAttribute("aria-pressed", "false");
});
test("precision exposes live angular drift and records one measured release without replacing its reference", async ({
  page,
}) => {
  await start(page, "Precisión");
  await page.getByRole("slider", { name: "Potencia", exact: true }).fill("1");
  expect(
    await page
      .locator(".charge-track.pulse i")
      .evaluate((el) => [
        (el as HTMLElement).style.left,
        (el as HTMLElement).style.width,
      ]),
  ).toEqual(["97.5%", "2.5%"]);
  await page.getByRole("slider", { name: "Potencia", exact: true }).fill("0.5");
  expect(
    await page
      .locator(".charge-track.pulse i")
      .evaluate((el) => [
        (el as HTMLElement).style.left,
        (el as HTMLElement).style.width,
      ]),
  ).toEqual(["47.5%", "5%"]);
  const trigger = page.getByRole("button", {
    name: "MANTENER Y SOLTAR",
    exact: true,
  });
  await trigger.evaluate((el) => {
    el.addEventListener("pointerdown", (e) =>
      el.setAttribute("data-start", String(e.timeStamp)),
    );
    el.addEventListener("pointerup", (e) =>
      el.setAttribute("data-end", String(e.timeStamp)),
    );
  });
  await trigger.hover();
  await page.mouse.down();
  await expect(
    page.getByRole("img", { name: "Oscilación de dirección", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".control-feedback")).toContainText(
    "Referencia 50%",
  );
  await page.waitForTimeout(420);
  await page.screenshot({
    path: "work/controls-precision-live.png",
    animations: "disabled",
  });
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
  const review = page.getByRole("status", {
    name: "Lectura del último golpe",
    exact: true,
  });
  await expect(review).toHaveAttribute("data-reference-power", "0.5");
  await expect(page.locator('input[aria-label="Potencia"]')).toHaveValue("0.5");
  await expect(page.locator('input[aria-label="Ángulo"]')).toHaveValue("0");
  await expect(
    page.getByRole("button", { name: "Más ajustes", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(
    Math.abs(Number(await review.getAttribute("data-drift-degrees"))),
  ).toBeLessThanOrEqual(6.88);
  expect(
    Number(await review.getAttribute("data-power")),
  ).toBeGreaterThanOrEqual(0.04);
  const elapsed = await page
    .locator(".pulse-trigger")
    .evaluate(
      (el) =>
        Number(el.getAttribute("data-end")) -
        Number(el.getAttribute("data-start")),
    );
  expect(Number(await review.getAttribute("data-power"))).toBeCloseTo(
    pulseShot(elapsed, 0).power,
    8,
  );
  await page.screenshot({
    path: "work/controls-precision-review.png",
    animations: "disabled",
  });
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
});
test("losing native pointer capture cancels precision and restores angle and power", async ({
  page,
}) => {
  await start(page, "Precisión");
  await page.getByRole("slider", { name: "Potencia", exact: true }).fill("0.4");
  const trigger = page.getByRole("button", {
    name: "MANTENER Y SOLTAR",
    exact: true,
  });
  await trigger.evaluate((el) =>
    el.addEventListener(
      "pointerdown",
      (e) =>
        el.setAttribute(
          "data-test-pointer",
          String((e as PointerEvent).pointerId),
        ),
      { once: true },
    ),
  );
  await trigger.hover();
  await page.mouse.down();
  await page.waitForTimeout(250);
  const active = page.getByRole("button", {
    name: "SUELTA EN TU PUNTO",
    exact: true,
  });
  await active.evaluate((el) =>
    el.releasePointerCapture(Number(el.getAttribute("data-test-pointer"))),
  );
  await page.mouse.move(641, 300);
  await page.mouse.up();
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await page.getByRole("button", { name: "Más ajustes", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Potencia", exact: true }),
  ).toHaveValue("0.4");
  await expect(
    page.getByRole("slider", { name: "Ángulo", exact: true }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("status", { name: "Lectura del último golpe", exact: true }),
  ).toHaveCount(0);
});
test("touch fine pulling performs a short putt with a compact readable panel", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await start(page, "Retroceso", false);
    await page.getByRole("button", { name: /Arrastre fino/ }).tap();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 350, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 363, id: 1 }],
    });
    await page.screenshot({
      path: "work/controls-fine-mobile.png",
      animations: "disabled",
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".turn-toast b")).toHaveText("1/12");
    await expect(
      page.getByRole("status", {
        name: "Lectura del último golpe",
        exact: true,
      }),
    ).toHaveAttribute("data-power", "0.03");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await cdp.detach();
  } finally {
    await context.close();
  }
});
test("precision keeps its reference with real touch and keyboard releases on mobile", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await start(page, "Precisión", false);
    const trigger = page.getByRole("button", {
      name: "MANTENER Y SOLTAR",
      exact: true,
    });
    await expect(trigger).toBeEnabled();
    const box = (await trigger.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 },
      ],
    });
    await expect(
      page.getByRole("img", { name: "Oscilación de dirección", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "work/controls-precision-mobile.png",
      animations: "disabled",
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".turn-toast b")).toHaveText("1/12");
    await expect(
      page.getByRole("dialog", { name: "Partida en pausa", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Pausar", exact: true }).tap();
    await expect(
      page.getByRole("dialog", { name: "Partida en pausa", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Continuar partida", exact: true })
      .tap();
    await expect(page.locator('input[aria-label="Potencia"]')).toHaveValue(
      "0.16",
    );
    await page
      .getByRole("button", { name: "Reintentar desde la salida", exact: true })
      .tap();
    await expect(trigger).toBeEnabled();
    await trigger.focus();
    await page.keyboard.down(" ");
    await expect(
      page.getByRole("img", { name: "Oscilación de dirección", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(300);
    await page.keyboard.up(" ");
    await expect(page.locator(".turn-toast b")).toHaveText("1/12");
    await expect(page.locator('input[aria-label="Potencia"]')).toHaveValue(
      "0.16",
    );
    await expect(page.locator('input[aria-label="Ángulo"]')).toHaveValue("0");
    await cdp.detach();
  } finally {
    await context.close();
  }
});

test("landscape advanced controls leave the ball lane clear and school actions accessible", async ({
  browser,
}) => {
  for (const [width, height] of [
    [844, 390],
    [667, 375],
  ]) {
    for (const mode of ["Precisión", "Retroceso"] as const) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      try {
        await start(page, mode, false);
        const panel = page.locator(".shot-panel"),
          coach = page.locator(".school-coach");
        await expect(coach).toBeVisible();
        await page
          .getByRole("button", { name: "Más ajustes", exact: true })
          .click();
        const power = page.getByRole("slider", {
          name: "Potencia",
          exact: true,
        });
        await power.scrollIntoViewIfNeeded();
        await expect(power).toBeInViewport();
        await page
          .getByRole("button", { name: "Menos ajustes", exact: true })
          .click();
        if (mode === "Precisión") {
          await page
            .getByRole("button", { name: "MANTENER Y SOLTAR", exact: true })
            .hover();
          await page.mouse.down();
          await expect(
            page.getByRole("img", {
              name: "Oscilación de dirección",
              exact: true,
            }),
          ).toBeVisible();
        } else {
          await page.getByRole("button", { name: /Arrastre fino/ }).click();
          await page.mouse.move(width / 2, height * 0.4);
          await page.mouse.down();
          await page.mouse.move(width / 2, height * 0.4 + 20);
          await expect(page.getByText(/SUELTA PARA TIRAR/)).toBeVisible();
        }
        const desk = (await panel.boundingBox())!,
          guide = (await coach.boundingBox())!;
        expect(desk.x + desk.width).toBeLessThan(width / 2 - 16);
        expect(guide.x).toBeGreaterThan(width / 2 + 16);
        expect(guide.y + guide.height).toBeLessThanOrEqual(height - 8);
        expect(desk.y).toBeGreaterThan(185);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await page.screenshot({
          path: `work/controls-landscape-${mode}-${width}.png`,
          animations: "disabled",
        });
        await page.keyboard.press("Escape");
        await page.mouse.up();
        await expect(page.locator(".turn-toast b")).toHaveText("0/12");
        const close = page.getByRole("button", {
          name: "Cerrar guía y seguir practicando",
          exact: true,
        });
        await expect(close).toBeInViewport();
        await close.click();
        await expect(coach).toHaveCount(0);
      } finally {
        await context.close();
      }
    }
  }
});
