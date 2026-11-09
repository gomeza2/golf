import { test, expect, type Page } from "@playwright/test";
import { exportWorkshop } from "../../shared/workshop";
import { constructionWorkshop } from "../fixtures/construction";
import { riskLock } from "../fixtures/blueprints";
async function open(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await expect(page.locator(".editor3d-stage canvas")).toHaveAttribute(
    "data-editor-ready",
    "true",
  );
}
async function input(page: Page, doc = constructionWorkshop()) {
  await page
    .getByRole("button", { name: "Importar diseño", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "JSON del diseño", exact: true })
    .fill(exportWorkshop(doc));
  await page
    .getByRole("button", { name: "Abrir diseño importado", exact: true })
    .click();
}
const draft = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("club-workshop-draft-v1")!),
  );
test("the editor renders real heights and changes orbit, pan, zoom and every view without changing the design", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await input(page);
  const canvas = page.locator(".editor3d-stage canvas");
  const before = await draft(page);
  await canvas.scrollIntoViewIfNeeded();
  for (const view of ["top", "front", "side", "perspective"]) {
    const previous = await canvas.getAttribute("data-editor-camera");
    await page
      .getByRole("combobox", { name: "Vista del editor", exact: true })
      .selectOption(view);
    await expect
      .poll(() => canvas.getAttribute("data-editor-camera"))
      .not.toBe(previous);
  }
  await page
    .getByRole("button", { name: "Navegar cámara", exact: true })
    .click();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const previous = await canvas.getAttribute("data-editor-camera");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6, {
    steps: 12,
  });
  await page.mouse.up();
  await expect
    .poll(() => canvas.getAttribute("data-editor-camera"))
    .not.toBe(previous);
  await page.getByRole("button", { name: "Acercar", exact: true }).click();
  await page
    .getByRole("button", { name: "Desplazar cámara →", exact: true })
    .click();
  if (await page.evaluate(() => document.fullscreenEnabled)) {
    await page
      .getByRole("button", { name: "Ampliar editor", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.fullscreenElement?.classList.contains("workshop") ?? false,
        ),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Salir de pantalla completa", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement === null))
      .toBe(true);
  }
  await page.screenshot({
    path: "work/editor3d-orbit-desktop.png",
    fullPage: true,
  });
  expect(await draft(page)).toEqual(before);
  expect(errors).toEqual([]);
});
test("a real 3D selection can be moved by its rendered gizmo and undo restores the exact piece", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /Laboratorio en altura/ }).click();
  const canvas = page.locator(".editor3d-stage canvas");
  await page
    .getByRole("combobox", { name: "Vista del editor", exact: true })
    .selectOption("top");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const waterPoint = await canvas.evaluate(
    (c: HTMLCanvasElement) => JSON.parse(c.dataset.editorPieces!).water,
  );
  await page.mouse.click(box.x + waterPoint.x, box.y + waterPoint.y);
  await expect(page.locator(".workshop-properties h2").first()).toHaveText(
    "Agua",
  );
  await expect
    .poll(
      async () =>
        JSON.parse((await canvas.getAttribute("data-editor-pivot")) || "[]")[1],
    )
    .toBe(-1.4);
  await expect
    .poll(async () =>
      Object.keys(
        JSON.parse((await canvas.getAttribute("data-editor-handles")) || "{}"),
      ),
    )
    .not.toContain("Y");

  const pos = await canvas.evaluate(
    (c: HTMLCanvasElement) => JSON.parse(c.dataset.editorPieces!)["soil"],
  );
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
  await expect(page.locator(".workshop-properties h2").first()).toHaveText(
    "Grupo",
  );
  await expect
    .poll(() => canvas.getAttribute("data-editor-selection"))
    .toContain("tunnel-");
  await page.keyboard.down("Alt");
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
  await page.keyboard.up("Alt");
  await expect(page.locator(".workshop-properties h2").first()).toHaveText(
    "Tierra",
  );
  const before = await draft(page);
  await page.getByRole("button", { name: "Mover en 3D", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect
    .poll(async () =>
      Object.keys(
        JSON.parse((await canvas.getAttribute("data-editor-handles")) || "{}"),
      ),
    )
    .toContain("X");
  const handle = JSON.parse(
      (await canvas.getAttribute("data-editor-handles"))!,
    ).X,
    rect = (await canvas.boundingBox())!;
  await page.mouse.move(rect.x + handle.x, rect.y + handle.y);
  await page.mouse.down();
  await page.mouse.move(rect.x + handle.x + 40, rect.y + handle.y, {
    steps: 15,
  });
  await page.mouse.up();
  await expect
    .poll(
      async () =>
        (await draft(page)).pieces.find((p: any) => p.id === "soil").x,
    )
    .not.toBe(before.pieces.find((p: any) => p.id === "soil").x);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  expect(await draft(page)).toEqual(before);
  await page
    .getByRole("button", { name: "Escalar en 3D", exact: true })
    .click();
  await canvas.scrollIntoViewIfNeeded();
  const scaleHandle = JSON.parse(
      (await canvas.getAttribute("data-editor-handles"))!,
    ).X,
    scaleRect = (await canvas.boundingBox())!;
  await page.mouse.move(
    scaleRect.x + scaleHandle.x,
    scaleRect.y + scaleHandle.y,
  );
  await page.mouse.down();
  await page.mouse.move(
    scaleRect.x + scaleHandle.x + 25,
    scaleRect.y + scaleHandle.y,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect
    .poll(
      async () =>
        (await draft(page)).pieces.find((p: any) => p.id === "soil").width,
    )
    .not.toBe(before.pieces.find((p: any) => p.id === "soil").width);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  expect(await draft(page)).toEqual(before);
  await page.getByRole("button", { name: "Mover en 3D", exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  const cancelHandle = JSON.parse(
      (await canvas.getAttribute("data-editor-handles"))!,
    ).X,
    cancelRect = (await canvas.boundingBox())!;
  await page.mouse.move(
    cancelRect.x + cancelHandle.x,
    cancelRect.y + cancelHandle.y,
  );
  await page.mouse.down();
  await page.mouse.move(
    cancelRect.x + cancelHandle.x + 25,
    cancelRect.y + cancelHandle.y,
    { steps: 10 },
  );
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await draft(page)).toEqual(before);
  const originalPiece = before.pieces.find((p: any) => p.id === "soil");
  const validPivot = [originalPiece.x, originalPiece.height, originalPiece.z];
  await expect
    .poll(async () =>
      JSON.parse((await canvas.getAttribute("data-editor-pivot"))!),
    )
    .toEqual(validPivot);
  const invalidHandle = JSON.parse(
    (await canvas.getAttribute("data-editor-handles"))!,
  ).X;
  const invalidRect = (await canvas.boundingBox())!;
  await page.mouse.move(
    invalidRect.x + invalidHandle.x,
    invalidRect.y + invalidHandle.y,
  );
  await page.mouse.down();
  await page.mouse.move(
    invalidRect.x + invalidHandle.x + 180,
    invalidRect.y + invalidHandle.y,
    { steps: 12 },
  );
  await page.mouse.up();
  expect(await draft(page)).toEqual(before);
  await expect
    .poll(async () =>
      JSON.parse((await canvas.getAttribute("data-editor-pivot"))!),
    )
    .toEqual(validPivot);
  await page.screenshot({
    path: "work/editor3d-gizmo-desktop.png",
    fullPage: true,
  });
});
test("a saved editable project preserves locks, grouping, clipboard and real physical play on mobile", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("golf-graphics-mode", "low"),
  );
  await open(page);
  await input(page);
  await page.getByText(/Objetos y grupos/).click();
  await page.getByRole("button", { name: /Tierra · 2 m/ }).click();
  await page
    .getByRole("button", { name: "Bloquear selección", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Altura", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Guardar diseño", exact: true })
    .click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Exportar proyecto editable", exact: true })
      .click(),
  ]);
  const stream = await download.createReadStream(),
    chunks: Buffer[] = [];
  for await (const c of stream!) chunks.push(Buffer.from(c));
  const project = Buffer.concat(chunks).toString();
  expect(JSON.parse(project).editor.locked).toContain("soil");
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("club-workshop-project-v1")!).editor
          .locked,
    ),
  ).toContain("soil");
  await page
    .getByRole("button", { name: "Importar diseño", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "JSON del diseño", exact: true })
    .fill(project);
  await page
    .getByRole("button", { name: "Abrir diseño importado", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Vista del editor", exact: true })
    .selectOption("side");
  const storedCamera = JSON.parse(
    (await page
      .locator(".editor3d-stage canvas")
      .getAttribute("data-editor-camera"))!,
  );
  if (await page.evaluate(() => document.fullscreenEnabled))
    await page
      .getByRole("button", { name: "Ampliar editor", exact: true })
      .click();
  await page.getByRole("button", { name: "Probar en 3D", exact: true }).click();
  for (const [a, p] of riskLock) {
    await expect(
      page.getByRole("button", { name: "Golpear prueba", exact: true }),
    ).toBeEnabled({ timeout: 20000 });
    await page
      .getByRole("slider", { name: "Ángulo de prueba", exact: true })
      .fill(String(Number(a.toFixed(10))));
    await page
      .getByRole("slider", { name: "Potencia de prueba", exact: true })
      .fill(String(p));
    await page
      .getByRole("button", { name: "Golpear prueba", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Pelota en movimiento");
    await expect(
      page.getByText("Pelota en movimiento", { exact: true }),
    ).toBeHidden({ timeout: 25000 });
  }
  await expect(
    page.getByText("Embocado en 3 golpes", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver al diseño", exact: true })
    .click();
  await expect(page.locator(".editor3d-stage canvas")).toHaveAttribute(
    "data-editor-ready",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Ampliar editor", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const current = JSON.parse(
        (await page
          .locator(".editor3d-stage canvas")
          .getAttribute("data-editor-camera"))!,
      );
      return current.position.every(
        (n: number, i: number) =>
          Math.abs(n - storedCamera.position[i]) < 0.001,
      );
    })
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/editor3d-mobile-project.png",
    fullPage: true,
  });
});

