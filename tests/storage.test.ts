import { it, expect, vi, afterEach } from "vitest";
import { readSession, readLocal, saveLocal, saveSession } from "../src/storage";
afterEach(() => vi.unstubAllGlobals());
it("ignores malformed recovery data instead of crashing the connection flow", () => {
  vi.stubGlobal("sessionStorage", { getItem: () => "{broken" });
  expect(readSession()).toBeNull();
  vi.stubGlobal("sessionStorage", {
    getItem: () => JSON.stringify({ id: 1, code: "ABCDEF", token: "x" }),
  });
  expect(readSession()).toBeNull();
});
it("keeps the game usable when browser storage is blocked", () => {
  const denied = () => {
    throw Error("Storage blocked");
  };
  vi.stubGlobal("localStorage", { getItem: denied, setItem: denied });
  vi.stubGlobal("sessionStorage", {
    getItem: denied,
    setItem: denied,
    removeItem: denied,
  });
  expect(readLocal("name", "Guest")).toBe("Guest");
  expect(readSession()).toBeNull();
  expect(() => saveLocal("name", "Ana")).not.toThrow();
  expect(() => saveSession(null)).not.toThrow();
});
