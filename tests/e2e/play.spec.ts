import { test, expect } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
test("local game renders WebGL and executes a physical shot on desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.screenshot({ path: "work/home.png" });
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Añadir jugador/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByText("Tu turno de golpear")).toBeVisible();
  await page.getByRole("slider", { name: "Potencia", exact: true }).fill("0.4");
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(page.getByText("Pelota en movimiento")).toBeVisible();
  await expect(page.locator(".turn-toast strong")).toHaveText("Golfista 2", {
    timeout: 25000,
  });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-mode",
    "follow",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-focus-player",
    "1",
  );
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(page.getByRole("img", { name: /Mapa de/ })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar mapa", exact: true }).click();
  await page.getByRole("button", { name: "Ver campo", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-mode",
    "overview",
  );
  await page
    .getByRole("button", { name: "Seguir pelota", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-mode",
    "follow",
  );
  const fullscreen = page.getByRole("button", {
    name: "Pantalla completa",
    exact: true,
  });
  if (await fullscreen.isVisible()) {
    await fullscreen.click();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(true);
    await page
      .getByRole("button", { name: "Salir de pantalla completa", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(false);
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "work/desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeInViewport();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "work/mobile.png" });
  expect(errors).toEqual([]);
});
const waitEvent = (sock: Socket, event: string) =>
  new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(Error("Timeout " + event)), 6000);
    sock.once(event, (v) => {
      clearTimeout(t);
      resolve(v);
    });
  });
const waitState = (sock: Socket, predicate: (s: any) => boolean) =>
  new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      sock.off("state", listener);
      reject(Error("Expected state not received"));
    }, 6000);
    const listener = (state: any) => {
      if (predicate(state)) {
        clearTimeout(timer);
        sock.off("state", listener);
        resolve(state);
      }
    };
    sock.on("state", listener);
  });
