import { isIP } from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";
import { CommunityDatabase, CommunityError, communityPool } from "./database";
import { readCommunityAuth, communityVerifier } from "./auth";
import {
  isCreationId,
  type CommunityActor,
  type CommunityConfig,
} from "../../shared/community";
export function createCommunity(env: NodeJS.ProcessEnv, origins: string[]) {
  let database: CommunityDatabase | null = null,
    auth: ReturnType<typeof readCommunityAuth> = null,
    configurationError = "";
  try {
    if (env.COMMUNITY_DATABASE_URL) {
      const u = new URL(env.COMMUNITY_DATABASE_URL);
      if (!["postgres:", "postgresql:"].includes(u.protocol)) throw Error();
      database = new CommunityDatabase(
        communityPool(env.COMMUNITY_DATABASE_URL),
      );
    }
    auth = readCommunityAuth(env);
  } catch {
    configurationError = "La configuración de comunidad necesita revisión.";
  }
  const verify = auth ? communityVerifier(auth) : null;
  const rates = new Map<string, { count: number; until: number }>();
  async function configuration(): Promise<CommunityConfig> {
    if (configurationError || !database)
      return {
        available: false,
        publishing: false,
        auth: null,
        reason:
          configurationError ||
          "La comunidad no está activada: falta configurar PostgreSQL.",
      };
    try {
      if (!(await database.ready())) throw Error();
    } catch {
      return {
        available: false,
        publishing: false,
        auth: null,
        reason: "La base de comunidad no está disponible o necesita migración.",
      };
    }
    const publishing = Boolean(auth && auth.moderators.length);
    return {
      available: true,
      publishing,
      auth:
        publishing && auth
          ? {
              issuer: auth.issuer,
              clientId: auth.clientId,
              audience: auth.audience,
              scope: auth.scope,
            }
          : null,
      ...(!publishing
        ? {
            reason:
              "Exploración disponible. Publicación y moderación necesitan configurar identidad y moderadores.",
          }
        : {}),
    };
  }
  async function actor(req: IncomingMessage): Promise<CommunityActor> {
    if (!verify || !auth?.moderators.length)
      throw new CommunityError(503, "La publicación no está configurada.");
    let identity;
    try {
      identity = await verify(req.headers.authorization);
    } catch {
      throw new CommunityError(
        401,
        "Sesión no válida o caducada. Inicia sesión.",
      );
    }
    return database!.actor(identity);
  }
  async function optionalActor(req: IncomingMessage) {
    return req.headers.authorization ? actor(req) : undefined;
  }
  function send(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  }
  async function body(req: IncomingMessage) {
    let bytes = 0;
    const chunks: Buffer[] = [];
    for await (const c of req) {
      const chunk = Buffer.from(c);
      bytes += chunk.length;
      if (bytes > 68000)
        throw new CommunityError(413, "Solicitud demasiado grande.");
      chunks.push(chunk);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new CommunityError(400, "JSON inválido.");
    }
  }
  const handle = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> => {
    const url = new URL(req.url || "/", "http://localhost");
    if (!url.pathname.startsWith("/api/community")) return false;
    const origin = req.headers.origin;
    const own =
      origin === `https://${req.headers.host}` ||
      origin === `http://${req.headers.host}`;
    if (origin && !own && !origins.includes(origin)) {
      send(res, 403, { message: "Origen no permitido." });
      return true;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization,Content-Type",
      );
      res.writeHead(204);
      res.end();
      return true;
    }
    try {
      const forwarded = String(req.headers["x-forwarded-for"] || "")
        .split(",")
        .map((v) => v.trim())
        .filter((v) => isIP(v));
      const hops = Math.max(
        0,
        Math.min(3, Math.floor(Number(env.COMMUNITY_TRUST_PROXY_HOPS) || 0)),
      );
      const chain = [...forwarded, req.socket.remoteAddress || "unknown"];
      const key = chain[Math.max(0, chain.length - 1 - hops)],
        now = Date.now();
      if (rates.size >= 5000)
        for (const [k, v] of rates) if (v.until < now) rates.delete(k);
      const rate = rates.get(key);
      if (!rate && rates.size >= 5000)
        throw new CommunityError(
          429,
          "Servicio ocupado. Intenta en un minuto.",
        );
      if (!rate || rate.until < now)
        rates.set(key, { count: 1, until: now + 60000 });
      else if (++rate.count > 120)
        throw new CommunityError(
          429,
          "Demasiadas solicitudes. Intenta en un minuto.",
        );
      if (req.method === "GET" && url.pathname === "/api/community/config") {
        send(res, 200, await configuration());
        return true;
      }
      const config = await configuration();
      if (!config.available) throw new CommunityError(503, config.reason!);
      if (req.method === "GET" && url.pathname === "/api/community/creations") {
        send(res, 200, await database!.gallery(url.searchParams));
        return true;
      }
      if (req.method === "GET" && url.pathname === "/api/community/me") {
        const user = await actor(req);
        send(res, 200, { actor: user, creations: await database!.mine(user) });
        return true;
      }
      if (
        req.method === "GET" &&
        url.pathname === "/api/community/moderation"
      ) {
        send(res, 200, await database!.queue(await actor(req)));
        return true;
      }
      if (
        req.method === "POST" &&
        url.pathname === "/api/community/creations"
      ) {
        send(
          res,
          201,
          await database!.publish(await actor(req), await body(req)),
        );
        return true;
      }
      const match =
        /^\/api\/community\/creations\/([^/]+)(?:\/revisions\/([1-9][0-9]{0,5}))?(?:\/(report|moderate|audit))?$/.exec(
          url.pathname,
        );
      if (match) {
        const id = match[1],
          revision = match[2] ? Number(match[2]) : undefined;
        if (!isCreationId(id))
          throw new CommunityError(400, "Identificador inválido.");
        if (req.method === "GET" && !match[3]) {
          send(
            res,
            200,
            await database!.detail(id, revision, await optionalActor(req)),
          );
          return true;
        }
        if (revision && req.method === "POST" && match[3] === "report") {
          send(
            res,
            201,
            await database!.report(
              await actor(req),
              id,
              revision,
              await body(req),
            ),
          );
          return true;
        }
        if (revision && req.method === "POST" && match[3] === "moderate") {
          send(
            res,
            200,
            await database!.moderate(
              await actor(req),
              id,
              revision,
              await body(req),
            ),
          );
          return true;
        }
        if (revision && req.method === "GET" && match[3] === "audit") {
          send(res, 200, await database!.audit(await actor(req), id, revision));
          return true;
        }
      }
      const report = /^\/api\/community\/reports\/([^/]+)\/resolve$/.exec(
        url.pathname,
      );
      if (report && req.method === "POST" && isCreationId(report[1])) {
        const user = await actor(req),
          data = await body(req);
        send(
          res,
          200,
          await database!.resolveReport(user, report[1], data?.reason),
        );
        return true;
      }
      throw new CommunityError(404, "Ruta no disponible.");
    } catch (error) {
      const e = error as Error & { code?: string };
      const status =
        error instanceof CommunityError ? error.status : e.code ? 503 : 400;
      send(res, status, {
        message:
          error instanceof CommunityError
            ? e.message
            : status === 503
              ? "La base de comunidad no responde. Intenta otra vez."
              : status === 401
                ? "Sesión no válida o caducada. Inicia sesión."
                : e.message,
      });
    }
    return true;
  };
  return {
    handle,
    configuration,
    close: () => database?.pool.end(),
    async publicDocument(id: unknown, revision: unknown) {
      if (
        !isCreationId(id) ||
        !Number.isInteger(revision) ||
        (revision as number) < 1 ||
        (revision as number) > 999999
      )
        throw Error("Referencia de publicación inválida.");
      if (!(await configuration()).available)
        throw Error("La comunidad no está disponible.");
      const entry = await database!.detail(id, revision as number);
      if (entry.status !== "published" || !entry.document)
        throw Error("Esta versión ya no está publicada.");
      return entry;
    },
  };
}
