import { test, expect, type Page } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import { privateWorkshop, longWorkshop } from "../fixtures/workshop";
import { exportWorkshop, withWorkshopPhysics } from "../../shared/workshop";
import type { State } from "../../shared/game";
import {
  workshopFingerprint,
  validateRoomWorkshop,
} from "../../shared/roomWorkshop";
function event<T = any>(
  s: Socket,
  name: string,
  accept: (v: T) => boolean = () => true,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = (v: T) => {
      if (!accept(v)) return;
      clearTimeout(timer);
      s.off(name, cb);
      resolve(v);
    };
    const timer = setTimeout(() => {
      s.off(name, cb);
      reject(Error(`Timeout ${name}`));
    }, 15000);
    s.on(name, cb);
  });
}
async function open() {
  const s = io(process.env.PUBLIC_ONLINE_URL || "http://localhost:3001", {
    transports: ["websocket"],
  });
  await event(s, "connect");
  return s;
}
const state = (s: Socket, p: (v: State) => boolean) =>
  event<State>(s, "state", p);
async function reject(s: Socket, action: object, pattern: RegExp) {
  const p = event<string>(s, "notice");
  s.emit("action", action);
  expect(await p).toMatch(pattern);
}
async function admission(s: Socket, action: object) {
  const session = event<{ id: string; token: string; code: string }>(
      s,
      "session",
    ),
    content = event<{ hash: string; document: unknown }>(s, "workshop");
  s.emit("action", action);
  return { session: await session, content: await content };
}
test("the public workshop room validates immutable content, gates readiness, reconnects and scores a real private match", async () => {
  test.setTimeout(120000);
  const a = await open(),
    b = await open();
  let back: Socket | undefined;
  try {
    await reject(
      a,
      {
        type: "create",
        name: "Ana",
        workshop: { ...privateWorkshop(), pieces: [] },
      },
      /plataforma/,
    );
    const host = await admission(a, {
      type: "create",
      name: "Ana",
      workshop: privateWorkshop(),
      format: "stableford",
    });
    expect(host.content.hash).toBe(
      await workshopFingerprint(
        validateRoomWorkshop(privateWorkshop()).canonical,
      ),
    );
    expect(host.content.document).toEqual(privateWorkshop());
    await reject(a, { type: "ready" }, /verificar/);
    await reject(
      a,
      { type: "content-ready", hash: "0".repeat(64) },
      /no coincide/,
    );
    a.emit("action", { type: "content-ready", hash: host.content.hash });
    await reject(a, { type: "circuit", circuit: "aces" }, /fijada/);
    await reject(a, { type: "cup", cup: "risk" }, /partida única/);
    const guest = await admission(b, {
      type: "join",
      name: "Luis",
      code: host.session.code,
    });
    expect(guest.content).toEqual(host.content);
    const plain = await state(b, (s) => s.players.length === 2);
    expect(plain.courseOverride).toBeUndefined();
    expect(plain.custom).toBe(true);
    expect(plain.workshopHash).toBe(host.content.hash);
    expect(JSON.stringify(plain)).not.toContain("pieces");
    await reject(b, { type: "ready" }, /verificar/);
    b.emit("action", { type: "content-ready", hash: host.content.hash });
    let pending = state(a, (s) => s.players.every((p) => p.ready));
    a.emit("action", { type: "ready" });
    b.emit("action", { type: "ready" });
    await pending;
    pending = state(a, (s) => s.phase === "playing");
    a.emit("action", { type: "start" });
    await pending;
    await reject(b, { type: "shoot", angle: 0, power: 0.22 }, /turno/);
    pending = state(b, (s) => !s.moving && s.players[0].done);
    a.emit("action", {
      type: "shoot",
      angle: 0,
      power: 0.22,
      score: 999,
      courseOverride: {},
    });
    await pending;
    a.disconnect();
    back = await open();
    const resumed = await admission(back, {
      type: "resume",
      code: host.session.code,
      token: host.session.token,
    });
    expect(resumed.content).toEqual(host.content);
    await reject(back, { type: "shoot", angle: 0, power: 0.22 }, /verificar/);
    back.emit("action", { type: "content-ready", hash: host.content.hash });
    pending = state(b, (s) => s.phase === "finished");
    b.emit("action", { type: "shoot", angle: 0, power: 0.22 });
    const finished = await pending;
    expect(finished.practice).toBe(false);
    expect(finished.players.map((p) => p.scores)).toEqual([[1], [1]]);
    expect(finished.players.map((p) => p.penalties)).toEqual([0, 0]);
    expect(finished.workshopHash).toBe(host.content.hash);
    const owner = finished.host === host.session.id ? back : b;
    pending = state(
      b,
      (s) =>
        s.phase === "playing" && s.players.every((p) => p.scores.length === 0),
    );
    owner.emit("action", { type: "replay" });
    expect((await pending).workshopHash).toBe(host.content.hash);
  } finally {
    a.disconnect();
    b.disconnect();
    back?.disconnect();
  }
});
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
test("two browser friends play a workshop creation, recover its content after reload and replay without official records", async ({
  browser,
}) => {
  test.setTimeout(150000);
  const ca = await browser.newContext(),
    cb = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await Promise.all(
      [ca, cb].map((c) =>
        c.addInitScript(() => {
          localStorage.setItem("golf-graphics-mode", "low");
          localStorage.setItem("golf-hole-intro", "false");
        }),
      ),
    );
    const a = await ca.newPage(),
      b = await cb.newPage();
    const errors: string[] = [];
    for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
    await a.goto("/");
    await a
      .getByRole("button", { name: "Abrir taller de hoyos", exact: true })
      .click();
    await a
      .getByRole("button", { name: "Importar diseño", exact: true })
      .click();
    await a
      .getByRole("textbox", { name: "JSON del diseño", exact: true })
      .fill(exportWorkshop(privateWorkshop()));
    await a
      .getByRole("button", { name: "Abrir diseño importado", exact: true })
      .click();
    await a
      .getByRole("button", { name: "Jugar con amigos online", exact: true })
      .click();
    await expect(a.locator(".private-course-summary")).toContainText(
      "La cancha de Ana",
    );
    await a.getByRole("textbox", { name: "Tu nombre" }).fill("Ana");
    await a.getByRole("button", { name: /Duelo por puntos/ }).click();
    await a.getByRole("button", { name: /Crear sala/ }).click();
    await expect(a.getByTestId("room-code")).toHaveText(/^[A-F0-9]{6}$/);
    const code = await a.getByTestId("room-code").innerText();
    await b.goto(`/?room=${code}`);
    await b
      .getByRole("button", { name: "Jugar online con amigos", exact: true })
      .click();
    await b.getByRole("textbox", { name: "Tu nombre" }).fill("Luis");
    await b.getByRole("button", { name: /Unirme/ }).click();
    for (const p of [a, b]) {
      await expect(p.locator(".private-course-summary")).toContainText(
        "La cancha de Ana",
      );
      await expect(
        p.getByRole("button", { name: /Copa del Club/ }),
      ).toHaveCount(0);
      await p.getByRole("button", { name: "Estoy listo", exact: true }).click();
    }
    await a.getByRole("button", { name: /Comenzar partida/ }).click();
    await expect(b.locator(".hole-hud h2")).toContainText("La cancha de Ana");
    await a.screenshot({ path: "work/workshop-online-field.png" });
    await fire(a);
    await expect(
      b.getByText("Pelota en movimiento", { exact: true }),
    ).toBeVisible();
    await a.reload();
    await a
      .getByRole("button", { name: "Jugar online con amigos", exact: true })
      .click();
    await a
      .getByRole("button", { name: "Recuperar mi sesión", exact: true })
      .click();
    await expect(a.locator(".hole-hud h2")).toContainText("La cancha de Ana");
    await fire(b);
    for (const p of [a, b]) {
      await expect(
        p.getByRole("region", { name: "Podio del club" }),
      ).toBeVisible({ timeout: 20000 });
      await expect(p.locator(".points-cell b")).toHaveText(["6", "6"]);
      expect(
        await p.evaluate(() => localStorage.getItem("club-personal-normal-v7")),
      ).toBeNull();
      expect(
        await p.evaluate(() =>
          localStorage.getItem("club-personal-normal-v7-p2"),
        ),
      ).toBeNull();
    }
    await b.screenshot({ path: "work/workshop-online-mobile-results.png" });
    const owner = (await a.getByRole("button", { name: /La revancha/ }).count())
      ? a
      : b;
    await owner.getByRole("button", { name: /La revancha/ }).click();
    await expect(b.locator(".hole-hud h2")).toContainText("La cancha de Ana");
    expect(errors).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});

