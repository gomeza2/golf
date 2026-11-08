import { test, expect, type Page } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import { privateWorkshop } from "../fixtures/workshop";
import { exportWorkshop, withWorkshopPhysics } from "../../shared/workshop";
async function signIn(page: Page, role: "autor" | "moderador" | "lector") {
  await page
    .getByRole("button", { name: "Entrar para publicar", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `Acceder como ${role} de prueba`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/localhost:5173/);
  await expect(page.locator(".community-account strong")).toBeVisible({
    timeout: 20000,
  });
}
async function importDoc(page: Page, doc = privateWorkshop()) {
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
async function fire(page: Page) {
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
    timeout: 20000,
  });
  await page.getByRole("slider", { name: "Ángulo", exact: true }).fill("0");
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill("0.22");
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
}
test("a real creation moves through OIDC publication, review, anonymous discovery, physical solo play, pinned versions and reports", async ({
  browser,
}) => {
  test.setTimeout(480000);
  const authorContext = await browser.newContext(),
    modContext = await browser.newContext(),
    guestContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    friendContext = await browser.newContext();
  try {
    await Promise.all(
      [authorContext, modContext, guestContext, friendContext].map((c) =>
        c.addInitScript(() => {
          localStorage.setItem("golf-graphics-mode", "low");
          localStorage.setItem("golf-hole-intro", "false");
        }),
      ),
    );
    const author = await authorContext.newPage(),
      mod = await modContext.newPage(),
      guest = await guestContext.newPage(),
      friend = await friendContext.newPage();
    const errors: string[] = [];
    for (const p of [author, mod, guest, friend])
      p.on("pageerror", (e) => errors.push(e.message));
    await author.goto("/");
    await author
      .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
      .click();
    await importDoc(author);
    await expect(
      author.getByRole("button", {
        name: "Publicar en la comunidad",
        exact: true,
      }),
    ).toBeVisible({ timeout: 15000 });
    await author
      .getByRole("button", { name: "Publicar en la comunidad", exact: true })
      .click();
    await signIn(author, "autor");
    await author
      .getByRole("textbox", { name: "Nombre de autor", exact: true })
      .fill("Arquitecto de pruebas");
    await author
      .getByRole("textbox", { name: "Descripción", exact: true })
      .fill("Un diseño real para comprobar la comunidad y su copa.");
    await author
      .getByRole("button", { name: "Enviar a revisión", exact: true })
      .click();
    await expect(author.locator(".community-detail")).toContainText(
      "En revisión",
    );
    const creation = new URL(author.url()).searchParams.get("creation")!;
    expect(creation).toMatch(/^[a-f0-9-]{36}$/);
    const pinned = `http://localhost:5173/?community=1&creation=${creation}&revision=1`;
    await guest.goto("/?community=1");
    await expect(
      guest.getByRole("heading", {
        name: "Aún no hay canchas para esta búsqueda",
        exact: true,
      }),
    ).toBeVisible();
    await mod.goto("/?community=1");
    await signIn(mod, "moderador");
    await mod.getByRole("button", { name: "Moderación", exact: true }).click();
    await mod
      .getByRole("button", { name: "Inspeccionar revisión", exact: true })
      .click();
    await mod
      .getByRole("textbox", { name: "Motivo de la decisión", exact: true })
      .fill("Diseño comprobado para esta prueba de publicación.");
    await mod
      .getByRole("button", { name: "Aprobar publicación", exact: true })
      .click();
    await expect(mod.locator(".community-detail")).toContainText("Publicada");
    await guest.reload();
    await guest
      .getByRole("textbox", { name: "Buscar creaciones", exact: true })
      .fill("La cancha de Ana");
    await guest
      .getByRole("textbox", { name: "Filtrar por autor", exact: true })
      .fill("Arquitecto de pruebas");
    await guest
      .getByRole("combobox", { name: "Filtrar dificultad", exact: true })
      .selectOption("medium");
    await guest
      .getByRole("button", { name: "Buscar canchas", exact: true })
      .click();
    await expect(guest.locator(".community-card")).toHaveCount(1);
    await guest.screenshot({
      path: "work/community-gallery-mobile.png",
      fullPage: true,
    });
    await guest.locator(".community-card").click();
    await expect(
      guest.getByRole("heading", { name: "La cancha de Ana", exact: true }),
    ).toBeVisible();
    await guest.goto(pinned);
    await expect(
      guest.getByRole("button", { name: "Jugar en solitario", exact: true }),
    ).toBeEnabled();
    expect(await guest.locator("canvas").count()).toBe(0);
    await guest
      .getByRole("button", { name: "Jugar en solitario", exact: true })
      .click();
    await fire(guest);
    await expect(
      guest.getByText("¡Cancha completada!", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    expect(
      await guest.evaluate(() =>
        localStorage.getItem("club-personal-normal-v7"),
      ),
    ).toBeNull();
    expect(
      await guest.evaluate(() =>
        localStorage.getItem("club-personal-normal-v7-p2"),
      ),
    ).toBeNull();
    await guest
      .getByRole("button", { name: "Volver a la creación", exact: true })
      .click();
    await guest
      .getByRole("button", {
        name: "Invitar amigos a esta versión",
        exact: true,
      })
      .click();
    await guest
      .getByRole("textbox", { name: "Tu nombre", exact: true })
      .fill("Invitado");
    await guest.getByRole("button", { name: /Crear sala/ }).click();
    await expect(guest.getByTestId("room-code")).toHaveText(/^[A-F0-9]{6}$/);
    const code = await guest.getByTestId("room-code").innerText();
    await friend.goto("/?room=" + code);
    await friend
      .getByRole("button", { name: "Jugar online con amigos", exact: true })
      .click();
    await friend
      .getByRole("textbox", { name: "Tu nombre", exact: true })
      .fill("Amigo");
    await friend.getByRole("button", { name: /Unirme/ }).click();
    for (const p of [guest, friend])
      await p.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await guest.getByRole("button", { name: /Comenzar partida/ }).click();
    await fire(guest);
    await fire(friend);
    await expect(
      guest.getByRole("heading", { name: "Victoria compartida.", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await guest.screenshot({
      path: "work/community-online-results.png",
      fullPage: true,
    });
    await author
      .getByRole("button", { name: "Volver al club", exact: true })
      .click();
    await author
      .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
      .click();
    const previousDraft = privateWorkshop();
    previousDraft.name = "Mi borrador aparte";
    await importDoc(author, previousDraft);
    await author.goto(pinned);
    await author
      .getByRole("button", {
        name: "Editar nueva versión en el taller",
        exact: true,
      })
      .click();
    await expect(
      author.getByRole("heading", { name: "Taller de hoyos", exact: true }),
    ).toBeVisible();
    expect(
      await author.evaluate(() =>
        JSON.parse(
          localStorage.getItem("club-workshop-library-v1") || "[]",
        ).some((r: any) => r.doc.name === "Mi borrador aparte"),
      ),
    ).toBe(true);
    const second = withWorkshopPhysics(privateWorkshop(), 2);
    second.name = "La cancha de Ana, segunda ruta";
    await importDoc(author, second);
    await author.reload();
    await author
      .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
      .click();
    await expect(
      author.getByRole("textbox", { name: "Nombre del diseño", exact: true }),
    ).toHaveValue(second.name);
    await expect(author.locator(".private-course-summary")).toContainText(
      "Nueva revisión 2",
    );
    await expect(
      author.getByRole("button", {
        name: "Publicar en la comunidad",
        exact: true,
      }),
    ).toBeVisible({ timeout: 15000 });
    await author
      .getByRole("button", { name: "Publicar en la comunidad", exact: true })
      .click();
    await author
      .getByRole("textbox", { name: "Descripción", exact: true })
      .fill("Segunda revisión: se conserva el enlace de la primera.");
    await author
      .getByRole("button", { name: "Enviar a revisión", exact: true })
      .click();
    await expect(author.locator(".community-detail")).toContainText(
      "REVISIÓN 2",
    );
    await mod.goto(`/?community=1&creation=${creation}&revision=2`);
    await mod
      .getByRole("textbox", { name: "Motivo de la decisión", exact: true })
      .fill("Segunda revisión comprobada sin modificar la primera.");
    await mod
      .getByRole("button", { name: "Aprobar publicación", exact: true })
      .click();
    await friend.goto(pinned);
    await expect(
      friend.getByRole("heading", { name: "La cancha de Ana", exact: true }),
    ).toBeVisible();
    await expect(friend.locator(".community-physics").first()).toContainText(
      "Física original",
    );
    await friend.goto(`/?community=1&creation=${creation}`);
    await expect(
      friend.getByRole("heading", { name: second.name, exact: true }),
    ).toBeVisible();
    await friend
      .getByRole("button", { name: "Entrar para denunciar", exact: true })
      .click();
    await friend
      .getByRole("button", {
        name: "Acceder como lector de prueba",
        exact: true,
      })
      .click();
    await expect(
      friend.getByRole("heading", { name: second.name, exact: true }),
    ).toBeVisible();
    await friend.goto("/?community=1");
    await friend
      .getByRole("textbox", { name: "Buscar creaciones", exact: true })
      .fill(second.name);
    await friend
      .getByRole("combobox", { name: "Filtrar física", exact: true })
      .selectOption("1");
    await friend
      .getByRole("button", { name: "Buscar canchas", exact: true })
      .click();
    await expect(
      friend.getByRole("heading", {
        name: "Aún no hay canchas para esta búsqueda",
        exact: true,
      }),
    ).toBeVisible();
    await friend
      .getByRole("combobox", { name: "Filtrar física", exact: true })
      .selectOption("2");
    await friend
      .getByRole("button", { name: "Buscar canchas", exact: true })
      .click();
    await expect(friend.locator(".community-card")).toHaveCount(1);
    await expect(friend.locator(".community-card")).toContainText(
      "Física actual",
    );
    await friend.locator(".community-card").click();
    await expect(friend.locator(".community-physics").first()).toContainText(
      "Física actual",
    );
    await friend
      .getByRole("button", { name: "Jugar en solitario", exact: true })
      .click();
    await expect(friend.locator(".workshop-test-top")).toContainText(
      "Física actual",
    );
    await fire(friend);
    await expect(
      friend.getByText("¡Cancha completada!", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    expect(
      await friend.evaluate(() =>
        localStorage.getItem("club-personal-normal-v7-p2"),
      ),
    ).toBeNull();
    await friend
      .getByRole("button", { name: "Volver a la creación", exact: true })
      .click();
    await friend
      .getByRole("button", { name: "Denunciar esta versión", exact: true })
      .click();
    await friend
      .getByRole("textbox", { name: "Detalles de la denuncia", exact: true })
      .fill("Denuncia de prueba sobre esta revisión concreta y su trazado.");
    await friend
      .getByRole("button", { name: "Enviar denuncia", exact: true })
      .click();
    await expect(
      friend.getByText("Denuncia recibida. Moderación revisará esta versión.", {
        exact: true,
      }),
    ).toBeVisible();
    await mod.goto(`/?community=1&creation=${creation}&revision=2`);
    await mod
      .getByRole("textbox", { name: "Motivo de la decisión", exact: true })
      .fill("Retirada de prueba: el enlace y la revisión se conservan.");
    await mod
      .getByRole("button", { name: "Retirar versión", exact: true })
      .click();
    await guest.goto(`/?community=1&creation=${creation}&revision=2`);
    await expect(guest.locator(".community-detail")).toContainText(
      "Esta revisión fue retirada.",
    );
    await expect(
      guest.getByRole("button", { name: "Jugar en solitario", exact: true }),
    ).toHaveCount(0);
    await guest.screenshot({
      path: "work/community-withdrawn-version.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    for (const c of [authorContext, modContext, guestContext, friendContext])
      await c.close();
  }
});
