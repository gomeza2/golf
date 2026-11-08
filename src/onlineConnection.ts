import {
  validateRoomWorkshop,
  workshopFingerprint,
} from "../shared/roomWorkshop";
import type { WorkshopDocument } from "../shared/workshop";
import type { Course } from "../shared/courses";
import { io } from "socket.io-client";
import type { State } from "../shared/game";
import type { CircuitId } from "../shared/courses";
import type { MatchFormat } from "../shared/scoring";
import { NETWORK_PROTOCOL, type PhysicsEdition } from "../shared/rules";
import { readSession, saveSession, type Session } from "./storage";

export type RoomEntry =
  | {
      type: "create";
      name: string;
      circuit: CircuitId;
      format: MatchFormat;
      workshop?: WorkshopDocument;
      publication?: { id: string; revision: number };
    }
  | { type: "join"; name: string; code: string }
  | { type: "resume" };
export type RoomSession = Session & {
  protocol: number;
  disconnectGraceSeconds: number;
};
export type OnlineConnection = {
  readonly connected: boolean;
  send: (action: Record<string, unknown>) => boolean;
  leave: () => void;
  disconnect: () => void;
};
type Callbacks = {
  onStatus: (status: string) => void;
  onError: (error: string) => void;
  onSession: (session: RoomSession) => void;
  onState: (state: State) => void;
  onLatency: (latency: number | null) => void;
};