test("the public workshop room keeps current physics through real long drives, reconnect and replay", async () => {
  test.setTimeout(180000);
  let a = await open();
  const b = await open();
  let previous: Socket | undefined;
  try {
    const document = withWorkshopPhysics(longWorkshop(), 2),
      hash = await workshopFingerprint(
        validateRoomWorkshop(document).canonical,
      );
    const host = await admission(a, {
      type: "create",
      name: "Ana",
      workshop: document,
      physics: 1,
    });
    expect(host.content).toEqual({ document, hash });
    a.emit("action", { type: "content-ready", hash });
    const guest = await admission(b, {
      type: "join",
      name: "Luis",
      code: host.session.code,
    });
    expect(guest.content).toEqual(host.content);
    b.emit("action", { type: "content-ready", hash });
    let pending = state(a, (s) => s.players.every((p) => p.ready));
    a.emit("action", { type: "ready" });
    b.emit("action", { type: "ready" });
    await pending;
    pending = state(a, (s) => s.phase === "playing");
    a.emit("action", { type: "start", physics: 1 });
    expect((await pending).physics).toBe(2);
    for (const [index, socket] of [
      [0, a],
      [1, b],
    ] as const) {
      pending = state(b, (s) => !s.moving && s.players[index].strokes === 1);
      socket.emit("action", { type: "shoot", angle: 0, power: 1, physics: 1 });
      const settled = await pending;
      expect(settled.physics).toBe(2);
      expect(settled.players[index].pos.z).toBeLessThan(-12);
      expect(settled.players[index].penalties).toBe(0);
    }
    previous = a;
    previous.disconnect();
    a = await open();
    const resumed = await admission(a, {
      type: "resume",
      code: host.session.code,
      token: host.session.token,
    });
    expect(resumed.content).toEqual(host.content);
    a.emit("action", { type: "content-ready", hash });
    let result: State | undefined;
    for (const [index, socket] of [
      [0, a],
      [1, b],
    ] as const) {
      pending = state(b, (s) => !s.moving && s.players[index].done);
      socket.emit("action", {
        type: "shoot",
        angle: 0,
        power: 0.13,
        physics: 1,
      });
      result = await pending;
      expect(result.physics).toBe(2);
    }
    expect(result!.phase).toBe("finished");
    expect(result!.players.map((p) => p.scores)).toEqual([[2], [2]]);
    expect(result!.players.every((p) => p.penalties === 0)).toBe(true);
    pending = state(
      b,
      (s) =>
        s.phase === "playing" && s.players.every((p) => p.scores.length === 0),
    );
    (result!.host === host.session.id ? a : b).emit("action", {
      type: "replay",
    });
    expect((await pending).physics).toBe(2);
  } finally {
    a.disconnect();
    b.disconnect();
    previous?.disconnect();
  }
});

