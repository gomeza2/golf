import { test, expect } from "@playwright/test";
test("an unconfigured community shows its real unavailable state without fake cards or publication controls", async ({
  page,
}) => {
  await page.goto("/?community=1");
  await expect(
    page.getByRole("heading", {
      name: "La comunidad aún no está activada",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("#boot-screen")).toHaveCount(0);
  await expect(page.locator(".community-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Entrar para publicar", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Volver al club", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publicar en la comunidad", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Jugar con amigos online", exact: true }),
  ).toBeEnabled();
});
