import { test, expect } from "@playwright/test";
import { newWorkshop } from "../../shared/workshop";
import { safeClock } from "../fixtures/blueprints";

test("advanced resources are explicit, undoable and retain their format through export and reload on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  const activate = page.getByRole("button", {
    name: "Activar recursos avanzados",
    exact: true,
  });
  await expect(
    page.getByRole("button", { name: "Barra giratoria", exact: true }),
  ).toHaveCount(0);
  await activate.click();
  await page
    .getByRole("button", { name: "Conservar física", exact: true })
    .click();
  await expect(activate).toBeVisible();
  await activate.click();
  await page
    .getByRole("button", { name: "Activar recursos", exact: true })
    .click();
  for (const name of ["Barra giratoria", "Puerta elevable", "Tierra"])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(activate).toBeVisible();
  await page.getByRole("button", { name: "Rehacer", exact: true }).click();
  const draft = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("club-workshop-draft-v1")!),
    );
  await expect.poll(draft).toMatchObject({ version: 3, physics: 2 });
  for (const [name, z] of [
    ["Barra giratoria", 2],
    ["Puerta elevable", -3],
    ["Tierra", 5],
  ] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    const map = page.getByRole("img", {
      name: "Plano editable de la cancha",
      exact: true,
    });
    await map.scrollIntoViewIfNeeded();
    const point = await map.evaluate((node: SVGSVGElement, z) => {
      const p = node.createSVGPoint();
      p.x = 0;
      p.y = z;
      const q = p.matrixTransform(node.getScreenCTM()!);
      return { x: q.x, y: q.y };
    }, z);
    await page.mouse.click(point.x, point.y);
    await expect(page.locator(".workshop-properties h2").first()).toHaveText(
      name,
    );
  }
  await expect(
    page.locator('.workshop-physics option[value="1"]'),
  ).toHaveAttribute("disabled", "");
  await expect
    .poll(async () => (await draft()).pieces.slice(1).map((p: any) => p.kind))
    .toEqual(["rotor", "lift", "dirt"]);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar archivo", exact: true }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString())).toMatchObject({
    version: 3,
    physics: 2,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tierra", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/workshop-resources-mobile.png",
    fullPage: true,
  });
});

test("opening an editable blueprint backs up the actual draft and a full library blocks replacement", async ({
  page,
}) => {
  const previous = { ...newWorkshop(), name: "Mi diseño sin terminar" };
  await page.addInitScript(
    (doc) =>
      localStorage.setItem("club-workshop-draft-v1", JSON.stringify(doc)),
    previous,
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await page.getByRole("button", { name: /El pulso del puente/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Nombre del diseño", exact: true }),
  ).toHaveValue("El pulso del puente");
  const backup = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("club-workshop-library-v1")!),
  );
  expect(backup).toHaveLength(1);
  expect(backup[0].doc).toEqual(previous);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Nombre del diseño", exact: true }),
  ).toHaveValue(previous.name);
  // This is saved input, not an injected game state: exhaust the library's documented capacity.
  await page.evaluate((doc) => {
    localStorage.setItem(
      "club-workshop-library-v1",
      JSON.stringify(
        Array.from({ length: 12 }, (_, i) => ({
          id: `saved-${i}`,
          updated: "2026-11-08T00:00:00Z",
          doc: { ...doc, name: `Guardado ${i}` },
        })),
      ),
    );
  }, previous);
  // Reload without the init script resetting the draft; current draft remains unchanged.
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await page.getByRole("button", { name: /La esclusa de tierra/ }).click();
  await expect(page.locator(".workshop-status")).toContainText(
    "No se reemplazó el borrador",
  );
  await expect(
    page.getByRole("textbox", { name: "Nombre del diseño", exact: true }),
  ).toHaveValue(previous.name);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("club-workshop-library-v1")!).length,
    ),
  ).toBe(12);
});

test("the bridge blueprint plays its entire four-stroke safe route and its map tracks the real rotor", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("golf-graphics-mode", "low"),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await page.getByRole("button", { name: /El pulso del puente/ }).click();
  await page.screenshot({
    path: "work/workshop-resources-blueprint.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Probar en 3D", exact: true }).click();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  const rotor = page.locator('.hole-map [aria-label="Barra giratoria"]');
  await expect(rotor).toBeVisible();
  const pose = await rotor.getAttribute("transform");
  await expect.poll(() => rotor.getAttribute("transform")).not.toBe(pose);
  const mapWithinField = async () => {
    const map = await page
        .locator(".workshop-live-map .hole-map")
        .boundingBox(),
      top = await page.locator(".workshop-test-top").boundingBox(),
      panel = await page.locator(".workshop-test-controls").boundingBox();
    return (
      !!map &&
      !!top &&
      !!panel &&
      map.y >= top.y + top.height &&
      map.y + map.height <= panel.y
    );
  };
  await expect.poll(mapWithinField).toBe(true);
  await page.screenshot({ path: "work/workshop-resources-live-map.png" });
  await page.getByRole("button", { name: "Cerrar mapa", exact: true }).click();
  for (const [a, p] of safeClock) {
    await expect(
      page.getByRole("button", { name: "Golpear prueba", exact: true }),
    ).toBeEnabled({ timeout: 20000 });
    await page
      .getByRole("slider", { name: "Ángulo de prueba", exact: true })
      .fill(String(Number(a.toFixed(10))));
    await page
      .getByRole("slider", { name: "Potencia de prueba", exact: true })
      .fill(String(Number(p.toFixed(10))));
    await page
      .getByRole("button", { name: "Golpear prueba", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Pelota en movimiento");
    await expect(
      page.getByText("Pelota en movimiento", { exact: true }),
    ).toBeHidden({ timeout: 25000 });
  }
  await expect(
    page.getByText("Embocado en 4 golpes", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".workshop-test-top")).toContainText(
    "0 penalizaciones",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("club-personal-normal-v7-p2"),
    ),
  ).toBeNull();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(rotor).toBeInViewport();
  await expect.poll(mapWithinField).toBe(true);
  await page.screenshot({
    path: "work/workshop-resources-finished-mobile.png",
  });
  expect(errors).toEqual([]);
});
