import { test, expect } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import { NETWORK_PROTOCOL } from "../../shared/rules";

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
const state = (socket: Socket, check: (s: any) => boolean) =>
  event<any>(socket, "state", check);
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

test("two authoritative online clients can start the new expedition circuit with protocol 18", async () => {
  test.setTimeout(90000);
  const host = await open();
  const guest = await open();
  try {
    const session = await enter(host, {
      type: "create",
      name: "Explorador",
      circuit: "expeditions",
      physics: 1,
    });
    expect(session.protocol).toBe(NETWORK_PROTOCOL);
    await enter(guest, {
      type: "join",
      name: "Compañera",
      code: session.code,
    });

    const ready = state(
      host,
      (s) =>
        s.players.length === 2 &&
        s.players.every((player: any) => player.ready),
    );
    host.emit("action", { type: "ready" });
    guest.emit("action", { type: "ready" });
    await ready;

    const started = state(host, (s) => s.phase === "playing");
    host.emit("action", { type: "start", physics: 1 });
    const current = await started;
    expect(current.circuit).toBe("expeditions");
    expect(current.physics).toBe(2);
    expect(current.players).toHaveLength(2);
    expect(
      current.players.every((player: any) =>
        [player.pos.x, player.pos.y, player.pos.z].every(Number.isFinite),
      ),
    ).toBe(true);
  } finally {
    host.disconnect();
    guest.disconnect();
  }
});
