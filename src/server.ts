import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";

import type { Coin } from "./coin";
import type { Product } from "./product";
import { NICKEL, DIME, QUARTER } from "./coin";
import { COLA, CHIPS, CANDY } from "./product";
import { valueOf } from "./coin-classifier";
import { VendingMachine } from "./vending-machine";

/**
 * A thin HTTP shell around the pure {@link VendingMachine} domain core. It owns a
 * single machine instance — the one source of truth, so the state survives page
 * refreshes — and maps each customer/operator method to a JSON endpoint. The core
 * itself does no I/O (README "Design at a glance"); this file is the only I/O.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const PORT = Number(process.env.PORT) || 3000;

// --- The machine and its catalog -------------------------------------------

/** The three products the spec defines (product.ts), keyed by name for lookup. */
const PRODUCTS: Record<string, Product> = { cola: COLA, chips: CHIPS, candy: CANDY };

/**
 * The coins a customer can insert. NICKEL/DIME/QUARTER carry the real US specs the
 * classifier recognizes; SLUG is a deliberately unrecognized coin so the UI can
 * demonstrate rejection to the coin return.
 */
const SLUG: Coin = { weightGrams: 7.2, diameterMm: 22.0 };
const COINS: Record<string, Coin> = { nickel: NICKEL, dime: DIME, quarter: QUARTER, slug: SLUG };

/**
 * The machine starts stocked and with an ample change float (the constructor's
 * default reserve), so the demo opens in a working state. Restock/loadChange let
 * the operator drive it into and out of SOLD OUT and EXACT CHANGE ONLY.
 */
const machine = new VendingMachine(
  new Map<Product, number>([
    [COLA, 5],
    [CHIPS, 5],
    [CANDY, 5],
  ]),
);

// --- Serialization ----------------------------------------------------------

/**
 * Classification is a domain concern, so the server — not the browser — assigns
 * each coin its recognized value before sending it out. The UI receives
 * `{ value }` (cents, or null when unrecognized) and never sees coin physics.
 * This keeps `valueOf` the single source of truth for what a coin is worth.
 */
function serializeCoin(coin: Coin): { value: number | null } {
  return { value: valueOf(coin) };
}

// --- State snapshot ---------------------------------------------------------

/**
 * Everything the UI renders, gathered in one read so a single round-trip after any
 * action fully refreshes the page. Note `display()` is a one-shot read (it consumes
 * pending messages like THANK YOU), so the snapshot reads it exactly once.
 */
function snapshot() {
  return {
    display: machine.display(),
    coinReturn: machine.coinReturn().map(serializeCoin),
    cashOnHand: machine.cashOnHand(),
    coinInventory: machine.coinInventory(),
    stock: {
      cola: machine.stockOf(COLA),
      chips: machine.stockOf(CHIPS),
      candy: machine.stockOf(CANDY),
    },
  };
}

// --- Request handling -------------------------------------------------------

type Handler = (body: any) => unknown;

/**
 * The API surface — one entry per VendingMachine action. Each handler performs the
 * domain call (mutating the shared machine) and returns nothing; the router then
 * appends a fresh snapshot, so every action responds with the new full state.
 */
const ACTIONS: Record<string, Handler> = {
  // Customer actions
  "insert-coin": (body) => {
    const coin = COINS[body?.coin];
    if (!coin) throw new HttpError(400, `unknown coin: ${body?.coin}`);
    machine.insertCoin(coin);
  },
  "select-product": (body) => {
    const product = PRODUCTS[body?.product];
    if (!product) throw new HttpError(400, `unknown product: ${body?.product}`);
    machine.selectProduct(product);
  },
  "return-coins": () => machine.returnCoins(),
  "collect-coin-return": () => ({ collected: machine.collectCoinReturn().map(serializeCoin) }),

  // Operator actions
  "restock": (body) => {
    const product = PRODUCTS[body?.product];
    if (!product) throw new HttpError(400, `unknown product: ${body?.product}`);
    machine.restock(product, body?.count);
  },
  "load-change": (body) => {
    const coins = (body?.coins ?? []).map((name: string) => {
      const coin = COINS[name];
      if (!coin || name === "slug") throw new HttpError(400, `not loadable: ${name}`);
      return coin;
    });
    machine.loadChange(coins);
  },
  "withdraw-all": () => ({ withdrawn: machine.withdrawAll().map(serializeCoin) }),
};

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
      sendJson(res, 200, snapshot());
      return;
    }

    if (url.pathname.startsWith("/api/") && req.method === "POST") {
      const action = url.pathname.slice("/api/".length);
      const handler = ACTIONS[action];
      if (!handler) {
        sendJson(res, 404, { error: `unknown action: ${action}` });
        return;
      }
      const result = handler(await readBody(req));
      sendJson(res, 200, { ...(result ?? {}), state: snapshot() });
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
    } else {
      sendJson(res, 500, { error: "internal error" });
    }
  }
});

server.listen(PORT, () => {
  console.log(`Vending machine UI on http://localhost:${PORT}`);
});
