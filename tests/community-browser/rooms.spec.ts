import { withWorkshopResources } from "../../shared/workshop";
import { test, expect } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import { communityPool } from "../../server/community/database";
import { privateWorkshop } from "../fixtures/workshop";
async function accessToken(subject: string) {
  const issuer = "http://127.0.0.1:48321",
    verifier = randomBytes(32).toString("base64url"),
    challenge = createHash("sha256").update(verifier).digest("base64url"),
    state = randomBytes(16).toString("hex"),
    redirect = "http://localhost:5173/";
  const url = new URL(issuer + "/authorize");
  for (const [k, v] of Object.entries({
    client_id: "golf-client-test",
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }))
    url.searchParams.set(k, v);
  const html = await (await fetch(url)).text(),
    ticket = /name="ticket" value="([^"]+)"/.exec(html)![1];
  const result = await fetch(issuer + "/login", {
    method: "POST",
    body: new URLSearchParams({ ticket, subject }),
    redirect: "manual",
  });
  const callback = new URL(result.headers.get("location")!);
  expect(callback.searchParams.get("state")).toBe(state);
  const token = await (
    await fetch(issuer + "/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: callback.searchParams.get("code")!,
        client_id: "golf-client-test",
        redirect_uri: redirect,
        code_verifier: verifier,
      }),
    })
  ).json();
  return token.access_token as string;
}
function event<T = any>(
  s: Socket,
  name: string,
  accept: (v: T) => boolean = () => true,
) {
  return new Promise<T>((resolve, reject) => {
    const cb = (v: T) => {
      if (!accept(v)) return;
      clearTimeout(timer);
      s.off(name, cb);
      resolve(v);
    };
    const timer = setTimeout(() => {
      s.off(name, cb);
      reject(Error("Timeout " + name));
    }, 12000);
    s.on(name, cb);
  });
}
async function connect() {
  const s = io("http://localhost:3001", { transports: ["websocket"] });
  await event(s, "connect");
  return s;
}
async function api(path: string, token?: string, body?: object) {
  const r = await fetch("http://localhost:3001/api/community" + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  expect(r.ok, data.message).toBe(true);
  return data;
}
const roomCount = async () =>
  (await (await fetch("http://localhost:3001/health")).json()).rooms as number;
test("published revision rooms serialize concurrent admission, use server content and reject stale withdrawn references", async () => {
  const author = await accessToken("author"),
    mod = await accessToken("reviewer");
  const doc = withWorkshopResources(privateWorkshop());
  doc.name = "La revisión de los sockets";
  doc.pieces.push(
    ...(["rotor", "lift", "dirt"] as const).map((kind, i) => ({
      id: `advanced-${i}`,
      kind,
      x: 6,
      z: 2 + i * 2,
      width: 1,
      length: 0.5,
      height: 0,
      endHeight: 0,
      angle: 0,
    })),
  );

  const entry = await api("/creations", author, {
    document: doc,
    authorName: "Autor socket",
    description: "Una publicación para comprobar la referencia autoritativa.",
    difficulty: "medium",
  });
  const path = `/creations/${entry.id}/revisions/1`;
  await api(path + "/moderate", mod, {
    status: "published",
    reason: "Se aprueba la versión fijada para la prueba.",
  });
  const before = await roomCount(),
    a = await connect(),
    b = await connect();
  let disconnected: Socket | undefined;
  try {
    for (const reference of [null, false, { id: entry.id, revision: 0 }]) {
      const bad = event<string>(a, "notice");
      a.emit("action", {
        type: "create",
        name: "Referencia inválida",
        publication: reference,
      });
      expect(await bad).toMatch(/inválida/);
    }
    const notices: string[] = [];
    a.on("notice", (m) => notices.push(m));
    let sessions = 0;
    a.on("session", () => sessions++);
    const session = event<{ id: string; code: string }>(a, "session"),
      content = event<{ hash: string; document: unknown }>(a, "workshop");
    a.emit("action", {
      type: "create",
      name: "Ana",
      publication: { id: entry.id, revision: 1 },
    });
    a.emit("action", { type: "create", name: "Duplicate", circuit: "aces" });
    a.emit("action", { type: "join", name: "Third", code: "ABCDEF" });
    const host = await session,
      document = await content;
    expect(document.document).toEqual(doc);
    expect(sessions).toBe(1);
    expect(notices).toHaveLength(2);
    expect(await roomCount()).toBe(before + 1);
    a.emit("action", { type: "content-ready", hash: document.hash });
    const joined = event(b, "session"),
      received = event(b, "workshop");
    b.emit("action", { type: "join", name: "Luis", code: host.code });
    await joined;
    expect(await received).toEqual(document);
    b.emit("action", { type: "content-ready", hash: document.hash });
    let update = event<any>(
      a,
      "state",
      (s) => s.players.length === 2 && s.players.every((p: any) => p.ready),
    );
    a.emit("action", { type: "ready" });
    b.emit("action", { type: "ready" });
    await update;
    update = event<any>(a, "state", (s) => s.phase === "playing");
    a.emit("action", { type: "start" });
    const started = await update;
    expect(started.publication).toEqual({ id: entry.id, revision: 1 });
    expect(started.physics).toBe(2);
    await api(path + "/moderate", mod, {
      status: "withdrawn",
      reason: "Se retira mientras una sala ya está jugando.",
    });
    disconnected = await connect();
    const refused = event<string>(disconnected, "notice");
    disconnected.emit("action", {
      type: "create",
      name: "Nuevo",
      publication: { id: entry.id, revision: 1 },
    });
    expect(await refused).toMatch(/publicada/);
    expect(await roomCount()).toBe(before + 1);
    for (const [i, s] of [a, b].entries()) {
      update = event<any>(a, "state", (v) => !v.moving && v.players[i].done);
      s.emit("action", { type: "shoot", angle: 0, power: 0.22, score: 999 });
      await update;
    }
    const finished = await event<any>(
      a,
      "state",
      (v) => v.phase === "finished",
    );
    expect(finished.players.map((p: any) => p.scores)).toEqual([[1], [1]]);
    expect(finished.workshopHash).toBe(document.hash);
    expect(finished.physics).toBe(2);
  } finally {
    a.disconnect();
    b.disconnect();
    disconnected?.disconnect();
  }
});
test("closing a socket during database admission does not create an orphan private room", async () => {
  const author = await accessToken("author"),
    mod = await accessToken("reviewer");
  const entry = await api("/creations", author, {
    document: privateWorkshop(),
    authorName: "Autor socket",
    description: "Una publicación para cerrar conexión durante la consulta.",
    difficulty: "medium",
  });
  await api(`/creations/${entry.id}/revisions/1/moderate`, mod, {
    status: "published",
    reason: "Revisión disponible para comprobar la admisión.",
  });
  const raw = process.env.TEST_COMMUNITY_DATABASE_URL!;
  expect(new URL(raw).pathname).toMatch(/_test$/);
  const pool = communityPool(raw),
    lock = await pool.connect();
  const before = await roomCount();
  const s = await connect();
  try {
    await lock.query("BEGIN");
    await lock.query(
      "LOCK TABLE golf_community.revisions IN ACCESS EXCLUSIVE MODE",
    );
    s.emit("action", {
      type: "create",
      name: "Salida temprana",
      publication: { id: entry.id, revision: 1 },
    });
    await new Promise((r) => setTimeout(r, 150));
    s.disconnect();
    await lock.query("COMMIT");
    await expect.poll(roomCount).toBe(before);
    await new Promise((r) => setTimeout(r, 250));
    expect(await roomCount()).toBe(before);
  } finally {
    s.disconnect();
    await lock.query("ROLLBACK");
    lock.release();
    await pool.end();
  }
});

test("a corrupted persisted checksum cannot be used to start a published room", async () => {
  const author = await accessToken("author"),
    mod = await accessToken("reviewer");
  const entry = await api("/creations", author, {
    document: privateWorkshop(),
    authorName: "Autor socket",
    description: "Una revisión para comprobar integridad de almacenamiento.",
    difficulty: "medium",
  });
  await api(`/creations/${entry.id}/revisions/1/moderate`, mod, {
    status: "published",
    reason: "Primera revisión íntegra y aprobada.",
  });
  const raw = process.env.TEST_COMMUNITY_DATABASE_URL!;
  expect(new URL(raw).pathname).toMatch(/_test$/);
  const pool = communityPool(raw);
  try {
    await pool.query(
      `INSERT INTO golf_community.revisions(creation_id,revision,title,description,difficulty,author_name,document,hash,features,stats,par,status,published_at) SELECT creation_id,2,title,description,difficulty,author_name,document,repeat('0',64),features,stats,par,'published',now() FROM golf_community.revisions WHERE creation_id=$1 AND revision=1`,
      [entry.id],
    );
  } finally {
    await pool.end();
  }
  const before = await roomCount(),
    s = await connect();
  try {
    const failure = event<string>(s, "notice");
    s.emit("action", {
      type: "create",
      name: "Integridad",
      publication: { id: entry.id, revision: 2 },
    });
    expect(await failure).toMatch(/integridad/);
    expect(await roomCount()).toBe(before);
  } finally {
    s.disconnect();
  }
});
