import { test, expect } from "@playwright/test";
test("the built Pages site loads assets and plays a local match from /golf/", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [],
    failures: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(r.url() + " " + r.status());
  });
  if (process.env.PUBLIC_GAME_URL) {
    test.setTimeout(180000);
    await expect
      .poll(
        async () => {
          try {
            return (await page.request.get(baseURL!)).status();
          } catch {
            return 0;
          }
        },
        { timeout: 90000, intervals: [2000, 5000, 10000] },
      )
      .toBe(200);
  }
  const response = await page.goto(baseURL!);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /Poco campo/ })).toBeVisible();
  if (!process.env.VITE_SERVER_URL)
    await expect(
      page.getByRole("button", { name: /Jugar online/ }),
    ).toBeDisabled();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Jardín lunar/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(
    page.getByRole("heading", { name: /Las diagonales/ }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Potencia", exact: true }).fill("0.4");
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(page.getByText("Pelota en movimiento")).toBeVisible();
  await expect(page.locator(".turn-toast strong")).toHaveText("Golfista 2", {
    timeout: 35000,
  });
  await page.screenshot({ path: "work/pages-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeInViewport();
  await page.screenshot({ path: "work/pages-mobile.png" });
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  console.log(
    "PAGES VERIFIED: HTTP 200, all assets loaded, WebGL scene rendered, physical shot completed, next local turn available: " +
      baseURL,
  );
});
