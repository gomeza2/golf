import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { exportWorkshop } from "../../shared/workshop";
import { longWorkshop } from "../fixtures/workshop";
test("an author explicitly chooses physics, cancels, undoes, exports, reloads and actually plays a current-edition creation on mobile", async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("golf-graphics-mode", "low"),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Importar diseño", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "JSON del diseño", exact: true })
    .fill(exportWorkshop(longWorkshop()));
  await page
    .getByRole("button", { name: "Abrir diseño importado", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar diseño", exact: true })
    .click();
  const select = page.getByRole("combobox", {
    name: "Física de la cancha",
    exact: true,
  });
  await expect(select).toHaveValue("1");
  await select.selectOption("2");
  const dialog = page.getByRole("dialog", {
    name: "¿Usar física actual?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: "work/workshop-editions-confirm-mobile.png" });
  await dialog
    .getByRole("button", { name: "Conservar física", exact: true })
    .click();
  await expect(select).toHaveValue("1");
  await select.selectOption("2");
  await dialog
    .getByRole("button", { name: "Cambiar física", exact: true })
    .click();
  await expect(select).toHaveValue("2");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(select).toHaveValue("1");
  await page.getByRole("button", { name: "Rehacer", exact: true }).click();
  await expect(select).toHaveValue("2");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar archivo", exact: true })
    .click();
  const file = await download;
  const exported = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(exported).toMatchObject({ version: 2, physics: 2 });
  expect(exported.pieces).toEqual(longWorkshop().pieces);
  const copies = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("club-workshop-library-v1")!),
  );
  expect(copies[0].doc.version).toBe(1);
  expect(copies[0].doc.physics).toBeUndefined();
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await expect(select).toHaveValue("2");
  await page.getByRole("button", { name: "Probar en 3D", exact: true }).click();
  await expect(page.locator(".workshop-test-top")).toContainText(
    "Física actual",
  );
  for (const power of ["1", "0.13"]) {
    const shot = page.getByRole("button", {
      name: "Golpear prueba",
      exact: true,
    });
    await expect(shot).toBeEnabled({ timeout: 20000 });
    await page
      .getByRole("slider", { name: "Potencia de prueba", exact: true })
      .fill(power);
    await shot.click();
    await expect(page.getByRole("status")).toHaveText("Pelota en movimiento");
    await expect(
      page.getByText("Pelota en movimiento", { exact: true }),
    ).toBeHidden({ timeout: 25000 });
  }
  await expect(
    page.getByText("Embocado en 2 golpes", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".workshop-test-top")).toContainText(
    "0 penalizaciones",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("club-personal-normal-v7-p2"),
    ),
  ).toBeNull();
  expect(errors).toEqual([]);
  await page.screenshot({ path: "work/workshop-editions-play-mobile.png" });
});