test("two real online clients join, validate turn ownership and recover a session", async () => {
  const a = io("http://localhost:3001", { transports: ["websocket"] }),
    b = io("http://localhost:3001", { transports: ["websocket"] });
  let resumed: Socket | undefined;
  try {
    await Promise.all([waitEvent(a, "connect"), waitEvent(b, "connect")]);
    let pending = waitEvent(a, "session");
    a.emit("action", { type: "create", name: "Ada" });
    const sa = await pending;
    pending = waitEvent(b, "session");
    b.emit("action", { type: "join", name: "Beto", code: sa.code });
    const sb = await pending;
    pending = waitState(
      b,
      (s) => s.players.length === 2 && s.players.every((p: any) => p.ready),
    );
    a.emit("action", { type: "ready" });
    b.emit("action", { type: "ready" });
    await pending;
    pending = waitState(b, (s) => s.phase === "playing");
    a.emit("action", { type: "start", practice: true, hole: 17 });
    const playing = await pending;
    expect(playing.practice).toBe(false);
    expect(playing.hole).toBe(0);
    for (const type of ["pause", "practice"]) {
      const notice = waitEvent(a, "notice");
      a.emit("action", { type, hole: 17 });
      expect(await notice).toContain("desconocida");
    }
    const ticking = await waitState(b, (s) => s.time > playing.time + 0.15);
    expect(ticking.practice).toBe(false);
    expect(ticking.players[0].strokes).toBe(0);
    pending = waitEvent(b, "notice");
    b.emit("action", { type: "shoot", angle: 0, power: 0.5 });
    expect(await pending).toContain("rechazado");
    pending = waitState(b, (s) => s.moving);
    a.emit("action", { type: "shoot", angle: 0, power: 0.4 });
    const moving = await pending;
    expect(moving.moving).toBe(true);
    expect(moving.players[0].strokes).toBe(1);
    b.disconnect();
    resumed = io("http://localhost:3001", { transports: ["websocket"] });
    await waitEvent(resumed, "connect");
    pending = waitEvent(resumed, "session");
    resumed.emit("action", { type: "resume", code: sa.code, token: sb.token });
    expect((await pending).id).toBe(sb.id);
    const state = await waitEvent(resumed, "state");
    expect(state.players).toHaveLength(2);
    expect(state.players[1].connected).toBe(true);
    expect(JSON.stringify(state)).not.toContain(sb.token);
  } finally {
    a.disconnect();
    b.disconnect();
    resumed?.disconnect();
  }
});
test("online lobby works across two browser contexts", async ({ browser }) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  try {
    const a = await ca.newPage(),
      b = await cb.newPage();
    await a.addInitScript(() =>
      localStorage.setItem("golf-control-mode", "pulse"),
    );
    await a.goto("/");
    await a.getByRole("button", { name: /Jugar online/ }).click();
    await a.getByRole("textbox", { name: "Tu nombre" }).fill("Ana");
    await a.getByRole("button", { name: /Crear sala/ }).click();
    await expect(a.getByTestId("room-code")).toHaveText(/^[A-F0-9]{6}$/);
    const code = await a.getByTestId("room-code").innerText();
    await b.goto("/?room=" + code);
    await b.getByRole("button", { name: /Jugar online/ }).click();
    await b.getByRole("textbox", { name: "Tu nombre" }).fill("Luis");
    await b.getByRole("button", { name: /Unirme/ }).click();
    await a.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await b.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await expect(
      a.getByRole("button", { name: /Comenzar partida/ }),
    ).toBeEnabled();
    await a.getByRole("button", { name: /Riviera Salvaje/ }).click();
    await expect(
      a.getByRole("button", { name: /Comenzar partida/ }),
    ).toBeDisabled();
    await expect(
      b.getByRole("button", { name: /Riviera Salvaje/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      b.getByRole("button", { name: /Club del atardecer/ }),
    ).toBeDisabled();
    await a.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await b.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await a.getByRole("button", { name: /Comenzar partida/ }).click();
    await expect(a.locator(".locked-control")).toContainText("Clásico");
    await expect(a.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    await expect(b.getByRole("button", { name: /GOLPEAR/ })).toBeDisabled();
    await a.getByRole("button", { name: /GOLPEAR/ }).click();
    await expect(b.getByText("Pelota en movimiento")).toBeVisible();
    await expect(
      b.getByRole("heading", { name: /Las dos orillas/ }),
    ).toBeVisible();
    await a.getByRole("button", { name: "Salir", exact: true }).click();
    await expect(b.locator(".turn-toast strong")).toHaveText("Luis");
    await expect(b.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    await expect(b.locator(".leaderboard")).toContainText("Ana · retirado");
    expect(
      await a.evaluate(() => sessionStorage.getItem("golf-session")),
    ).toBeNull();
  } finally {
    await ca.close();
    await cb.close();
  }
});

const openClient = async () => {
  const socket = io("http://localhost:3001", { transports: ["websocket"] });
  await waitEvent(socket, "connect");
  return socket;
};
const enter = async (socket: Socket, data: Record<string, unknown>) => {
  const pending = waitEvent(socket, "session");
  socket.emit("action", data);
  return await pending;
};
test("lobby departures revoke tokens, guest permissions hold, and host can remove a disconnected guest", async () => {
  const sockets: Socket[] = [];
  try {
    const a = await openClient(),
      b = await openClient(),
      c = await openClient();
    sockets.push(a, b, c);
    const sa = await enter(a, {
        type: "create",
        name: "Ana",
        circuit: "moonlight",
      }),
      sb = await enter(b, { type: "join", name: "Beto", code: sa.code });
    const sc = await enter(c, { type: "join", name: "Cris", code: sa.code });
    let pending = waitEvent(b, "notice");
    b.emit("action", { type: "circuit", circuit: "sunset" });
    expect(await pending).toContain("anfitrión");
    pending = waitState(a, (s) => s.players.length === 2);
    await new Promise<void>((resolve) =>
      c.emit("action", { type: "leave" }, resolve),
    );
    await pending;
    pending = waitEvent(c, "notice");
    c.emit("action", { type: "resume", code: sa.code, token: sc.token });
    expect(await pending).toBe("Sesión no válida");
    const c2 = await enter(c, {
      type: "join",
      name: "Cris de nuevo",
      code: sa.code,
    });
    pending = waitState(a, (s) =>
      s.players.some((p: any) => p.id === c2.id && !p.connected),
    );
    c.disconnect();
    await pending;
    pending = waitState(b, (s) => s.players.length === 2);
    a.emit("action", { type: "remove", id: c2.id });
    await pending;
    pending = waitState(a, (s) => s.players.every((p: any) => p.ready));
    a.emit("action", { type: "ready" });
    b.emit("action", { type: "ready" });
    await pending;
    pending = waitState(b, (s) => s.phase === "playing");
    a.emit("action", { type: "start" });
    const state = await pending;
    expect(state.circuit).toBe("moonlight");
    expect(state.players.map((p: any) => p.id)).toEqual([sa.id, sb.id]);
    a.disconnect();
    b.disconnect();
    const returning = await openClient();
    sockets.push(returning);
    await enter(returning, { type: "resume", code: sa.code, token: sa.token });
    const recovered = await waitState(returning, (s) =>
      s.players.some((p: any) => p.id === sa.id && p.connected),
    );
    expect(recovered.host).toBe(sa.id);
  } finally {
    sockets.forEach((s) => s.disconnect());
  }
});
test("eight real clients fit a private room and a ninth is rejected", async () => {
  const sockets: Socket[] = [];
  try {
    const host = await openClient();
    sockets.push(host);
    const session = await enter(host, { type: "create", name: "Host" });
    for (let i = 1; i < 8; i++) {
      const s = await openClient();
      sockets.push(s);
      await enter(s, { type: "join", code: session.code, name: "Player " + i });
    }
    const ninth = await openClient();
    sockets.push(ninth);
    let pending = waitEvent(ninth, "notice");
    ninth.emit("action", { type: "join", code: session.code, name: "Ninth" });
    expect(await pending).toBe("Sala llena");
    pending = waitState(
      host,
      (s) => s.players.length === 8 && s.players.every((p: any) => p.ready),
    );
    for (const s of sockets.slice(0, 8)) s.emit("action", { type: "ready" });
    await pending;
    pending = waitState(host, (s) => s.phase === "playing");
    host.emit("action", { type: "start" });
    expect((await pending).players).toHaveLength(8);
  } finally {
    sockets.forEach((s) => s.disconnect());
  }
});
test("touch aiming never shoots accidentally and the lunar circuit works with corrupt recovery storage", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(() =>
      sessionStorage.setItem("golf-session", "{broken"),
    );
    await page.goto("/");
    await page.getByRole("button", { name: /Jardín lunar/ }).tap();
    await page.getByRole("button", { name: /Jugar en este/ }).tap();
    await page.getByRole("button", { name: /Comenzar recorrido/ }).tap();
    await expect(
      page.getByRole("heading", { name: /Las diagonales/ }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    await expect(page.locator(".turn-intro")).toHaveCount(0);
    await page.waitForTimeout(300);
    await page.touchscreen.tap(220, 400);
    await expect(
      page.getByRole("slider", { name: "Ángulo", exact: true }),
    ).not.toHaveValue("0");
    await expect(page.locator(".turn-toast b")).toHaveText("0/12");
    await page.getByRole("button", { name: /GOLPEAR/ }).tap();
    await expect(page.getByText("Pelota en movimiento")).toBeVisible();
    await page.screenshot({ path: "work/lunar-mobile.png" });
  } finally {
    await context.close();
  }
});

test("only normal shots are accepted and synchronized across real clients", async () => {
  const a = await openClient(),
    b = await openClient();
  try {
    const sa = await enter(a, {
      type: "create",
      name: "Ana",
      circuit: "riviera",
    });
    expect(sa.protocol).toBe(5);
    await enter(b, { type: "join", name: "Luis", code: sa.code });
    let pending = waitState(a, (s) => s.players.every((p: any) => p.ready));
    a.emit("action", { type: "ready" });
    b.emit("action", { type: "ready" });
    await pending;
    pending = waitState(b, (s) => s.phase === "playing");
    a.emit("action", { type: "start" });
    await pending;
    pending = waitEvent(a, "notice");
    a.emit("action", { type: "shoot", angle: 0, power: 0.7, style: "rocket" });
    expect(await pending).toContain("rechazado");
    pending = waitEvent(a, "notice");
    a.emit("action", { type: "shoot", angle: 0, power: 0.7, style: "chip" });
    expect(await pending).toContain("rechazado");
    pending = waitState(b, (s) => s.moving && s.players[0].strokes === 1);
    a.emit("action", { type: "shoot", angle: 0, power: 0.7 });
    const moving = await pending;
    expect(moving.players[0].pos.y).toBeLessThan(0.3);
    await new Promise<void>((resolve, reject) =>
      a
        .timeout(3000)
        .emit("action", { type: "ping" }, (error: Error | null) =>
          error ? reject(error) : resolve(),
        ),
    );
  } finally {
    a.disconnect();
    b.disconnect();
  }
});

test("dragging adjusts aim and power without firing; fine adjustments use only the normal shot", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Riviera Salvaje/ }).click();
  await page.getByRole("button", { name: /Jugar en este/ }).click();
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
  const angle = page.getByRole("slider", { name: "Ángulo", exact: true }),
    power = page.getByRole("slider", { name: "Potencia", exact: true });
  await page.mouse.move(650, 320);
  await page.mouse.down();
  await page.mouse.move(700, 280, { steps: 8 });
  await page.mouse.up();
  await expect(power).not.toHaveValue("0.55");
  await expect(page.locator(".turn-toast b")).toHaveText("0/12");
  await expect(
    page.getByRole("button", { name: "Elevado", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Control del tiro" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Más ajustes", exact: true }).click();
  await page.getByRole("button", { name: "25%", exact: true }).click();
  await expect(power).toHaveValue("0.25");
  const before = Number(await angle.inputValue());
  await page
    .getByRole("button", {
      name: "Girar medio grado a la derecha",
      exact: true,
    })
    .click();
  expect(Number(await angle.inputValue()) - before).toBeCloseTo(
    Math.PI / 360,
    4,
  );
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(page.getByText("Pelota en movimiento")).toBeVisible();
});
