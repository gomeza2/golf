import { test, expect } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import type { State } from "../../shared/game";
import { NETWORK_PROTOCOL } from "../../shared/rules";
import { confirmedPoints } from "../../shared/competition";
import { aceShots } from "../fixtures/aces";
function event<T = any>(
  socket: Socket,
  name: string,
  accepts: (value: T) => boolean = () => true,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const done = (value: T) => {
      if (!accepts(value)) return;
      clearTimeout(timer);
      socket.off(name, done);
      resolve(value);
    };
    const timer = setTimeout(() => {
      socket.off(name, done);
      reject(Error(`Timeout waiting for ${name}`));
    }, 12000);
    socket.on(name, done);
  });
}
const state = (socket: Socket, accepts: (value: State) => boolean) =>
  event<State>(socket, "state", accepts);
async function open(
  endpoint = process.env.PUBLIC_ONLINE_URL || "http://localhost:3001",
) {
  const socket = io(endpoint, { transports: ["websocket"] });
  await event(socket, "connect");
  return socket;
}
async function enter(socket: Socket, action: Record<string, unknown>) {
  const response = event<{
    id: string;
    token: string;
    code: string;
    protocol: number;
  }>(socket, "session");
  socket.emit("action", action);
  return response;
}
async function ready(a: Socket, b: Socket) {
  const response = state(
    a,
    (s) => s.players.length === 2 && s.players.every((p) => p.ready),
  );
  a.emit("action", { type: "ready" });
  b.emit("action", { type: "ready" });
  await response;
}
test("the server owns format, permissions, readiness and real points through a completed online hole", async () => {
  const a = await open(),
    b = await open();
  let resumed: Socket | undefined;
  try {
    const host = await enter(a, {
      type: "create",
      name: "Ana",
      circuit: "aces",
      format: "stableford",
    });
    expect(host.protocol).toBe(NETWORK_PROTOCOL);
    const guest = await enter(b, {
      type: "join",
      name: "Luis",
      code: host.code,
    });
    let response = event<string>(b, "notice");
    b.emit("action", { type: "format", format: "strokes" });
    expect(await response).toContain("anfitrión");
    await ready(a, b);
    let update = state(
      a,
      (s) => s.format === "strokes" && s.players.every((p) => !p.ready),
    );
    a.emit("action", { type: "format", format: "strokes" });
    await update;
    update = state(a, (s) => s.format === "stableford");
    a.emit("action", { type: "format", format: "stableford" });
    await update;
    await ready(a, b);
    update = state(a, (s) => s.phase === "playing");
    a.emit("action", { type: "start", format: "strokes" });
    expect((await update).format).toBe("stableford");
    response = event<string>(a, "notice");
    a.emit("action", { type: "format", format: "strokes" });
    expect(await response).toContain("antes de comenzar");
    const shot = aceShots[0];
    update = state(b, (s) => s.players[0].done && s.turn === 1);
    a.emit("action", { type: "shoot", angle: shot.angle, power: shot.power });
    const first = await update;
    expect(confirmedPoints(first.players[0], first)).toBe(4);
    update = state(a, (s) => s.phase === "scores");
    b.emit("action", { type: "shoot", angle: shot.angle, power: shot.power });
    const scores = await update;
    expect(scores.players.map((p) => confirmedPoints(p, scores))).toEqual([
      4, 4,
    ]);
    update = state(a, (s) => s.phase === "playing" && s.hole === 1);
    a.emit("action", { type: "next" });
    await update;
    b.disconnect();
    resumed = await open();
    expect(
      (
        await enter(resumed, {
          type: "resume",
          code: host.code,
          token: guest.token,
        })
      ).id,
    ).toBe(guest.id);
    const recovered = await state(resumed, (s) => s.players[1].connected);
    expect(recovered.format).toBe("stableford");
    expect(recovered.players[0].scores).toEqual([1]);
  } finally {
    a.disconnect();
    b.disconnect();
    resumed?.disconnect();
  }
});
test("two browser players share lobby rules, see real rival shots and receive the same points", async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    cb = await browser.newContext();
  try {
    const a = await ca.newPage(),
      b = await cb.newPage();
    await a.goto(process.env.PUBLIC_ONLINE_URL || "/");
    await a.getByRole("button", { name: /Club del As/ }).click();
    await a.getByRole("button", { name: /Jugar online/ }).click();
    await a.getByRole("textbox", { name: "Tu nombre" }).fill("Ana");
    await a.getByRole("button", { name: /Duelo por puntos/ }).click();
    await a.getByRole("button", { name: /Crear sala/ }).click();
    await expect(a.getByTestId("room-code")).toHaveText(/^[A-F0-9]{6}$/);
    const code = await a.getByTestId("room-code").innerText();
    await b.goto(
      process.env.PUBLIC_ONLINE_URL
        ? `${process.env.PUBLIC_ONLINE_URL}/?room=${code}`
        : `/?room=${code}`,
    );
    await b.getByRole("button", { name: /Jugar online/ }).click();
    await b.getByRole("textbox", { name: "Tu nombre" }).fill("Luis");
    await b.getByRole("button", { name: /Unirme/ }).click();
    await expect(
      b.getByRole("button", { name: /Duelo por puntos/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      b.getByRole("button", { name: /Menos golpes/ }),
    ).toBeDisabled();
    await a.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await b.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await expect(
      a.getByRole("button", { name: /Comenzar partida/ }),
    ).toBeEnabled();
    await a.getByRole("button", { name: /Menos golpes/ }).click();
    await expect(
      b.getByRole("button", { name: "Estoy listo", exact: true }),
    ).toBeVisible();
    await a.getByRole("button", { name: /Duelo por puntos/ }).click();
    await a.screenshot({
      path: "work/friends-online-lobby.png",
      fullPage: true,
    });
    await a.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await b.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await a.getByRole("button", { name: /Comenzar partida/ }).click();
    for (const page of [a, b]) {
      await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled();
      await page
        .getByRole("slider", { name: "Ángulo", exact: true })
        .fill(String(Number(aceShots[0].angle.toFixed(10))));
      await page
        .getByRole("slider", { name: "Potencia", exact: true })
        .fill(String(aceShots[0].power));
      await page.getByRole("button", { name: /GOLPEAR/ }).click();
      const observer = page === a ? b : a;
      await expect(
        observer.getByText("Pelota en movimiento", { exact: true }),
      ).toBeVisible();
      await expect(
        observer.getByText("Pelota en movimiento", { exact: true }),
      ).toBeHidden({ timeout: 25000 });
    }
    for (const page of [a, b]) {
      await expect(
        page.getByRole("heading", { name: "Cada hoyo suma.", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".points-cell b")).toHaveText(["4", "4"]);
      await expect(page.locator(".points-cell small")).toHaveText([
        "1 golpe",
        "1 golpe",
      ]);
    }
    await a.screenshot({ path: "work/friends-online-scores.png" });
  } finally {
    await ca.close();
    await cb.close();
  }
});
test("an expired disconnect retires once, revokes recovery and lets the remaining friend finish", async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const address = probe.address();
  if (!address || typeof address === "string") throw Error("No test port");
  const port = address.port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      env: {
        ...process.env,
        PORT: String(port),
        DISCONNECT_GRACE_SECONDS: "1",
      },
      stdio: "ignore",
    },
  );
  const sockets: Socket[] = [];
  try {
    await expect
      .poll(
        async () => {
          try {
            return (
              await (await fetch(`http://localhost:${port}/health`)).json()
            ).disconnectGraceSeconds;
          } catch {
            return 0;
          }
        },
        { timeout: 15000 },
      )
      .toBe(1);
    const a = await open(`http://localhost:${port}`),
      b = await open(`http://localhost:${port}`);
    sockets.push(a, b);
    const host = await enter(a, {
      type: "create",
      name: "Ana",
      circuit: "aces",
      format: "stableford",
    });
    const guest = await enter(b, {
      type: "join",
      name: "Luis",
      code: host.code,
    });
    await ready(a, b);
    let update = state(a, (s) => s.phase === "playing");
    a.emit("action", { type: "start" });
    await update;
    update = state(a, (s) => s.players[1].withdrawn);
    b.disconnect();
    const retired = await update;
    expect(retired.turn).toBe(0);
    expect(retired.players[1].strokes).toBe(12);
    const late = await open(`http://localhost:${port}`);
    sockets.push(late);
    const notice = event<string>(late, "notice");
    late.emit("action", {
      type: "resume",
      code: host.code,
      token: guest.token,
    });
    expect(await notice).toBe("Sesión no válida");
    update = state(a, (s) => s.phase === "scores");
    a.emit("action", {
      type: "shoot",
      angle: aceShots[0].angle,
      power: aceShots[0].power,
    });
    const scores = await update;
    expect(scores.players.map((p) => confirmedPoints(p, scores))).toEqual([
      4, 0,
    ]);
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    child.kill();
  }
});