/** Owns one transport; disposing it makes every late callback inert. */
export function createOnlineConnection(
  endpoint: string,
  entry: RoomEntry,
  callbacks: Callbacks,
): OnlineConnection {
  const socket = io(endpoint || undefined, {
    timeout: 7000,
    reconnectionAttempts: 10,
  });
  let disposed = false,
    admitted = false,
    recovering = entry.type === "resume";
  let content:
    { hash: string; course: Course; physics: PhysicsEdition } | undefined;
  let pending: State | undefined;
  let generation = 0;
  let contentTimer: ReturnType<typeof setTimeout> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined,
    exitTimer: ReturnType<typeof setTimeout> | undefined;
  const clearPing = () => {
    clearInterval(ping);
    ping = undefined;
  };
  const disconnect = () => {
    if (disposed) return;
    disposed = true;
    admitted = false;
    clearPing();
    clearTimeout(exitTimer);
    clearTimeout(contentTimer);
    socket.disconnect();
  };
  const leave = () => {
    if (disposed) return;
    saveSession(null);
    disposed = true;
    admitted = false;
    clearPing();
    clearTimeout(contentTimer);
    if (!socket.connected) {
      socket.disconnect();
      return;
    }
    const finish = () => {
      clearTimeout(exitTimer);
      socket.disconnect();
    };
    exitTimer = setTimeout(finish, 1600);
    socket.timeout(1500).emit("action", { type: "leave" }, finish);
  };
  socket.on("connect", () => {
    if (disposed) return;
    admitted = false;
    content = undefined;
    pending = undefined;
    clearTimeout(contentTimer);
    contentTimer = undefined;
    generation++;
    callbacks.onStatus("Recuperando sesión…");
    const saved = readSession();
    if (recovering && !saved) {
      callbacks.onStatus("Sesión no recuperada");
      callbacks.onError(
        "No hay una sesión para recuperar. Vuelve al club y entra en una sala.",
      );
      disconnect();
      return;
    }
    socket.emit(
      "action",
      recovering && saved ? { ...saved, type: "resume" } : entry,
    );
  });
  socket.on("session", (value: unknown) => {
    if (disposed) return;
    const s = value as Partial<RoomSession> | null;
    if (s?.protocol !== NETWORK_PROTOCOL) {
      callbacks.onError(
        `El servidor y el juego necesitan la misma versión online (protocolo ${NETWORK_PROTOCOL}). Actualiza el servidor y recarga el juego.`,
      );
      callbacks.onStatus("Servidor de otra versión");
      leave();
      return;
    }
    if (
      typeof s.id !== "string" ||
      !s.id ||
      s.id.length > 100 ||
      typeof s.token !== "string" ||
      !s.token ||
      s.token.length > 256 ||
      typeof s.code !== "string" ||
      !/^[A-F0-9]{6}$/.test(s.code)
    ) {
      callbacks.onError("El servidor envió una sesión no válida");
      callbacks.onStatus("Sesión no recuperada");
      leave();
      return;
    }
    const grace = s.disconnectGraceSeconds;
    const session: RoomSession = {
      id: s.id,
      token: s.token,
      code: s.code,
      protocol: s.protocol,
      disconnectGraceSeconds:
        typeof grace === "number" &&
        Number.isInteger(grace) &&
        grace >= 1 &&
        grace <= 300
          ? grace
          : 90,
    };
    admitted = true;
    saveSession({ id: session.id, token: session.token, code: session.code });
    callbacks.onStatus("Conectado");
    callbacks.onSession(session);
    clearPing();
    const measure = () => {
      if (disposed || !admitted || !socket.connected) return;
      const started = performance.now();
      socket
        .timeout(3000)
        .emit("action", { type: "ping" }, (error: Error | null) => {
          if (!disposed && admitted)
            callbacks.onLatency(
              error ? null : Math.round(performance.now() - started),
            );
        });
    };
    measure();
    ping = setInterval(measure, 5000);
  });
  const receiveState = (state: State) => {
    if (disposed || !admitted) return;
    if (state.custom) {
      if (
        !state.workshopHash ||
        !content ||
        content.hash !== state.workshopHash
      ) {
        pending = state;
        callbacks.onStatus("Recibiendo cancha…");
        contentTimer ??= setTimeout(() => {
          if (disposed || !admitted) return;
          callbacks.onError(
            "No se recibió una cancha verificable. Vuelve a entrar en la sala.",
          );
          callbacks.onStatus("Cancha no verificada");
          leave();
        }, 10000);
        return;
      }
      if (state.physics !== content.physics) {
        callbacks.onError(
          "La física de la sala no coincide con la revisión verificada.",
        );
        callbacks.onStatus("Cancha no verificada");
        leave();
        return;
      }
      callbacks.onState({ ...state, courseOverride: content.course });
    } else {
      const { courseOverride: _untrusted, ...official } = state;
      callbacks.onState(official);
    }
  };
  socket.on("workshop", async (value: unknown) => {
    if (disposed || !admitted) return;
    const attempt = generation;
    try {
      const packet = value as { hash?: unknown; document?: unknown };
      if (
        !packet ||
        typeof packet.hash !== "string" ||
        !/^[a-f0-9]{64}$/.test(packet.hash)
      )
        throw Error("Identidad de cancha inválida");
      const validated = validateRoomWorkshop(packet.document);
      const hash = await workshopFingerprint(validated.canonical);
      if (disposed || !admitted || attempt !== generation) return;
      if (hash !== packet.hash)
        throw Error("La cancha recibida no coincide con su versión");
      clearTimeout(contentTimer);
      contentTimer = undefined;
      content = { hash, course: validated.course, physics: validated.physics };
      socket.emit("action", { type: "content-ready", hash });
      callbacks.onStatus("Conectado");
      if (pending) {
        const next = pending;
        pending = undefined;
        receiveState(next);
      }
    } catch (e) {
      if (disposed || attempt !== generation) return;
      callbacks.onError(
        `No se pudo verificar la cancha: ${(e as Error).message}`,
      );
      callbacks.onStatus("Cancha no verificada");
      leave();
    }
  });
  socket.on("state", receiveState);
  socket.on("notice", (message: unknown) => {
    if (disposed || typeof message !== "string") return;
    callbacks.onError(message);
    if (
      message === "Sesión no válida" ||
      message === "Sala inexistente o caducada"
    ) {
      admitted = false;
      clearPing();
      saveSession(null);
      callbacks.onLatency(null);
      callbacks.onStatus("Sesión no recuperada");
    }
  });
  socket.on("connect_error", () => {
    if (!disposed) {
      admitted = false;
      clearPing();
      callbacks.onLatency(null);
      callbacks.onStatus("Servidor no disponible. Reintentando…");
    }
  });
  socket.on("disconnect", () => {
    if (!disposed) {
      admitted = false;
      generation++;
      clearTimeout(contentTimer);
      contentTimer = undefined;
      content = undefined;
      pending = undefined;
      recovering = true;
      clearPing();
      callbacks.onLatency(null);
      callbacks.onStatus("Desconectado. Reconectando…");
    }
  });
  return {
    get connected() {
      return !disposed && admitted && socket.connected;
    },
    send: (action) => {
      if (disposed || !admitted || !socket.connected) return false;
      socket.emit("action", action);
      return true;
    },
    leave,
    disconnect,
  };
}
