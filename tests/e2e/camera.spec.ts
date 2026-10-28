import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`${mobile ? "touch" : "desktop"} inspection moves the camera without aiming or spending a stroke`, async ({
    page,
    context,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    if (mobile)
      await page
        .locator(".shot-mode-picker")
        .getByRole("button", { name: /Retroceso/ })
        .click();
    await page.getByRole("button", { name: /Jugar en este/ }).click();
    await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
    if (!mobile)
      await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    else await expect(page.locator(".turn-intro")).toHaveCount(0);
    const angle = await page.locator('input[aria-label="Ángulo"]').inputValue();
    const power = await page
      .locator('input[aria-label="Potencia"]')
      .inputValue();
    await page.getByRole("button", { name: "Mirar", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Explorar cámara" }),
    ).toBeVisible();
    await expect(page.locator(".shot-panel")).toBeHidden();
    await page
      .getByRole("button", { name: "Girar cámara a la izquierda", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Subir cámara", exact: true })
      .click();
    const canvas = page.locator("canvas").first();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-look-yaw")))
      .toBeLessThan(-0.2);
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-look-pitch")))
      .toBeGreaterThan(0.1);
    if (mobile) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 240, y: 340, id: 7 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 290, y: 380, id: 7 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await cdp.detach();
    } else {
      await page.mouse.move(640, 300);
      await page.mouse.down();
      await page.mouse.move(700, 350, { steps: 8 });
      await page.mouse.up();
    }
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-look-yaw")))
      .toBeLessThan(-0.4);
    await page.keyboard.press("Space");
    await expect(page.locator(".turn-toast b")).toHaveText("0/12");
    await expect(page.locator('input[aria-label="Ángulo"]')).toHaveValue(angle);
    await expect(page.locator('input[aria-label="Potencia"]')).toHaveValue(
      power,
    );
    await page.screenshot({
      path: `work/inspect-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page
      .getByRole("button", { name: "Volver a apuntar", exact: true })
      .click();
    await expect(page.locator(".camera-dock")).toHaveCount(0);
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-look-yaw")))
      .toBe(0);
    await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  });
