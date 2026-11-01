import { test, expect } from "@playwright/test";
import { overviewFrame } from "../../src/camera";
test("a long actual course fits the real WebGL frame after resizing between portrait, landscape and desktop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Desafío Maestro/ }).click();
  await page.locator(".training-picker summary").click();
  await page
    .getByRole("combobox", { name: "Hoyo de entrenamiento" })
    .selectOption("4");
  await page.getByRole("button", { name: /Practicar este hoyo/ }).click();
  await page.getByRole("button", { name: "Ver campo", exact: true }).click();
  for (const [w, h, label] of [
    [390, 844, "portrait"],
    [844, 390, "landscape"],
    [1280, 720, "desktop"],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    const frame = overviewFrame(w, h),
      left = (w - frame.width) / 2 - frame.offsetX,
      top = (h - frame.height) / 2 - frame.offsetY;
    await expect
      .poll(
        async () => {
          const text = await page
            .locator("canvas")
            .getAttribute("data-field-rect");
          if (!text) return false;
          const r = JSON.parse(text);
          return (
            r.left >= left - 2 &&
            r.right <= left + frame.width + 2 &&
            r.top >= top - 2 &&
            r.bottom <= top + frame.height + 2
          );
        },
        { timeout: 15000 },
      )
      .toBe(true);
    await page.screenshot({ path: `work/framing-${label}.png` });
    await expect(
      page.getByRole("button", { name: "Seguir pelota", exact: true }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("local hole preview freezes the clock, can be skipped without a stroke, and its preference survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(
    page.getByRole("complementary", { name: "Vista inicial del hoyo" }),
  ).toBeVisible();
  const clock = await page.locator(".shot-top b").innerText();
  await page.waitForTimeout(700);
  expect(await page.locator(".shot-top b").innerText()).toBe(clock);
  await page.keyboard.press("Space");
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await page.getByRole("button", { name: /Omitir vista/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-mode",
    "follow",
  );
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page
    .getByRole("button", { name: "Sonido y controles", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Vista inicial/ }).uncheck();
  await page.reload();
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Vista inicial/ }),
  ).not.toBeChecked();
});
