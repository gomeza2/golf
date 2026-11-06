import { beforeEach, afterEach, it, expect, vi } from "vitest";
const ioMock = vi.hoisted(() => vi.fn());
vi.mock("socket.io-client", () => ({ io: ioMock }));
import {
  createOnlineConnection,
  type OnlineConnection,
} from "../src/onlineConnection";
import { NETWORK_PROTOCOL } from "../shared/rules";
import type { State } from "../shared/game";
class FakeSocket {
  connected = false;
  listeners = new Map<string, ((...args: any[]) => void)[]>();
  sent: { name: string; args: any[] }[] = [];
  on(name: string, cb: (...args: any[]) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) || []), cb]);
    return this;
  }
  emit(name: string, ...args: any[]) {
    this.sent.push({ name, args });
    if (args[0]?.type === "ping") args[1]?.(null);
    return this;
  }
  timeout(_ms: number) {
    return this;
  }
  fire(name: string, ...args: any[]) {
    if (name === "connect") this.connected = true;
    if (name === "disconnect") this.connected = false;
    this.listeners.get(name)?.forEach((cb) => cb(...args));
  }
  disconnect = vi.fn(() => {
    this.fire("disconnect");
    return this;
  });
}
const session = {
  id: "host",
  token: "session-token",
  code: "ABC123",
  protocol: NETWORK_PROTOCOL,
  disconnectGraceSeconds: 90,
};
let fake: FakeSocket;
const opened: OnlineConnection[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  fake = new FakeSocket();
  ioMock.mockReturnValue(fake);
  const data = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
});
afterEach(() => {
  opened.splice(0).forEach((c) => c.disconnect());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function connect(type: "create" | "resume" = "create") {
  const callbacks = {
    onStatus: vi.fn(),
    onError: vi.fn(),
    onState: vi.fn(),
    onSession: vi.fn(),
    onLatency: vi.fn(),
  };
  const connection = createOnlineConnection(
    "",
    type === "resume"
      ? { type }
      : { type, name: "Ana", circuit: "sunset", format: "strokes" },
    callbacks,
  );
  opened.push(connection);
  return { connection, callbacks };
}
it("sends the chosen entry but exposes no room state or actions until a valid admission", () => {
  const { connection, callbacks } = connect();
  fake.fire("connect");
  expect(fake.sent[0].args[0]).toEqual({
    type: "create",
    name: "Ana",
    circuit: "sunset",
    format: "strokes",
  });
  fake.fire("state", { circuit: "unknown" });
  expect(callbacks.onState).not.toHaveBeenCalled();
  expect(connection.send({ type: "ready" })).toBe(false);
  fake.fire("session", session);
  const state = { phase: "lobby", players: [] } as unknown as State;
  fake.fire("state", state);
  expect(connection.connected).toBe(true);
  expect(callbacks.onState).toHaveBeenCalledWith(state);
  expect(connection.send({ type: "ready" })).toBe(true);
  expect(fake.sent.at(-1)?.args[0]).toEqual({ type: "ready" });
});
it("resumes the stored room after a transport break and measures latency only while admitted", () => {
  const { connection, callbacks } = connect();
  fake.fire("connect");
  fake.fire("session", session);
  expect(callbacks.onLatency).toHaveBeenCalledWith(0);
  vi.advanceTimersByTime(5000);
  expect(fake.sent.filter((x) => x.args[0].type === "ping")).toHaveLength(2);
  fake.fire("disconnect");
  expect(connection.connected).toBe(false);
  expect(callbacks.onLatency).toHaveBeenLastCalledWith(null);
  const count = fake.sent.length;
  vi.advanceTimersByTime(10000);
  expect(fake.sent).toHaveLength(count);
  fake.fire("connect");
  expect(fake.sent.at(-1)?.args[0]).toEqual({
    type: "resume",
    id: session.id,
    token: session.token,
    code: session.code,
  });
  fake.fire("session", session);
  expect(connection.connected).toBe(true);
});
it("disposes old callbacks and ping timers without revoking the session needed after reload", () => {
  const { connection, callbacks } = connect();
  fake.fire("connect");
  fake.fire("session", session);
  connection.disconnect();
  const statusCount = callbacks.onStatus.mock.calls.length;
  fake.fire("state", {});
  fake.fire("notice", "late");
  fake.fire("connect_error");
  fake.fire("disconnect");
  expect(callbacks.onStatus).toHaveBeenCalledTimes(statusCount);
  expect(callbacks.onError).not.toHaveBeenCalled();
  expect(callbacks.onState).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  expect(JSON.parse(sessionStorage.getItem("golf-session")!).token).toBe(
    session.token,
  );
});
it("leaves once, revokes recovery immediately and closes even without an acknowledgement", () => {
  const { connection } = connect();
  fake.fire("connect");
  fake.fire("session", session);
  connection.leave();
  connection.leave();
  expect(sessionStorage.getItem("golf-session")).toBeNull();
  expect(connection.connected).toBe(false);
  expect(fake.sent.filter((x) => x.args[0].type === "leave")).toHaveLength(1);
  vi.advanceTimersByTime(1600);
  expect(fake.disconnect).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
it("rejects an incompatible protocol and malformed session without rendering its state", () => {
  const { callbacks } = connect();
  fake.fire("connect");
  fake.fire("session", { ...session, protocol: NETWORK_PROTOCOL - 1 });
  fake.fire("state", {});
  expect(callbacks.onSession).not.toHaveBeenCalled();
  expect(callbacks.onState).not.toHaveBeenCalled();
  expect(callbacks.onStatus).toHaveBeenCalledWith("Servidor de otra versión");
  const other = connect();
  fake.fire("connect");
  fake.fire("session", { ...session, code: "bad" });
  expect(other.callbacks.onSession).not.toHaveBeenCalled();
  expect(other.callbacks.onError).toHaveBeenCalledWith(
    "El servidor envió una sesión no válida",
  );
});
it("clears expired recovery, closes a missing session and reports genuine connection failures", () => {
  const missing = connect("resume");
  fake.fire("connect");
  expect(missing.callbacks.onStatus).toHaveBeenLastCalledWith(
    "Sesión no recuperada",
  );
  expect(fake.disconnect).toHaveBeenCalled();
  const valid = connect();
  fake.fire("connect");
  fake.fire("session", session);
  fake.fire("notice", "Sesión no válida");
  expect(sessionStorage.getItem("golf-session")).toBeNull();
  expect(valid.connection.connected).toBe(false);
  expect(valid.callbacks.onLatency).toHaveBeenLastCalledWith(null);
  fake.fire("connect_error");
  expect(valid.callbacks.onStatus).toHaveBeenLastCalledWith(
    "Servidor no disponible. Reintentando…",
  );
});

it("buffers private states until its bounded document and SHA-256 are verified, and resolves the course without repeating it in wire snapshots", async () => {
  vi.useRealTimers();
  const { privateWorkshop } = await import("./fixtures/workshop");
  const { validateRoomWorkshop, workshopFingerprint } =
    await import("../shared/roomWorkshop");
  const { connection, callbacks } = connect();
  fake.fire("connect");
  fake.fire("session", session);
  const doc = privateWorkshop(),
    hash = await workshopFingerprint(validateRoomWorkshop(doc).canonical);
  const state = {
    phase: "lobby",
    custom: true,
    workshopHash: hash,
    players: [],
    circuit: "sunset",
    hole: 0,
  };
  fake.fire("state", state);
  expect(callbacks.onState).not.toHaveBeenCalled();
  fake.fire("workshop", { document: doc, hash });
  await vi.waitFor(() => expect(callbacks.onState).toHaveBeenCalled());
  expect(callbacks.onState.mock.calls[0][0].courseOverride.name).toBe(doc.name);
  expect(
    fake.sent.some(
      (e) => e.args[0]?.type === "content-ready" && e.args[0].hash === hash,
    ),
  ).toBe(true);
  expect(connection.connected).toBe(true);
});
it("rejects a forged document fingerprint without exposing a playable private state", async () => {
  vi.useRealTimers();
  const { privateWorkshop } = await import("./fixtures/workshop");
  const { connection, callbacks } = connect();
  fake.fire("connect");
  fake.fire("session", session);
  fake.fire("workshop", { document: privateWorkshop(), hash: "0".repeat(64) });
  await vi.waitFor(() =>
    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.stringContaining("no coincide"),
    ),
  );
  expect(connection.connected).toBe(false);
  expect(callbacks.onState).not.toHaveBeenCalled();
});
it("ends a session visibly if its custom content never arrives", () => {
  const { connection, callbacks } = connect();
  fake.fire("connect");
  fake.fire("session", session);
  fake.fire("state", { custom: true, workshopHash: "a".repeat(64) });
  vi.advanceTimersByTime(10001);
  expect(callbacks.onError).toHaveBeenCalledWith(
    expect.stringContaining("No se recibió"),
  );
  expect(connection.connected).toBe(false);
});
