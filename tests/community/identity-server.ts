// Local OIDC provider fixture. Never imported by the application or production build.
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT, jwtVerify } from "jose";
const port = Number(process.env.TEST_OIDC_PORT || 48321),
  issuer = `http://127.0.0.1:${port}`;
const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = {
  ...(await exportJWK(publicKey)),
  kid: "browser-fixture-key",
  alg: "RS256",
  use: "sig",
};
const pending = new Map<
    string,
    {
      redirect: string;
      state: string;
      challenge: string;
      nonce: string;
      expires: number;
    }
  >(),
  codes = new Map<
    string,
    {
      subject: string;
      redirect: string;
      challenge: string;
      nonce: string;
      expires: number;
    }
  >();
const html = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
createServer(async (req, res) => {
  const u = new URL(req.url || "/", issuer);
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (u.pathname === "/.well-known/openid-configuration") {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        issuer,
        authorization_endpoint: issuer + "/authorize",
        token_endpoint: issuer + "/token",
        jwks_uri: issuer + "/jwks",
        userinfo_endpoint: issuer + "/userinfo",
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        token_endpoint_auth_methods_supported: ["none"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: ["openid", "profile"],
      }),
    );
    return;
  }
  if (u.pathname === "/jwks") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  if (u.pathname === "/authorize") {
    const redirect = u.searchParams.get("redirect_uri") || "",
      challenge = u.searchParams.get("code_challenge") || "",
      state = u.searchParams.get("state") || "";
    if (
      redirect !== "http://localhost:5173/" ||
      u.searchParams.get("client_id") !== "golf-client-test" ||
      u.searchParams.get("code_challenge_method") !== "S256" ||
      !challenge ||
      !state
    ) {
      res.writeHead(400);
      res.end("Invalid test authorization");
      return;
    }
    const ticket = randomBytes(20).toString("hex");
    pending.set(ticket, {
      redirect,
      state,
      challenge,
      nonce: u.searchParams.get("nonce") || "",
      expires: Date.now() + 60000,
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      `<html lang="es"><h1>Proveedor OIDC local de pruebas</h1><p>Solo cuentas efímeras de automatización.</p><form method="post" action="/login"><input type="hidden" name="ticket" value="${html(ticket)}"><button name="subject" value="author">Acceder como autor de prueba</button><button name="subject" value="reviewer">Acceder como moderador de prueba</button><button name="subject" value="reader">Acceder como lector de prueba</button></form></html>`,
    );
    return;
  }
  if (u.pathname === "/login" && req.method === "POST") {
    let data = "";
    for await (const c of req) data += c;
    const p = new URLSearchParams(data),
      ticket = p.get("ticket") || "",
      flow = pending.get(ticket),
      subject = p.get("subject") || "";
    pending.delete(ticket);
    if (
      !flow ||
      flow.expires < Date.now() ||
      !["author", "reviewer", "reader"].includes(subject)
    ) {
      res.writeHead(400);
      res.end("Invalid login");
      return;
    }
    const code = randomBytes(24).toString("hex");
    codes.set(code, {
      subject,
      redirect: flow.redirect,
      challenge: flow.challenge,
      nonce: flow.nonce,
      expires: Date.now() + 60000,
    });
    const location = new URL(flow.redirect);
    location.searchParams.set("code", code);
    location.searchParams.set("state", flow.state);
    res.writeHead(302, { Location: location.href });
    res.end();
    return;
  }
  if (u.pathname === "/token" && req.method === "POST") {
    let data = "";
    for await (const c of req) data += c;
    const p = new URLSearchParams(data),
      code = p.get("code") || "",
      flow = codes.get(code);
    codes.delete(code);
    const challenge = createHash("sha256")
      .update(p.get("code_verifier") || "")
      .digest("base64url");
    if (
      !flow ||
      flow.expires < Date.now() ||
      flow.challenge !== challenge ||
      p.get("client_id") !== "golf-client-test" ||
      p.get("redirect_uri") !== flow.redirect ||
      p.get("grant_type") !== "authorization_code"
    ) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_grant" }));
      return;
    }
    const sign = (audience: string, claims: object) =>
      new SignJWT({ name: flow.subject, ...claims })
        .setProtectedHeader({ alg: "RS256", kid: "browser-fixture-key" })
        .setSubject(flow.subject)
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(privateKey);
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        access_token: await sign("golf-api-test", {}),
        id_token: await sign(
          "golf-client-test",
          flow.nonce ? { nonce: flow.nonce } : {},
        ),
        token_type: "Bearer",
        expires_in: 300,
        scope: "openid profile",
      }),
    );
    return;
  }
  if (u.pathname === "/userinfo") {
    try {
      const { payload } = await jwtVerify(
        (req.headers.authorization || "").replace(/^Bearer /, ""),
        publicKey,
        { issuer, audience: "golf-api-test" },
      );
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ sub: payload.sub, name: payload.name }));
    } catch {
      res.writeHead(401);
      res.end("{}");
    }
    return;
  }
  res.writeHead(404);
  res.end("{}");
}).listen(port, "127.0.0.1", () =>
  console.log("OIDC fixture ready on loopback."),
);
