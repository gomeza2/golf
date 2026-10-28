// Serve only built files under the exact repository prefix. No SPA fallback:
// a missing asset must fail here just as it would on GitHub Pages.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist"),
  prefix = process.env.PAGES_BASE_PATH || "/golf/";
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!pathname.startsWith(prefix)) throw Error("Outside prefix");
    const relative = pathname.slice(prefix.length) || "index.html";
    const path = resolve(root, relative);
    if (!path.startsWith(root + "/")) throw Error("Outside dist");
    const data = await readFile(path);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".wasm": "application/wasm",
      }[extname(path)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("File not found");
  }
}).listen(4173, "0.0.0.0", () =>
  console.log("Pages preview: http://localhost:4173" + prefix),
);
