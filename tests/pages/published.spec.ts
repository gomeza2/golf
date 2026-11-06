import { test, expect } from "@playwright/test";
import { aceShots } from "../fixtures/aces";
import { riftRiskShots } from "../fixtures/rift";
import { wrapAngle } from "../../shared/shot";
import { PUBLIC_SERVER_URL } from "../../src/onlineServer";
import { readFileSync } from "node:fs";
const APP_VERSION = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).version;
test("the published irregular course plays its physical bridge shortcut and saves the real score", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  await expect
    .poll(
      async () => {
        await page.goto(baseURL!);
        return page.locator(".header-right").innerText({ timeout: 15000 });
      },
      { timeout: 90000, intervals: [1000, 3000, 5000] },
    )
    .toContain(`v${APP_VERSION}`);
  await page.getByRole("button", { name: /Jugar Al Filo/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.locator(".hole-hud")).toContainText(
    "La horquilla del vértigo",
  );
  for (const [a, p] of riftRiskShots[0]) {
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
      timeout: 15000,
    });
    await page
      .getByRole("slider", { name: "Ángulo", exact: true })
      .fill(String(Number(wrapAngle(a).toFixed(10))));
    await page
      .getByRole("slider", { name: "Potencia", exact: true })
      .fill(String(p));
    await page.getByRole("button", { name: /GOLPEAR/ }).click();
    await expect(
      page.getByText("Pelota en movimiento", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Pelota en movimiento", { exact: true }),
    ).toBeHidden({ timeout: 25000 });
  }
  await expect(
    page.getByRole("button", { name: /Siguiente hoyo/ }),
  ).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("club-local-round")!).state,
  );
  expect(saved.circuit).toBe("rift");
  expect(saved.players[0].scores).toEqual([3]);
  expect(saved.players[0].penalties).toBe(0);
  await page.screenshot({ path: "work/pages-rift-shortcut.png" });
  console.log(
    `PAGES RIFT VERIFIED: version ${APP_VERSION}, real narrow bridge, three strokes and no penalties: ${baseURL}`,
  );
});
test("the released school completes a physical target with the actual published version", async ({
  page,
  baseURL,
}) => {
  if (process.env.PUBLIC_GAME_URL) test.setTimeout(180000);
  await expect
    .poll(
      async () => {
        await page.goto(baseURL!);
        return page.locator(".header-right").innerText({ timeout: 15000 });
      },
      { timeout: 90000, intervals: [1000, 3000, 5000] },
    )
    .toContain(`v${APP_VERSION}`);
  await page.getByRole("button", { name: /Aprender jugando/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill("0.145");
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(
    page.getByRole("button", { name: /Siguiente ejercicio/ }),
  ).toBeVisible({ timeout: 25000 });
  await page.screenshot({
    path: "work/pages-school.png",
    animations: "disabled",
  });
  console.log(
    `PAGES SCHOOL VERIFIED: version ${APP_VERSION}, real approach completed, optional guide and normal physics: ${baseURL}`,
  );
});
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
  await expect(page).toHaveTitle(/Hoyo en Uno/);
  await expect(page.getByRole("heading", { name: /Poco campo/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Vuelta completa/ }),
  ).toBeVisible();
  await expect(page.locator("#boot-screen")).toHaveCount(0, { timeout: 30000 });
  await page.screenshot({ path: "work/pages-catalogue-desktop.png" });
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Calidad visual", exact: true })
    .selectOption("low");
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .evaluate((c: HTMLCanvasElement) => c.width / c.clientWidth),
    )
    .toBeCloseTo(0.8, 2);
  await page.screenshot({ path: "work/pages-graphics-settings.png" });
  await page.getByRole("button", { name: "Entendido", exact: true }).click();
  if (!process.env.VITE_SERVER_URL && !PUBLIC_SERVER_URL)
    await expect(
      page.getByRole("button", { name: /Jugar online/ }),
    ).toBeDisabled();
  await page.getByRole("button", { name: /Riviera Salvaje/ }).click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Añadir jugador/ }).click();
  await page.getByRole("button", { name: /Duelo por puntos/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.locator(".hole-hud")).toContainText("DUELO POR PUNTOS");
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
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Partida local guardada" }),
  ).toContainText("Riviera Salvaje");
  await expect(
    page.getByRole("region", { name: "Partida local guardada" }),
  ).toContainText("Duelo por puntos");
  await expect(page.locator("#boot-screen")).toHaveCount(0, { timeout: 30000 });
  await page.screenshot({ path: "work/pages-recovery-mobile.png" });
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Partida en pausa" }),
  ).toBeVisible();
  await expect(page.locator(".turn-toast strong")).toHaveText("Golfista 2");
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await expect(page.locator(".leaderboard")).toContainText(
    "PUNTOS CONFIRMADOS",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-render-mode",
    "low",
  );
  const clock = await page.locator(".shot-top b").innerText();
  await page.waitForTimeout(1000);
  expect(await page.locator(".shot-top b").innerText()).toBe(clock);
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  console.log(
    "PAGES VERIFIED: HTTP 200, real points duel and visual quality, physical shot completed, points format, turn and quality recovered after reload: " +
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
    await expect(page).toHaveTitle(/Hoyo en Uno/);
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

test("the published challenge link starts its fixed Classic round and accepts a real physical ace", async ({
  page,
  baseURL,
}) => {
  await page.goto(`${baseURL!}?challenge=c1-d-2026-11-02`);
  await expect(page.locator("#boot-screen")).toHaveCount(0, { timeout: 30000 });
  const preview = page.getByRole("dialog", { name: "Preparar desafío" });
  await expect(preview).toContainText("Club del As");
  await preview
    .getByRole("button", { name: /Empezar reto individual/ })
    .click();
  await expect(page.locator(".locked-control")).toContainText("Clásico");
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page
    .getByRole("slider", { name: "Ángulo", exact: true })
    .fill(String(Number(aceShots[0].angle.toFixed(10))));
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill(String(aceShots[0].power));
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(
    page.getByRole("button", { name: /Siguiente hoyo/ }),
  ).toBeVisible({ timeout: 25000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("club-local-round")!),
  );
  expect(saved.challenge.id).toBe("c1-d-2026-11-02");
  expect(saved.state.players[0].scores).toEqual([1]);
  await page.screenshot({
    path: "work/pages-challenge.png",
    animations: "disabled",
  });
  console.log(
    `PAGES CHALLENGE VERIFIED: version ${APP_VERSION}, fixed link and real ace: ${baseURL}`,
  );
});

test("the published workshop loads its editor assets and physically holes a custom cup", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120000);
  const { newWorkshop, exportWorkshop } = await import("../../shared/workshop");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("golf-graphics-mode", "low"),
  );
  await page.goto(baseURL!);
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  const doc = newWorkshop();
  doc.name = "Taller publicado";
  doc.start = { x: 0, z: 0 };
  doc.cup = { x: 0, z: -3, height: 0 };
  await page
    .getByRole("button", { name: "Importar diseño", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "JSON del diseño", exact: true })
    .fill(exportWorkshop(doc));
  await page
    .getByRole("button", { name: "Abrir diseño importado", exact: true })
    .click();
  await page.getByRole("button", { name: "Probar en 3D", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Golpear prueba", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await page
    .getByRole("button", { name: "Inspeccionar cancha", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Golpear prueba", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Girar inspección a la derecha", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator(".workshop-test canvas")
          .getAttribute("data-look-yaw"),
      ),
    )
    .toBeGreaterThan(0.1);
  await page
    .getByRole("button", { name: "Inspeccionar cancha", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "Potencia de prueba", exact: true })
    .fill("0.145");
  await page
    .getByRole("button", { name: "Golpear prueba", exact: true })
    .click();
  await expect(
    page.getByText("Embocado en 1 golpe", { exact: true }),
  ).toBeVisible({ timeout: 25000 });
  await page.screenshot({ path: "work/pages-workshop.png" });
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Volver al diseño", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nombre del diseño", exact: true }),
  ).toHaveValue("Taller publicado");
  console.log(
    `PAGES WORKSHOP VERIFIED: version ${APP_VERSION}, editor imported a bounded document, real custom cup holed, no official record: ${baseURL}`,
  );
});