test("the public workshop room synchronizes format 3 mechanisms and completes both safe bridge routes", async () => {
  test.setTimeout(180000);
  const { workshopBlueprint } = await import("../../shared/workshopBlueprints"),
    { safeClock } = await import("../fixtures/blueprints");
  const a = await open(),
    b = await open();
  try {
    const document = workshopBlueprint("clock"),
      hash = await workshopFingerprint(
        validateRoomWorkshop(document).canonical,
      ),
      host = await admission(a, {
        type: "create",
        name: "Ana",
        workshop: document,
      });
    expect(host.content).toEqual({ document, hash });
    a.emit("action", { type: "content-ready", hash });
    const guest = await admission(b, {
      type: "join",
      name: "Luis",
      code: host.session.code,
    });
    expect(guest.content).toEqual(host.content);
    b.emit("action", { type: "content-ready", hash });
    let pending = state(
      a,
      (s) => s.players.length === 2 && s.players.every((p) => p.ready),
    );
    a.emit("action", { type: "ready" });
    b.emit("action", { type: "ready" });
    await pending;
    pending = state(a, (s) => s.phase === "playing");
    a.emit("action", { type: "start" });
    expect((await pending).physics).toBe(2);
    let result: State | undefined;
    for (const [stroke, [angle, power]] of safeClock.entries()) {
      for (const [index, socket] of [a, b].entries()) {
        pending = state(
          b,
          (s) =>
            !s.moving &&
            (stroke === safeClock.length - 1
              ? s.players[index].done
              : s.players[index].strokes === stroke + 1),
        );
        socket.emit("action", { type: "shoot", angle, power });
        result = await pending;
        expect(result.workshopHash).toBe(hash);
        expect(result.players[index].penalties).toBe(0);
      }
    }
    expect(result!.phase).toBe("finished");
    expect(result!.players.map((p) => p.scores)).toEqual([[4], [4]]);
  } finally {
    a.disconnect();
    b.disconnect();
  }
});
