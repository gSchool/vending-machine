import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";

import { MachineSession, SessionError } from "./machine-session";

/**
 * A thin HTTP shell around the I/O-free {@link MachineSession}. It owns a single
 * session — the one source of truth, so state survives a page refresh — and maps
 * each customer/operator action to a JSON endpoint under `/api/`. The snapshot
 * shape and action set live in machine-session.ts, shared with the static browser
 * build; this file is the only I/O.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const PORT = Number(process.env.PORT) || 3000;

const session = new MachineSession();
const KNOWN_ACTIONS = new Set(session.actions);

// --- Request handling -------------------------------------------------------

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid JSON body");
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const data = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(data);
}

const STATIC_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

async function serveStatic(res: ServerResponse, urlPath: string): Promise<void> {
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  // Normalize and confine to PUBLIC_DIR so a crafted path can't escape it.
  const filePath = normalize(join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }
  try {
    const data = await readFile(filePath);
    const ext = filePath.slice(filePath.lastIndexOf("."));
    res.writeHead(200, { "content-type": STATIC_TYPES[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "not found" });
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (url.pathname === "/api/state" && req.method === "GET") {
      sendJson(res, 200, session.snapshot());
      return;
    }

    if (url.pathname.startsWith("/api/") && req.method === "POST") {
      const action = url.pathname.slice("/api/".length);
      if (!KNOWN_ACTIONS.has(action)) {
        sendJson(res, 404, { error: `unknown action: ${action}` });
        return;
      }
      const result = session.dispatch(action, await readBody(req));
      sendJson(res, 200, { ...(result ?? {}), state: session.snapshot() });
      return;
    }

    if (req.method === "GET") {
      await serveStatic(res, url.pathname);
      return;
    }

    sendJson(res, 405, { error: "method not allowed" });
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message });
    } else if (err instanceof SessionError) {
      sendJson(res, 400, { error: err.message });
    } else {
      sendJson(res, 500, { error: "internal error" });
    }
  }
});

server.listen(PORT, () => {
  console.log(`Vending machine UI on http://localhost:${PORT}`);
});
