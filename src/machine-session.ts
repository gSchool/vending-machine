import type { Coin } from "./coin";
import type { Product } from "./product";
import { NICKEL, DIME, QUARTER } from "./coin";
import { COLA, CHIPS, CANDY } from "./product";
import { valueOf } from "./coin-classifier";
import { VendingMachine } from "./vending-machine";

/**
 * The I/O-free heart of the application surface: one {@link VendingMachine}
 * instance, the catalog/coin lookup tables, and the snapshot + action mapping
 * the UI drives. It does no networking and touches no DOM, so it runs unchanged
 * in two places — wrapped in HTTP by {@link file://./server.ts} for `npm start`,
 * and imported directly by the browser bundle (`web-app.ts`) for the static
 * GitHub Pages build. Keeping it here is what stops those two front doors from
 * drifting: the snapshot shape and the set of actions have a single source.
 */

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
 * Classification is a domain concern, so the session — not the UI — assigns each
 * coin its recognized value before sending it out. The UI receives `{ value }`
 * (cents, or null when unrecognized) and never sees coin physics, keeping
 * `valueOf` the single source of truth for what a coin is worth.
 */
function serializeCoin(coin: Coin): { value: number | null } {
  return { value: valueOf(coin) };
}

/** A bad request to {@link MachineSession.dispatch} (unknown coin/product/action). */
export class SessionError extends Error {}

export type Snapshot = ReturnType<MachineSession["snapshot"]>;

export class MachineSession {
  private readonly machine: VendingMachine;

  constructor() {
    // Starts stocked with an ample change float (the constructor's default
    // reserve), so the demo opens in a working state. Restock/loadChange let the
    // operator drive it into and out of SOLD OUT and EXACT CHANGE ONLY.
    this.machine = new VendingMachine(
      new Map<Product, number>([
        [COLA, 5],
        [CHIPS, 5],
        [CANDY, 5],
      ]),
    );
  }

  /** The set of dispatchable action names — lets the server answer 404 vs 400. */
  get actions(): readonly string[] {
    return Object.keys(this.handlers);
  }

  /**
   * Everything the UI renders, gathered in one read so a single call after any
   * action fully refreshes the page. Note `display()` is a one-shot read (it
   * consumes pending messages like THANK YOU), so the snapshot reads it once.
   */
  snapshot() {
    return {
      display: this.machine.display(),
      coinReturn: this.machine.coinReturn().map(serializeCoin),
      cashOnHand: this.machine.cashOnHand(),
      coinInventory: this.machine.coinInventory(),
      // Catalog sourced from the domain Product objects so price and name have a
      // single source of truth (product.ts); the UI supplies only icons.
      catalog: Object.entries(PRODUCTS).map(([id, p]) => ({
        id,
        name: p.name,
        priceCents: p.priceCents,
        stock: this.machine.stockOf(p),
      })),
    };
  }

  /**
   * Perform one named action against the shared machine and return any extra
   * payload the action produces (collected/withdrawn coins). The caller appends a
   * fresh snapshot, so every action reports the new full state.
   */
  dispatch(action: string, body: any): unknown {
    const handler = this.handlers[action];
    if (!handler) throw new SessionError(`unknown action: ${action}`);
    return handler(body ?? {});
  }

  /** One entry per VendingMachine action; mutate the machine, return extras. */
  private readonly handlers: Record<string, (body: any) => unknown> = {
    // Customer actions
    "insert-coin": (body) => {
      const coin = COINS[body?.coin];
      if (!coin) throw new SessionError(`unknown coin: ${body?.coin}`);
      this.machine.insertCoin(coin);
    },
    "select-product": (body) => {
      const product = PRODUCTS[body?.product];
      if (!product) throw new SessionError(`unknown product: ${body?.product}`);
      this.machine.selectProduct(product);
    },
    "return-coins": () => this.machine.returnCoins(),
    "collect-coin-return": () => ({ collected: this.machine.collectCoinReturn().map(serializeCoin) }),

    // Operator actions
    "restock": (body) => {
      const product = PRODUCTS[body?.product];
      if (!product) throw new SessionError(`unknown product: ${body?.product}`);
      this.machine.restock(product, body?.count);
    },
    "load-change": (body) => {
      const coins = (body?.coins ?? []).map((name: string) => {
        const coin = COINS[name];
        if (!coin || name === "slug") throw new SessionError(`not loadable: ${name}`);
        return coin;
      });
      this.machine.loadChange(coins);
    },
    "withdraw-all": () => ({ withdrawn: this.machine.withdrawAll().map(serializeCoin) }),
  };
}
