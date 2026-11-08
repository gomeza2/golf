import { test, expect, type Page } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import type { State } from "../../shared/game";
import { NETWORK_PROTOCOL } from "../../shared/rules";
import { wildRiskShots, wildSafeShots, type WildShot } from "../fixtures/wild";
import { readFileSync } from "node:fs";
const legacy = JSON.parse(
  readFileSync(
    new URL("../fixtures/v018-inflight.json", import.meta.url),
    "utf8",
  ),
);

async function fire(page: Page, shot: WildShot) {
  const button = page.getByRole("button", { name: /GOLPEAR/ });
  await expect(button).toBeEnabled({ timeout: 20000 });
  await page
    .getByRole("slider", { name: "Ángulo", exact: true })
    .fill(String(Number(shot[0].toFixed(10))));
  await page
    .getByRole("slider", { name: "Potencia", exact: true })
    .fill(String(Number(shot[1].toFixed(10))));
  await button.click();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeHidden({ timeout: 25000 });
}
test("the new large fields play a complete round with real jumps, long drives, a gate and a current-edition record", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("golf-graphics-mode", "low");
    localStorage.setItem("golf-hole-intro", "false");
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Tierras bravas/ }).click();
  await page.getByRole("button", { name: /Jugar en este dispositivo/ }).click();
  await expect(page.locator(".selected-round")).toContainText("Tierras bravas");
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  const routes = [wildRiskShots[0], wildRiskShots[1], wildSafeShots[2]];
  for (let h = 0; h < 3; h++) {
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
      timeout: 20000,
    });
    await page.getByRole("button", { name: "Ver campo", exact: true }).click();
    await expect
      .poll(
        async () => {
          const text = await page
            .locator("canvas")
            .getAttribute("data-field-rect");
          if (!text) return false;
          const r = JSON.parse(text),
            size = page.viewportSize()!;
          return (
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= size.width &&
            r.bottom <= size.height
          );
        },
        { timeout: 15000 },
      )
      .toBe(true);
    await page.screenshot({
      path: `work/wildlands-overview-${h}.png`,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Seguir pelota", exact: true })
      .click();
    for (let i = 0; i < routes[h].length; i++) {
      if (h === 2 && i === 2) {
        await page.getByRole("button", { name: "Mapa", exact: true }).click();
        // Wait for the real visible gate to begin opening, rather than assuming
        // the same launch time across computers or changing the simulation.
        await expect(
          page.locator('.hole-map rect[aria-label="Compuerta cerrada"]'),
        ).toHaveCount(1, { timeout: 10000 });
        await expect(
          page.locator('.hole-map rect[aria-label="Compuerta abierta"]'),
        ).toHaveCount(1, { timeout: 10000 });
      }
      await fire(page, routes[h][i]);
      if (h === 2 && i === 2)
        await page
          .getByRole("button", { name: "Cerrar mapa", exact: true })
          .click();
    }
    if (h < 2)
      await page.getByRole("button", { name: /Siguiente hoyo/ }).click();
  }
  await expect(
    page.getByText("Nuevo récord personal: 13 golpes", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("club-personal-normal-v7-p2")!).records[
          "wildlands:classic"
        ].best,
    ),
  ).toBe(13);
  expect(
    await page.evaluate(() => localStorage.getItem("club-personal-normal-v7")),
  ).toBeNull();
  expect(errors).toEqual([]);
  await page.screenshot({ path: "work/wildlands-results.png" });
});

