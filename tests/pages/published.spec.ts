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
  await expect(page).toHaveTitle(/Club del Último Golpe/);
  await expect(page.getByRole("heading", { name: /Poco campo/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Vuelta completa/ }),
  ).toBeVisible();
  await expect(page.locator("#boot-screen")).toHaveCount(0, { timeout: 30000 });
  await page.screenshot({ path: "work/pages-catalogue-desktop.png" });
  if (!process.env.VITE_SERVER_URL)
    await expect(
      page.getByRole("button", { name: /Jugar online/ }),
    ).toBeDisabled();
  await page.getByRole("button", { name: /Riviera Salvaje/ }).click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Añadir jugador/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(
    page.getByRole("heading", { name: /Las dos orillas/ }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Potencia", exact: true }).fill("0.4");
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(page.getByText("Pelota en movimiento")).toBeVisible();
  await expect(page.locator(".turn-toast strong")).toHaveText("Golfista 2", {
    timeout: 35000,
  });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-focus-player",
    "1",
  );
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Mapa de Las dos orillas/ }),
  ).toHaveAttribute("viewBox", "-11 -25 22 50");
  await page.getByRole("button", { name: "Cerrar mapa", exact: true }).click();
  await page.getByRole("button", { name: "Ver campo", exact: true }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: "work/pages-riviera-overview.png" });
  await page
    .getByRole("button", { name: "Seguir pelota", exact: true })
    .click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: "work/pages-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeInViewport();
  await page.screenshot({ path: "work/pages-mobile.png" });
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Poco campo/ })).toBeVisible();
  await page.screenshot({ path: "work/pages-catalogue-mobile.png" });
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  console.log(
    "PAGES VERIFIED: HTTP 200, all assets loaded, WebGL scene rendered, physical shot completed, next local turn available: " +
      baseURL,
  );
});

test("the loading bar waits for real bytes and only disappears after physics and graphics are ready", async ({
  page,
  baseURL,
}) => {
  test.skip(
    Boolean(process.env.PUBLIC_GAME_URL),
    "Network throttling belongs to the local production build test.",
  );
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/physics-*.js", async (route) => {
    await blocked;
    await route.continue();
  });
  try {
    await page.goto(baseURL!, { waitUntil: "domcontentloaded" });
    const progress = page.getByRole("progressbar", { name: "Carga del club" });
    await expect(progress).toBeVisible();
    await expect
      .poll(async () => Number(await progress.getAttribute("aria-valuenow")))
      .toBeGreaterThan(0);
    expect(Number(await progress.getAttribute("aria-valuenow"))).toBeLessThan(
      90,
    );
    await page.screenshot({ path: "work/loading-progress.png" });
    release();
    await expect(page.locator("#boot-screen")).toHaveCount(0, {
      timeout: 30000,
    });
    await expect(
      page.getByRole("button", { name: /Jugar en este/ }),
    ).toBeEnabled();
    await expect(page).toHaveTitle(/Club del Último Golpe/);
  } finally {
    release();
  }
});
test("an interrupted download offers a retry instead of staying blank", async ({
  page,
  baseURL,
}) => {
  test.skip(
    Boolean(process.env.PUBLIC_GAME_URL),
    "Inject failures only against the local production build.",
  );
  await page.route("**/assets/physics-*.js", (route) => route.abort("failed"));
  await page.goto(baseURL!, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("La carga se interrumpió")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reintentar carga" }),
  ).toBeVisible();
});

test("even a blocked entry script leaves a visible recovery action", async ({
  page,
  baseURL,
}) => {
  test.skip(
    Boolean(process.env.PUBLIC_GAME_URL),
    "Inject failures only against the local production build.",
  );
  await page.route("**/assets/index-*.js", (route) => route.abort("failed"));
  await page.goto(baseURL!, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("No pudimos iniciar la descarga")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reintentar carga" }),
  ).toBeVisible();
  await page.unroute("**/assets/index-*.js");
  await page.getByRole("button", { name: "Reintentar carga" }).click();
  await expect(page.locator("#boot-screen")).toHaveCount(0, { timeout: 30000 });
  await expect(
    page.getByRole("button", { name: /Jugar en este/ }),
  ).toBeEnabled();
});
