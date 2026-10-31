import { RULES_VERSION, NETWORK_PROTOCOL } from "../shared/rules";
import { isMatchFormat } from "../shared/scoring";
import { reconnectGrace, shouldWithdraw } from "./disconnections";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { randomBytes } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { gzip as gzipCallback } from "node:zlib";
import { promisify } from "node:util";
const gzip = promisify(gzipCallback);
import { Game, initPhysics, canStart } from "../shared/game";
import { FixedStepper } from "../shared/timing";
import { isCircuitId } from "../shared/courses";
await initPhysics();
const version = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
).version;
const disconnectGraceSeconds = reconnectGrace(
  process.env.DISCONNECT_GRACE_SECONDS,
);
const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const http = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        ok: true,
        protocol: NETWORK_PROTOCOL,
        rules: RULES_VERSION,
        version,
        commit: process.env.RENDER_GIT_COMMIT || process.env.APP_COMMIT || null,
        formats: ["strokes", "stableford"],
        disconnectGraceSeconds,
        rooms: rooms.size,
        maxPlayers: capacity,
      }),
    );
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url || "/", "http://localhost").pathname,
    );
    const root = resolve("dist");
    let path = resolve(root, "." + pathname);
    if (!path.startsWith(root + "/") && path !== root) throw Error();
    if (!extname(path)) path = resolve(root, "index.html");
    let data = await readFile(path);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Cache-Control",
      pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    );
    if (
      data.length > 1024 &&
      req.headers["accept-encoding"]?.includes("gzip")
    ) {
      data = await gzip(data);
      res.setHeader("Content-Encoding", "gzip");
    }
    res.setHeader("Vary", "Accept-Encoding");
    res.setHeader(
      "Content-Type",
      (
        {
          html: "text/html",
          js: "text/javascript",
          css: "text/css",
          wasm: "application/wasm",
        } as Record<string, string>
      )[extname(path).slice(1)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
const io = new Server(http, {
  maxHttpBufferSize: 2048,
  cors: { origin: origins },
  allowRequest: (req, cb) =>
    cb(
      null,
      !req.headers.origin ||
        origins.includes(req.headers.origin) ||
        req.headers.origin === `https://${req.headers.host}` ||
        req.headers.origin === `http://${req.headers.host}`,
    ),
});
type Room = {
  game: Game;
  tokens: Map<string, string>;
  sockets: Map<string, string>;
  touched: number;
  disconnectedAt: Map<string, number>;
};
const rooms = new Map<string, Room>();
function revokePlayer(room: Room, id: string) {
  room.disconnectedAt.delete(id);
  for (const [token, owner] of room.tokens)
    if (owner === id) room.tokens.delete(token);
}
const capacity = Math.max(
  2,
  Math.min(8, Math.floor(Number(process.env.MAX_PLAYERS)) || 8),
);
const snapshot = (r: Room) => r.game.state;
const fail = (socket: Socket, message: string) =>
  socket.emit("notice", message);
io.on("connection", (socket) => {
  let room: Room | undefined;
  let pid = "";
  let bucket = 20;
  const refill = setInterval(() => (bucket = Math.min(20, bucket + 10)), 1000);
  socket.on("action", (data: unknown, ack?: () => void) => {
    if (--bucket < 0) return;
    if (!data || typeof data !== "object") return;
    const d = data as Record<string, unknown>;
    try {
      if (d.type === "create" || d.type === "join" || d.type === "resume") {
        if (room) throw Error("Ya estás en una sala");
        if (d.type === "create") {
          if (rooms.size >= 200) throw Error("Servidor ocupado");
          let code = "";
          do {
            code = randomBytes(3).toString("hex").toUpperCase();
          } while (rooms.has(code));
          if (d.circuit !== undefined && !isCircuitId(d.circuit))
            throw Error("Recorrido inválido");
          if (d.format !== undefined && !isMatchFormat(d.format))
            throw Error("Formato de partida inválido");
          const game = new Game();
          if (isCircuitId(d.circuit)) game.selectCircuit(d.circuit);
          if (isMatchFormat(d.format)) game.selectFormat(d.format);
          game.state.code = code;
          room = {
            game,
            tokens: new Map(),
            sockets: new Map(),
            touched: Date.now(),
            disconnectedAt: new Map(),
          };
          rooms.set(code, room);
        } else {
          if (typeof d.code !== "string" || !/^[A-F0-9]{6}$/.test(d.code))
            throw Error("Código inválido");
          room = rooms.get(d.code);
          if (!room) throw Error("Sala inexistente o caducada");
        }
        const candidate = room;
        try {
          if (d.type === "resume") {
            if (typeof d.token !== "string" || !candidate.tokens.has(d.token))
              throw Error("Sesión no válida");
            pid = candidate.tokens.get(d.token)!;
            const returning = candidate.game.state.players.find(
              (p) => p.id === pid,
            );
            if (!returning || returning.withdrawn)
              throw Error("Sesión no válida");
            const old = candidate.sockets.get(pid);
            if (old) io.sockets.sockets.get(old)?.disconnect(true);
            returning.connected = true;
            candidate.disconnectedAt.delete(pid);
            if (
              !candidate.game.state.players.some(
                (p) => p.id === candidate.game.state.host && p.connected,
              )
            )
              candidate.game.state.host = pid;
          } else {
            if (candidate.game.state.players.length >= capacity)
              throw Error("Sala llena");
            if (typeof d.name !== "string" || !d.name.trim())
              throw Error("Escribe tu nombre");
            pid = randomBytes(8).toString("hex");
            candidate.game.add(pid, d.name);
            d.token = randomBytes(24).toString("hex");
            candidate.tokens.set(d.token as string, pid);
          }
          candidate.sockets.set(pid, socket.id);
          socket.join(candidate.game.state.code);
          socket.emit("session", {
            id: pid,
            token: d.token,
            code: candidate.game.state.code,
            protocol: NETWORK_PROTOCOL,
            disconnectGraceSeconds,
          });
          io.to(candidate.game.state.code).emit("state", snapshot(candidate));
        } catch (error) {
          room = undefined;
          throw error;
        }
        return;
      }
      if (!room || !pid) throw Error("Entra en una sala");
      const s = room.game.state,
        p = s.players.find((p) => p.id === pid)!;
      room.touched = Date.now();
      const revoke = (playerId: string) => {
        revokePlayer(room!, playerId);
      };
      switch (d.type) {
        case "ping":
          if (typeof ack === "function") ack();
          return;
        case "leave": {
          const previous = room,
            code = s.code;
          room.game.withdraw(pid);
          revoke(pid);
          room.sockets.delete(pid);
          if (s.host === pid)
            s.host = s.players.find((p) => p.connected)?.id || "";
          socket.leave(code);
          room = undefined;
          pid = "";
          io.to(code).emit("state", snapshot(previous));
          if (typeof ack === "function") ack();
          return;
        }
        case "remove":
          if (
            s.host !== pid ||
            s.phase !== "lobby" ||
            typeof d.id !== "string" ||
            !s.players.some((p) => p.id === d.id && !p.connected)
          )
            throw Error(
              "Solo puedes quitar invitados desconectados de la sala",
            );
          room.game.removeFromLobby(d.id);
          revoke(d.id);
          break;
        case "circuit":
          if (s.host !== pid || !isCircuitId(d.circuit))
            throw Error("Solo el anfitrión elige un recorrido válido");
          room.game.selectCircuit(d.circuit);
          break;
        case "format":
          if (s.host !== pid || !isMatchFormat(d.format))
            throw Error("Solo el anfitrión elige un formato válido en la sala");
          room.game.selectFormat(d.format);
          break;
        case "lobby":
          if (s.host !== pid) throw Error("Solo el anfitrión vuelve a la sala");
          room.game.returnToLobby();
          break;
        case "ready":
          if (s.phase === "lobby") p.ready = !p.ready;
          break;
        case "start":
          if (s.host !== pid || !canStart(s))
            throw Error(
              "El anfitrión inicia con al menos dos jugadores conectados y listos",
            );
          for (const player of [...s.players])
            if (!player.connected) {
              room.game.removeFromLobby(player.id);
              revoke(player.id);
            }
          room.game.start();
          break;
        case "shoot":
          if (
            typeof d.angle !== "number" ||
            typeof d.power !== "number" ||
            d.style !== undefined ||
            !room.game.shoot(pid, d.angle as number, d.power as number)
          )
            throw Error("Golpe rechazado: espera tu turno");
          break;
        case "next":
          if (s.host !== pid) throw Error("Solo el anfitrión avanza");
          room.game.next();
          break;
        case "replay":
          if (
            s.host !== pid ||
            s.phase !== "finished" ||
            s.players.filter((p) => p.connected && !p.withdrawn).length < 2
          )
            throw Error("Acción no disponible");
          s.players = s.players.filter((p) => p.connected && !p.withdrawn);
          room.game.start();
          break;
        default:
          throw Error("Acción desconocida");
      }
      for (const [token, owner] of room.tokens)
        if (!s.players.some((p) => p.id === owner)) room.tokens.delete(token);
      io.to(s.code).emit("state", snapshot(room));
    } catch (e) {
      fail(socket, e instanceof Error ? e.message : "Error de sala");
    }
  });
  socket.on("disconnect", () => {
    clearInterval(refill);
    if (!room || room.sockets.get(pid) !== socket.id) return;
    room.sockets.delete(pid);
    const s = room.game.state,
      p = s.players.find((p) => p.id === pid);
    if (p) {
      p.connected = false;
      room.disconnectedAt.set(pid, Date.now());
      if (s.phase === "lobby") p.ready = false;
    }
    room.touched = Date.now();
    if (s.host === pid) s.host = s.players.find((p) => p.connected)?.id || pid;
    io.to(s.code).emit("state", snapshot(room));
  });
});
const stepper = new FixedStepper();
let lastBroadcast = 0;
setInterval(() => {
  const now = performance.now();
  const broadcast = now - lastBroadcast >= 50;
  if (broadcast) lastBroadcast = now;
  const active: Room[] = [];
  for (const [code, r] of rooms) {
    if (!r.sockets.size && Date.now() - r.touched > 15 * 60_000) {
      r.game.dispose();
      rooms.delete(code);
      continue;
    }
    for (const p of r.game.state.players) {
      if (
        shouldWithdraw(
          p,
          r.game.state.phase,
          r.disconnectedAt.get(p.id),
          Date.now(),
          disconnectGraceSeconds * 1000,
        )
      ) {
        r.game.withdraw(p.id);
        revokePlayer(r, p.id);
        if (r.game.state.host === p.id)
          r.game.state.host =
            r.game.state.players.find((p) => p.connected && !p.withdrawn)?.id ||
            "";
      }
    }
    active.push(r);
  }
  stepper.advance(now, () => active.forEach((r) => r.game.tick()));
  for (const r of active) {
    if (broadcast && r.sockets.size)
      io.to(r.game.state.code).emit("state", snapshot(r));
  }
}, 1000 / 60);
http.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log(
    "Hoyo en Uno · Golf Club: http://localhost:" + (process.env.PORT || 3001),
  ),
);
