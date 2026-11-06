import { test, expect, type Page } from "@playwright/test";
import { exportWorkshop, newWorkshop } from "../../shared/workshop";
async function open(page: Page) {
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Taller de hoyos", exact: true }),
  ).toBeVisible();
}
async function imported(page: Page) {
  const d = newWorkshop();
  d.name = "Copa de prueba";
  d.start = { x: 0, z: 0 };
  d.cup = { x: 0, z: -3, height: 0 };
  await page
    .getByRole("button", { name: "Importar diseño", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "JSON del diseño", exact: true })
    .fill(exportWorkshop(d));
  await page
    .getByRole("button", { name: "Abrir diseño importado", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nombre del diseño", exact: true }),
  ).toHaveValue(d.name);
  return d;
}
test("workshop builds, edits, undoes, saves, exports and validates imported data without changing official selections", async ({
  page,
}) => {
  await page.goto("/");
  await open(page);
  const title = page.getByRole("textbox", {
    name: "Nombre del diseño",
    exact: true,
  });
  await title.fill("");
  await title.pressSequentially("Puente de amigos");
  await title.press("Enter");
  await expect(title).toHaveValue("Puente de amigos");
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("club-workshop-draft-v1")!).name,
      ),
    )
    .toBe("Puente de amigos");
  await page.getByRole("button", { name: "Pared", exact: true }).click();
  const svg = page.getByRole("img", {
    name: "Plano editable de la cancha",
    exact: true,
  });
  await svg.scrollIntoViewIfNeeded();
  const point = await svg.evaluate((node: SVGSVGElement) => {
    const p = node.createSVGPoint();
    p.x = 0;
    p.y = 1;
    const q = p.matrixTransform(node.getScreenCTM()!);
    return { x: q.x, y: q.y };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(".workshop-properties h2").first()).toHaveText(
    "Pared",
  );
  await page
    .getByRole("spinbutton", { name: "Rotación", exact: true })
    .fill("30");
  await page
    .getByRole("spinbutton", { name: "Rotación", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("spinbutton", { name: "Rotación", exact: true }),
  ).toHaveValue("30");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Rotación", exact: true }),
  ).toHaveValue("0");
  await page.getByRole("button", { name: "Rehacer", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Rotación", exact: true }),
  ).toHaveValue("30");
  await page
    .getByRole("button", { name: "Guardar diseño", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Diseño guardado");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar archivo", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.golf\.json$/);
  await page.reload();
  await open(page);
  await expect(svg.locator("[data-piece]")).toHaveCount(4); // two pieces, tee, cup
  await page
    .getByRole("button", { name: "Importar diseño", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "JSON del diseño", exact: true })
    .fill('{"version":999}');
  await page
    .getByRole("button", { name: "Abrir diseño importado", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Diseño inválido");
  await page
    .getByRole("button", { name: "Cancelar importación", exact: true })
    .click();
  await page.screenshot({ path: "work/workshop-desktop.png" });
  await page
    .getByRole("button", { name: "Volver al club", exact: true })
    .click();
  await expect(page.locator(".selected-round")).toContainText("Al Filo");
});
test("a real edited cup has no covering floor, holes physically, and never overwrites an official saved round or records", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar Al Filo/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  const before = await page.evaluate(() => ({
    round: localStorage.getItem("club-local-round"),
    practice: localStorage.getItem("club-practice-v7"),
    personal: localStorage.getItem("club-personal-normal-v7"),
  }));
  // Key used by the application, checked separately so a typo cannot make isolation pass.
  const saved = await page.evaluate(() =>
    localStorage.getItem("club-local-round"),
  );
  expect(saved).not.toBeNull();
  await open(page);
  await imported(page);
  await page.getByRole("button", { name: "Probar en 3D", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Prueba física del taller", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Golpear prueba", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("slider", { name: "Potencia de prueba", exact: true })
    .fill("0.145");
  await page
    .getByRole("button", { name: "Golpear prueba", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Pelota en movimiento");
  await expect(
    page.getByText("Embocado en 1 golpe", { exact: true }),
  ).toBeVisible({ timeout: 25000 });
  await page.screenshot({ path: "work/workshop-physical-cup.png" });
  expect(
    await page.evaluate(() => ({
      round: localStorage.getItem("club-local-round"),
      practice: localStorage.getItem("club-practice-v7"),
      personal: localStorage.getItem("club-personal-normal-v7"),
    })),
  ).toEqual(before);
  expect(
    await page.evaluate(() => localStorage.getItem("club-local-round")),
  ).toBe(saved);
  await page
    .getByRole("button", { name: "Volver al diseño", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nombre del diseño", exact: true }),
  ).toHaveValue("Copa de prueba");
});
test("mobile workshop moves a piece by touch-sized pointer drag, recovers the draft and blocks unsupported tees", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await open(page);
  const svg = page.getByRole("img", {
    name: "Plano editable de la cancha",
    exact: true,
  });
  await svg.scrollIntoViewIfNeeded();
  const coords = await svg.evaluate((node: SVGSVGElement) => {
    const map = (x: number, z: number) => {
      const p = node.createSVGPoint();
      p.x = x;
      p.y = z;
      const q = p.matrixTransform(node.getScreenCTM()!);
      return { x: q.x, y: q.y };
    };
    return { a: map(0, 3), b: map(1, 4) };
  });
  await page.mouse.move(coords.a.x, coords.a.y);
  await page.mouse.down();
  await page.mouse.move(coords.b.x, coords.b.y, { steps: 8 });
  await page.mouse.up();
  await expect(
    page.getByRole("spinbutton", { name: "Posición X", exact: true }),
  ).toHaveValue("1");
  await page.getByRole("button", { name: "Salida", exact: true }).click();
  await svg.scrollIntoViewIfNeeded();
  const loc = await svg.evaluate((node: SVGSVGElement) => {
    const p = node.createSVGPoint();
    p.x = 10;
    p.y = 20;
    const q = p.matrixTransform(node.getScreenCTM()!);
    return { x: q.x, y: q.y };
  });
  await page.mouse.click(loc.x, loc.y);
  await expect(
    page.getByRole("button", { name: "Probar en 3D", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".workshop-properties")).toContainText(
    "salida necesita",
  );
  await page.screenshot({ path: "work/workshop-mobile.png", fullPage: true });
  await page.reload();
  await open(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Probar en 3D", exact: true }),
  ).toBeDisabled();
});