test("a real 0.18 saved shot resumes with original physics and archived marks stay visible on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const records = JSON.stringify({
    version: 7,
    records: {
      "sunset:classic": {
        best: 9,
        rounds: 2,
        date: "2026-11-01T00:00:00Z",
        goals: ["finish", "par"],
      },
    },
  });
  await page.addInitScript(
    ({ round, records }) => {
      // Seed once; reloading must exercise the application's own save path.
      if (!sessionStorage.getItem("v018-seeded")) {
        localStorage.setItem("club-local-round", JSON.stringify(round));
        localStorage.setItem("club-personal-normal-v7", records);
        localStorage.setItem("golf-control-mode", "classic");
        localStorage.setItem("golf-graphics-mode", "low");
        sessionStorage.setItem("v018-seeded", "true");
      }
    },
    { round: legacy.round, records },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Club del atardecer/ }).click();
  const archive = page.locator(".legacy-marks");
  await archive.locator("summary").click();
  await expect(archive).toContainText("9 golpes");
  await expect(archive).toContainText("Recorrido completado");
  await page.screenshot({ path: "work/wildlands-legacy-marks-mobile.png" });
  await page
    .getByRole("button", { name: "Reanudar partida", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continuar partida", exact: true })
    .click();
  await expect(page.locator(".locked-control")).toContainText(
    "Física original",
  );
  await expect(
    page.getByText("Pelota en movimiento", { exact: true }),
  ).toBeHidden({ timeout: 25000 });
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
    timeout: 25000,
  });
  await expect(page.locator(".turn-toast b")).toHaveText("1/12");
  expect(
    await page.evaluate(() => localStorage.getItem("club-personal-normal-v7")),
  ).toBe(records);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("club-personal-normal-v7-p2"),
    ),
  ).toBeNull();
  await page.screenshot({ path: "work/wildlands-legacy-resumed-mobile.png" });
});

function event<T>(
  socket: Socket,
  name: string,
  check: (value: T) => boolean = () => true,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(name, listener);
      reject(Error(`Timeout ${name}`));
    }, 20000);
    const listener = (value: T) => {
      if (!check(value)) return;
      clearTimeout(timer);
      socket.off(name, listener);
      resolve(value);
    };
    socket.on(name, listener);
  });
}
const state = (socket: Socket, check: (s: State) => boolean) =>
  event<State>(socket, "state", check);
async function open() {
  const socket = io(process.env.PUBLIC_ONLINE_URL || "http://localhost:3001", {
    transports: ["websocket"],
  });
  await event(socket, "connect");
  return socket;
}
async function enter(socket: Socket, action: object) {
  const pending = event<{ id: string; code: string; protocol: number }>(
    socket,
    "session",
  );
  socket.emit("action", action);
  return pending;
}
test("the public wild circuit validates stronger normal drives and a genuine risk-versus-safe duel", async () => {
  test.setTimeout(180000);
  const a = await open(),
    b = await open();
  try {
    const host = await enter(a, {
      type: "create",
      name: "Ana",
      circuit: "wildlands",
      physics: 1,
    });
    expect(host.protocol).toBe(NETWORK_PROTOCOL);
    await enter(b, { type: "join", name: "Luis", code: host.code });
    const prepared = state(
      a,
      (s) => s.players.length === 2 && s.players.every((p) => p.ready),
    );
    a.emit("action", { type: "ready" });
    b.emit("action", { type: "ready" });
    await prepared;
    const started = state(a, (s) => s.phase === "playing");
    a.emit("action", { type: "start", physics: 1 });
    let current = await started;
    expect(current.physics).toBe(2);
    expect(current.circuit).toBe("wildlands");
    let peak = 0;
    a.on("state", (s: State) => {
      if (s.hole === 0 && s.players[0]?.strokes === 2)
        peak = Math.max(peak, s.players[0].pos.y);
    });
    const used = [0, 0],
      routes = [wildRiskShots[0], wildSafeShots[0]];
    while (current.phase === "playing") {
      const player = current.turn,
        n = ++used[player],
        socket = player ? b : a;
      expect(n).toBeLessThanOrEqual(routes[player].length);
      const shot = routes[player][n - 1];
      const moving = state(
        a,
        (s) => s.moving && s.players[player].strokes === n,
      );
      const stopped = state(
        a,
        (s) =>
          !s.moving &&
          (s.players[player].strokes === n ||
            s.players[player].scores[0] === n),
      );
      socket.emit("action", {
        type: "shoot",
        angle: shot[0],
        power: shot[1],
        physics: 1,
      });
      expect((await moving).physics).toBe(2);
      current = await stopped;
    }
    expect(current.players.map((p) => p.scores)).toEqual([[3], [5]]);
    expect(
      current.players.every((p) => p.penalties === 0 && !p.capped.length),
    ).toBe(true);
    expect(peak).toBeGreaterThan(2.6);
    const next = state(b, (s) => s.hole === 1 && s.phase === "playing");
    a.emit("action", { type: "next" });
    const second = await next;
    expect(second.players[second.turn].id).toBe(host.id);
    expect(second.physics).toBe(2);
  } finally {
    a.disconnect();
    b.disconnect();
  }
});
