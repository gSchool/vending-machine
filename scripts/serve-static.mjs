// A minimal static file server over dist/, used by the Playwright config's
// webServer to serve exactly what GitHub Pages would. No /api routes exist here —
// if the page ever tried to reach the dev server, these tests would catch it.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

createServer(async (req, res) => {
  const path = (req.url || "/").split("?")[0];
  const rel = path === "/" ? "/index.html" : path;
  const file = normalize(join(dist, rel));
  if (!file.startsWith(dist)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(PORT, () => console.log(`static dist on http://localhost:${PORT}`));
