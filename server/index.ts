import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { randomBytes } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { gzip as gzipCallback } from "node:zlib";
import { promisify } from "node:util";
const gzip = promisify(gzipCallback);
import { Game, initPhysics } from "../shared/game";
await initPhysics();
const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(
  ",",
);
const http = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"ok":true}');
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
    cb(null, !req.headers.origin || origins.includes(req.headers.origin)),
});
type Room = {
  game: Game;
  tokens: Map<string, string>;
  sockets: Map<string, string>;
  touched: number;
};
const rooms = new Map<string, Room>();
const capacity = Math.max(2, Math.min(8, Number(process.env.MAX_PLAYERS) || 8));
const snapshot = (r: Room) => r.game.state;
const fail = (socket: Socket, message: string) =>
  socket.emit("notice", message);
io.on("connection", (socket) => {
  let room: Room | undefined;
  let pid = "";
  let bucket = 20;
  const refill = setInterval(() => (bucket = Math.min(20, bucket + 10)), 1000);
  socket.on("action", (data: unknown) => {
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
          const game = new Game();
          game.state.code = code;
          room = {
            game,
            tokens: new Map(),
            sockets: new Map(),
            touched: Date.now(),
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
            const old = candidate.sockets.get(pid);
            if (old) io.sockets.sockets.get(old)?.disconnect(true);
            candidate.game.state.players.find((p) => p.id === pid)!.connected =
              true;
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
      switch (d.type) {
        case "ready":
          if (s.phase === "lobby") p.ready = !p.ready;
          break;
        case "start":
          if (
            s.host !== pid ||
            s.players.length < 2 ||
            s.players.some((p) => !p.ready || !p.connected) ||
            s.phase !== "lobby"
          )
            throw Error("El anfitrión inicia cuando todos están listos");
          room.game.start();
          break;
        case "shoot":
          if (
            typeof d.angle !== "number" ||
            typeof d.power !== "number" ||
            !room.game.shoot(pid, d.angle, d.power)
          )
            throw Error("Golpe rechazado: espera tu turno");
          break;
        case "next":
          if (s.host !== pid) throw Error("Solo el anfitrión avanza");
          room.game.next();
          break;
        case "replay":
          if (s.host !== pid || s.phase !== "finished")
            throw Error("Acción no disponible");
          room.game.start();
          break;
        default:
          throw Error("Acción desconocida");
      }
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
    if (p) p.connected = false;
    room.touched = Date.now();
    if (s.host === pid) s.host = s.players.find((p) => p.connected)?.id || pid;
    io.to(s.code).emit("state", snapshot(room));
  });
});
let frames = 0;
setInterval(() => {
  frames++;
  for (const [code, r] of rooms) {
    if (!r.sockets.size && Date.now() - r.touched > 15 * 60_000) {
      r.game.dispose();
      rooms.delete(code);
      continue;
    }
    r.game.tick();
    if (frames % 3 === 0 && r.sockets.size)
      io.to(code).emit("state", snapshot(r));
  }
}, 1000 / 60);
http.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log(
    "Mini Golf Battle: http://localhost:" + (process.env.PORT || 3001),
  ),
);
