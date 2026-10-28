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
  await page.getByRole("button", { name: /Comenzar recorrido/ }).click();
  await expect(page.getByText("Tu turno de golpear")).toBeVisible();
  await page.getByRole("slider", { name: "Potencia", exact: true }).fill("0.4");
  await page.getByRole("button", { name: /GOLPEAR/ }).click();
  await expect(page.getByText("Pelota en movimiento")).toBeVisible();
  await expect(page.locator(".turn-toast strong")).toHaveText("Golfista 2", {
    timeout: 25000,
  });
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
    a.emit("action", { type: "start" });
    await pending;
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
    await a.getByRole("button", { name: /Comenzar partida/ }).click();
    await expect(a.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
    await expect(b.getByRole("button", { name: /GOLPEAR/ })).toBeDisabled();
    await a.getByRole("button", { name: /GOLPEAR/ }).click();
    await expect(b.getByText("Pelota en movimiento")).toBeVisible();
  } finally {
    await ca.close();
    await cb.close();
  }
});
