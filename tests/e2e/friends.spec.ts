import { test, expect } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import type { State } from "../../shared/game";
import { NETWORK_PROTOCOL } from "../../shared/rules";
import { confirmedPoints } from "../../shared/competition";
import { aceShots } from "../fixtures/aces";
import { skyBridgeShots } from "../fixtures/sky";
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
  // Two software-rendered worlds should not turn a networking check into a
  // shadow-rendering stress test. High quality has its own browser coverage.
  await Promise.all(
    [ca, cb].map((context) =>
      context.addInitScript(() =>
        localStorage.setItem("golf-graphics-mode", "low"),
      ),
    ),
  );
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
    await expect(b.getByTestId("room-code")).toHaveText(code);
    await expect(a.locator(".players")).toContainText("Luis");
    await a.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await expect(
      a.getByRole("button", { name: "Cancelar preparado", exact: true }),
    ).toBeVisible();
    await b.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await expect(
      b.getByRole("button", { name: "Cancelar preparado", exact: true }),
    ).toBeVisible();
    await expect(
      a.getByRole("button", { name: /Comenzar partida/ }),
    ).toBeEnabled();
    await a.getByRole("button", { name: /Menos golpes/ }).click();
    await expect(
      b.getByRole("button", { name: "Estoy listo", exact: true }),
    ).toBeVisible();
    await a.getByRole("button", { name: /Duelo por puntos/ }).click();
    await expect(
      b.getByRole("button", { name: /Duelo por puntos/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      a.getByRole("button", { name: "Estoy listo", exact: true }),
    ).toBeVisible();
    await expect(
      b.getByRole("button", { name: "Estoy listo", exact: true }),
    ).toBeVisible();
    await a.screenshot({
      path: "work/friends-online-lobby.png",
      fullPage: true,
    });
    await a.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await b.getByRole("button", { name: "Estoy listo", exact: true }).click();
    await a.getByRole("button", { name: /Comenzar partida/ }).click();
    for (const page of [a, b]) {
      await expect(page.getByRole("button", { name: /GOLPEAR/ })).toBeEnabled({
        timeout: 15000,
      });
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
test("the public sky circuit shares the real bridge shortcut and scores between two clients", async () => {
  const a = await open(),
    b = await open();
  try {
    const host = await enter(a, {
      type: "create",
      name: "Ana",
      circuit: "skyruins",
      format: "stableford",
    });
    await enter(b, { type: "join", name: "Luis", code: host.code });
    await ready(a, b);
    let update = state(a, (s) => s.phase === "playing");
    a.emit("action", { type: "start" });
    await update;
    for (let shot = 0; shot < 2; shot++)
      for (const [index, socket] of [a, b].entries()) {
        const [angle, power] = skyBridgeShots[shot];
        update = state(
          a,
          (s) =>
            !s.moving &&
            (shot === 0
              ? s.players[index].strokes === 1
              : s.players[index].done),
        );
        socket.emit("action", { type: "shoot", angle, power });
        await update;
      }
    const scores = await state(b, (s) => s.phase === "scores");
    expect(scores.circuit).toBe("skyruins");
    expect(scores.players.map((p) => p.scores)).toEqual([[2], [2]]);
    expect(scores.players.map((p) => p.penalties)).toEqual([0, 0]);
    expect(scores.players.map((p) => confirmedPoints(p, scores))).toEqual([
      4, 4,
    ]);
  } finally {
    a.disconnect();
    b.disconnect();
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

test("a real friend cup keeps authoritative totals, recovery and rematch across its complete series", async () => {
  test.setTimeout(180000);
  const sockets: Socket[] = [];
  const a = await open(),
    b = await open();
  sockets.push(a, b);
  const send = async (
    socket: Socket,
    action: Record<string, unknown>,
    accepts: (s: State) => boolean,
  ) => {
    // Respect the same per-socket action budget as human clients.
    await new Promise((resolve) => setTimeout(resolve, 150));
    const update = state(socket, accepts);
    socket.emit("action", action);
    return update.catch((error) => {
      throw new Error(`No llegó estado después de ${action.type}`, {
        cause: error,
      });
    });
  };
  const rejected = async (socket: Socket, action: Record<string, unknown>) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const response = event<string>(socket, "notice");
    socket.emit("action", action);
    return response;
  };
  try {
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
    let current = await send(
      a,
      { type: "cup", cup: "risk" },
      (s) => s.cup?.plan === "risk",
    );
    expect(current.cup?.phase).toBe("setup");
    expect(await rejected(b, { type: "cup", cup: "club" })).toContain(
      "anfitrión",
    );
    expect(await rejected(a, { type: "cup", cup: "bad" })).toContain(
      "inválida",
    );
    await ready(a, b);
    current = await send(a, { type: "start" }, (s) => s.phase === "playing");
    expect(current.cup).toMatchObject({
      phase: "playing",
      format: "stableford",
      round: 0,
    });
    expect(await rejected(a, { type: "circuit", circuit: "park" })).toContain(
      "fijado",
    );
    expect(await rejected(a, { type: "cup", cup: "club" })).toContain("sala");
    expect(await rejected(b, { type: "concede" })).toContain("Solo puedes");
    expect(await rejected(b, { type: "cup-score", score: -100 })).toContain(
      "desconocida",
    );
    const shot = aceShots[0];
    current = await send(
      a,
      { type: "shoot", angle: shot.angle, power: shot.power },
      (s) => s.players[0].done && !s.moving,
    );
    expect(current.players[0].strokes).toBe(1);
    async function finishRound(guestSocket: Socket) {
      while (current.phase !== "finished") {
        if (current.phase === "scores") {
          const hole = current.hole;
          current = await send(
            a,
            { type: "next" },
            (s) => s.phase === "playing" && s.hole === hole + 1,
          );
        } else {
          const active = current.players[current.turn].id,
            turn = current.turn;
          current = await send(
            active === host.id ? a : guestSocket,
            { type: "concede" },
            (s) => s.phase !== "playing" || s.turn !== turn,
          );
        }
      }
    }
    await finishRound(b);
    expect(current.cup?.rounds).toHaveLength(1);
    expect(current.cup?.phase).toBe("playing");
    const first = structuredClone(current.cup!.rounds[0]);
    expect(await rejected(a, { type: "replay" })).toContain("Termina la copa");
    expect(await rejected(a, { type: "lobby" })).toContain("Termina la copa");
    const lost = state(a, (s) => !s.players[1].connected);
    b.disconnect();
    await lost;
    const recovered = await open();
    sockets.push(recovered);
    const back = await enter(recovered, {
      type: "resume",
      code: host.code,
      token: guest.token,
    });
    expect(back.id).toBe(guest.id);
    current = await state(recovered, (s) => s.players[1].connected);
    expect(current.cup!.rounds[0]).toEqual(first);
    expect(await rejected(recovered, { type: "cup-next" })).toContain(
      "anfitrión",
    );
    current = await send(
      a,
      { type: "cup-next" },
      (s) => s.cup?.round === 1 && s.phase === "playing",
    );
    expect(current.circuit).toBe("skyruins");
    expect(await rejected(a, { type: "cup-next" })).toContain(
      "Termina la vuelta",
    );
    await finishRound(recovered);
    expect(current.cup?.phase).toBe("finished");
    expect(current.cup!.rounds).toHaveLength(2);
    const totals = current.cup!.entrants.map((p) => ({
      id: p.id,
      strokes: current.cup!.rounds.reduce(
        (n, r) => n + (r.players.find((v) => v.id === p.id)?.strokes || 0),
        0,
      ),
      points: current.cup!.rounds.reduce(
        (n, r) => n + (r.players.find((v) => v.id === p.id)?.points || 0),
        0,
      ),
    }));
    expect(totals).toEqual([
      { id: host.id, strokes: 61, points: 4 },
      { id: guest.id, strokes: 72, points: 0 },
    ]);
    const firstFinal = structuredClone(current.cup);
    current = await send(
      a,
      { type: "replay" },
      (s) => s.phase === "playing" && s.cup?.round === 0,
    );
    expect(current.cup!.rounds).toEqual([]);
    await finishRound(recovered);
    current = await send(
      a,
      { type: "cup-next" },
      (s) => s.phase === "playing" && s.cup?.round === 1,
    );
    await finishRound(recovered);
    expect(current.cup!.rounds).toHaveLength(2);
    expect(firstFinal!.rounds[0]).toEqual(first);
    current = await send(a, { type: "lobby" }, (s) => s.phase === "lobby");
    expect(current.cup?.phase).toBe("setup");
    expect(current.players.every((p) => !p.ready)).toBe(true);
    current = await send(a, { type: "cup", cup: "single" }, (s) => !s.cup);
    expect(current.phase).toBe("lobby");
  } finally {
    sockets.forEach((s) => s.disconnect());
  }
});

test("cup recovery expires between rounds without blocking the surviving friend", async () => {
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, "127.0.0.1", r));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((r, j) => probe.close((e) => (e ? j(e) : r())));
  const child = spawn(process.execPath, ["--import", "tsx", "server/dev.ts"], {
    env: { ...process.env, PORT: String(port), DISCONNECT_GRACE_SECONDS: "1" },
    stdio: "ignore",
  });
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
        format: "stableford",
      }),
      guest = await enter(b, { type: "join", code: host.code, name: "Luis" });
    const send = async (
      socket: Socket,
      action: Record<string, unknown>,
      accepts: (s: State) => boolean,
    ) => {
      const update = state(socket, accepts);
      socket.emit("action", action);
      return update;
    };
    await send(
      a,
      { type: "cup", cup: "risk" },
      (s) => s.cup?.phase === "setup",
    );
    await ready(a, b);
    let current = await send(
      a,
      { type: "start" },
      (s) => s.phase === "playing",
    );
    while (current.phase !== "finished") {
      if (current.phase === "scores") {
        const h = current.hole;
        current = await send(
          a,
          { type: "next" },
          (s) => s.phase === "playing" && s.hole === h + 1,
        );
      } else {
        const t = current.turn;
        current = await send(
          current.players[t].id === host.id ? a : b,
          { type: "concede" },
          (s) => s.phase !== "playing" || s.turn !== t,
        );
      }
    }
    expect(current.cup!.rounds).toHaveLength(1);
    const retired = state(a, (s) =>
      Boolean(s.cup?.entrants.find((p) => p.id === guest.id)?.withdrawn),
    );
    b.disconnect();
    current = await retired;
    expect(current.phase).toBe("finished");
    expect(current.cup?.phase).toBe("playing");
    const late = await open(`http://localhost:${port}`);
    sockets.push(late);
    const rejected = event<string>(late, "notice");
    late.emit("action", {
      type: "resume",
      code: host.code,
      token: guest.token,
    });
    expect(await rejected).toBe("Sesión no válida");
    current = await send(
      a,
      { type: "cup-next" },
      (s) => s.phase === "playing" && s.cup?.round === 1,
    );
    expect(current.players.map((p) => p.id)).toEqual([host.id]);
    expect(current.format).toBe("stableford");
    while (current.phase !== "finished") {
      if (current.phase === "scores") {
        const h = current.hole;
        current = await send(
          a,
          { type: "next" },
          (s) => s.phase === "playing" && s.hole === h + 1,
        );
      } else {
        current = await send(
          a,
          { type: "concede" },
          (s) => s.phase !== "playing",
        );
      }
    }
    expect(current.cup!.phase).toBe("finished");
    expect(current.cup!.rounds).toHaveLength(2);
    expect(current.cup!.rounds[1].players.map((p) => p.id)).toEqual([host.id]);
  } finally {
    sockets.forEach((s) => s.disconnect());
    child.kill();
  }
});