test("the published Cumbres course loads its high terrain and completes the real risky descent", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120000);
  const { adventureRiskShots } = await import("../fixtures/adventure");
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  await page.goto(baseURL!);
  await page
    .getByRole("button", { name: "Jugar Cumbres y Mareas", exact: true })
    .click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-scenery",
    "glacier",
  );
  for (const [a, p] of adventureRiskShots[0]) {
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
      timeout: 15000,
    });
    await page
      .getByRole("slider", { name: "Ángulo", exact: true })
      .fill(String(Number(wrapAngle(a).toFixed(10))));
    await page
      .getByRole("slider", { name: "Potencia", exact: true })
      .fill(String(p));
    await page.getByRole("button", { name: /GOLPEAR/ }).click();
    await expect(
      page.getByText("Pelota en movimiento", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Pelota en movimiento", { exact: true }),
    ).toBeHidden({ timeout: 25000 });
  }
  await expect(
    page.getByRole("button", { name: /Siguiente hoyo/ }),
  ).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("club-local-round")!).state,
  );
  expect(saved.circuit).toBe("cumbres");
  expect(saved.players[0].scores).toEqual([3]);
  expect(saved.players[0].penalties).toBe(0);
  await page.screenshot({ path: "work/pages-cumbres.png" });
  console.log(
    `PAGES CUMBRES VERIFIED: version ${APP_VERSION}, high terrain, three real strokes, no penalties: ${baseURL}`,
  );
});

test("the published workshop prepares a real private design and keeps its draft when returning to official play", async ({
  page,
  baseURL,
}) => {
  const { privateWorkshop } = await import("../fixtures/workshop");
  await page.addInitScript((document) => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("club-workshop-draft-v1", JSON.stringify(document));
  }, privateWorkshop());
  await page.goto(baseURL!);
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Jugar con amigos online", exact: true })
    .click();
  await expect(page.locator(".private-course-summary")).toContainText(
    "La cancha de Ana",
  );
  await expect(page.locator(".private-course-summary")).toContainText("Par 5");
  await page
    .getByRole("button", { name: "Volver al taller", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nombre del diseño", exact: true }),
  ).toHaveValue("La cancha de Ana");
  await page
    .getByRole("button", { name: "Jugar con amigos online", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Usar recorrido oficial", exact: true })
    .click();
  await expect(page.locator(".private-course-summary")).toHaveCount(0);
  await expect(page.locator(".selected-round")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("club-personal-normal-v7")),
  ).toBeNull();
  await page.screenshot({ path: "work/pages-workshop-private.png" });
  console.log(
    `PAGES PRIVATE WORKSHOP VERIFIED: version ${APP_VERSION}, bounded draft handed to online preparation and retained after return: ${baseURL}`,
  );
});