test("construction on the actual 3D scene groups structures, safely copies, locks and confirms structural deletion", async ({
  page,
}) => {
  await open(page);
  const canvas = page.locator(".editor3d-stage canvas");
  await page
    .getByRole("combobox", { name: "Vista del editor", exact: true })
    .selectOption("top");
  await canvas.scrollIntoViewIfNeeded();
  const basePoint = await canvas.evaluate(
      (c: HTMLCanvasElement) => JSON.parse(c.dataset.editorPieces!).base,
    ),
    baseRect = (await canvas.boundingBox())!;
  await page.mouse.click(baseRect.x + basePoint.x, baseRect.y + basePoint.y);
  await expect(page.locator(".workshop-properties h2").first()).toHaveText(
    "Plataforma",
  );
  await page
    .getByRole("button", { name: "Túnel transitable", exact: true })
    .click();
  await canvas.scrollIntoViewIfNeeded();
  const center = await canvas.evaluate(
      (c: HTMLCanvasElement) => JSON.parse(c.dataset.editorPieces!).base,
    ),
    rect = (await canvas.boundingBox())!;
  await page.mouse.click(rect.x + center.x, rect.y + center.y);
  await expect.poll(async () => (await draft(page)).pieces.length).toBe(7);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("club-workshop-project-v1")!).editor
          .groups[0].pieces.length,
    ),
  ).toBe(6);
  await page
    .getByRole("button", { name: "Seleccionar todas las piezas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Copiar piezas", exact: true })
    .click();
  await page.getByRole("button", { name: "Pegar piezas", exact: true }).click();
  await expect.poll(async () => (await draft(page)).pieces.length).toBe(14);
  await page
    .getByRole("button", { name: "Bloquear selección", exact: true })
    .click();
  const locked = await draft(page);
  await page
    .getByRole("button", { name: "Mover grupo a la derecha", exact: true })
    .click();
  await expect(page.locator(".workshop-status")).toContainText("Desbloquea");
  expect(await draft(page)).toEqual(locked);
  await page
    .getByRole("button", { name: "Desbloquear selección", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Eliminar grupo", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Confirmar eliminación", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Conservar piezas", exact: true })
    .click();
  expect(await draft(page)).toEqual(locked);
  await page
    .getByRole("button", { name: "Eliminar grupo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar eliminación", exact: true })
    .click();
  await expect.poll(async () => (await draft(page)).pieces.length).toBe(7);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  expect(await draft(page)).toEqual(locked);
  await page
    .getByRole("button", { name: "Guardar diseño", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await expect.poll(async () => (await draft(page)).pieces.length).toBe(14);
});

test("a touch device can orbit and pinch the real construction scene without moving pieces", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await open(page);
    await input(page);
    const before = await draft(page),
      canvas = page.locator(".editor3d-stage canvas");
    await page
      .getByRole("button", { name: "Navegar cámara", exact: true })
      .click();
    await canvas.scrollIntoViewIfNeeded();
    const r = (await canvas.boundingBox())!,
      x = r.x + r.width / 2,
      y = r.y + r.height / 2,
      old = await canvas.getAttribute("data-editor-camera"),
      cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 60, y: y + 25 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => canvas.getAttribute("data-editor-camera"))
      .not.toBe(old);
    const orbit = await canvas.getAttribute("data-editor-camera");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 30, y },
        { x: x + 30, y },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 65, y },
        { x: x + 65, y },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
    await expect
      .poll(() => canvas.getAttribute("data-editor-camera"))
      .not.toBe(orbit);
    expect(await draft(page)).toEqual(before);
    await page.screenshot({ path: "work/editor3d-touch.png" });
  } finally {
    await context.close();
  }
});
