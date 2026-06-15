import type { Coin } from "./coin";
import type { Product } from "./product";
import { NICKEL, DIME, QUARTER } from "./coin";
import { COLA, CHIPS, CANDY } from "./product";
import { valueOf } from "./coin-classifier";
import { CoinBank, VALUES } from "./coin-bank";

/**
 * The change guarantee ceiling C (§7, Appendix A.5): the most change a customer
 * can be owed who stops inserting once the balance reaches the price — the
 * largest accepted coin (25¢) minus the smallest (5¢). Derived from the coins,
 * not the prices. The machine is "change-capable" when it can make every 5¢ step
 * from 5¢ up to and including C.
 */
const CHANGE_CEILING_CENTS = 20; // 25¢ (largest coin) − 5¢ (smallest coin)

/**
 * A default change reserve with plenty of every denomination, so a machine
 * constructed without an explicit reserve can always make change.
 */
const AMPLE_CHANGE_RESERVE: Coin[] = [
  ...Array<Coin>(20).fill(QUARTER),
  ...Array<Coin>(20).fill(DIME),
  ...Array<Coin>(20).fill(NICKEL),
];

export class VendingMachine {
  private balance: number = 0;
  private pendingMessage: string | null = null;
  private returnedCoins: Coin[] = [];
  private bank: CoinBank;
  /** Uncollected earnings: Σ prices of sales since the last collect (§O.5). */
  private revenueCents: number = 0;

  /**
   * Inventory maps a product to its remaining stock. A product absent from the
   * map begins sold out — stock is finite-only, and an unconfigured product
   * starts at zero (§5, Appendix A.7). The change reserve seeds the coin bank.
   */
  constructor(
    private inventory: Map<Product, number> = new Map(),
    changeReserve: Coin[] = AMPLE_CHANGE_RESERVE,
  ) {
    this.bank = CoinBank.fromCoins(changeReserve);
  }

  display(): string {
    if (this.pendingMessage !== null) {
      const message = this.pendingMessage;
      this.pendingMessage = null;
      return message;
    }
    if (this.balance > 0) {
      return this.formatCurrency(this.balance);
    }
    return this.canMakeChange() ? "INSERT COIN" : "EXACT CHANGE ONLY";
  }

  /**
   * Change-capable (§7): the machine can make every 5-cent step from 5¢ up to
   * and including the change guarantee ceiling C ($0.20). A customer who stops
   * once the balance reaches the price is owed at most C, so a change-capable
   * machine never surprises such a customer. If any step is unmakeable, the
   * machine warns EXACT CHANGE ONLY at rest.
   */
  private canMakeChange(): boolean {
    for (let amount = 5; amount <= CHANGE_CEILING_CENTS; amount += 5) {
      if (!this.bank.canMake(amount)) {
        return false;
      }
    }
    return true;
  }

  insertCoin(coin: Coin): void {
    const value = valueOf(coin);
    if (value !== null) {
      // A valid coin is a customer action: it clears any pending one-shot
      // message, so the next read reflects the new balance (§8.4).
      this.pendingMessage = null;
      this.balance += value;
      this.bank.add(coin);
    } else {
      // An invalid coin leaves the balance unchanged, so it does not disturb a
      // pending message (§8.4); it passes straight to the coin return (§1.3).
      this.returnedCoins.push(coin);
    }
  }

  selectProduct(product: Product): void {
    if (this.isSoldOut(product)) {
      this.pendingMessage = "SOLD OUT";
      return;
    }
    if (this.balance < product.priceCents) {
      this.pendingMessage = `PRICE ${this.formatCurrency(product.priceCents)}`;
      return;
    }

    const changeOwed = this.balance - product.priceCents;
    if (!this.bank.canMake(changeOwed)) {
      // Cannot make change: refuse the sale and return the customer's money.
      this.refundBalance();
      this.pendingMessage = "EXACT CHANGE ONLY";
      return;
    }

    this.returnedCoins.push(...this.bank.withdraw(changeOwed));
    this.balance = 0;
    this.decrementStock(product);
    this.revenueCents += product.priceCents; // the sale's earnings (§O.5.1)
    this.pendingMessage = "THANK YOU";
  }

  /**
   * Whether a product is sold out (§5). Stock is finite-only: a product absent
   * from the inventory map is unconfigured and begins sold out (Appendix A.7),
   * as is any product whose remaining count has reached zero.
   */
  private isSoldOut(product: Product): boolean {
    return this.stockOf(product) === 0;
  }

  /**
   * Returns the customer's inserted balance to the coin return. The inserted
   * coins are already in the bank, so we withdraw that exact amount back out —
   * conserving the bank's contents.
   */
  private refundBalance(): void {
    this.returnedCoins.push(...this.bank.withdraw(this.balance));
    this.balance = 0;
  }

  private decrementStock(product: Product): void {
    const count = this.inventory.get(product);
    if (count !== undefined) {
      this.inventory.set(product, count - 1);
    }
  }

  returnCoins(): void {
    // Returning coins is a customer action: it clears any pending one-shot
    // message, so the next read shows the resting state (§8.4).
    this.pendingMessage = null;
    this.refundBalance();
  }

  /** Coins made available in the coin return (change and rejected coins). */
  coinReturn(): Coin[] {
    return this.returnedCoins;
  }

  // --- Operator interface ---------------------------------------------------

  /**
   * Whether the machine is idle — no customer transaction in progress. Mutating
   * operator actions (restock, load, collect) are permitted only while idle, so
   * servicing can never disturb an in-progress sale (O.0). Audit reads are not
   * guarded; they are always safe.
   */
  private isIdle(): boolean {
    return this.balance === 0;
  }

  /**
   * Sets a product's remaining stock to `count` (O.1). Restock *sets* rather
   * than adds, so the operator states the shelf's true contents. A count of 0
   * marks the product sold out; a positive count makes it available again.
   * Refused with no effect while a customer has a balance pending (O.0.1).
   */
  restock(product: Product, count: number): void {
    if (!this.isIdle()) return;
    this.inventory.set(product, count);
  }

  /**
   * Collects the operator's earnings (§O.3): hands back coins totaling the
   * current revenue, drawn largest-coin-first (§3.3), and reduces revenue by the
   * value handed back. The change float — the starting reserve plus loaded
   * change — stays in the machine; collect never returns it.
   *
   * Change-capability guard (§O.3.2): if the machine is change-capable, it never
   * pays out so much that it could no longer make every 5¢ step up to C — it
   * holds back the float-critical small coins, retaining their value as revenue.
   * If the machine was already not change-capable, the guard does not apply and
   * the full revenue is paid out.
   *
   * Strategy: remove coins one at a time, largest value first, up to the revenue
   * owed, keeping each removal only while it does not strand a previously
   * change-capable machine. Money is conserved: revenue falls by exactly the
   * value handed back (§O.3.3).
   *
   * Refused (collects nothing) while a customer has a balance pending (O.0.1).
   */
  collect(): Coin[] {
    if (!this.isIdle()) return [];
    const guardCapability = this.canMakeChange();
    const collected: Coin[] = [];
    let owed = this.revenueCents;

    for (const value of VALUES) {
      while (owed >= value && this.bank.countOf(value) > 0) {
        const coin = this.bank.removeOne(value);
        if (guardCapability && !this.canMakeChange()) {
          this.bank.add(coin); // would strand the float — keep it, leave as revenue
          break;
        }
        collected.push(coin);
        owed -= value;
      }
    }

    const handedBack = collected.reduce((sum, coin) => sum + (valueOf(coin) ?? 0), 0);
    this.revenueCents -= handedBack; // conserve: revenue falls by exactly the payout
    return collected;
  }

  /** The operator's uncollected earnings, in cents (§O.4, §O.5). Read-only. */
  revenue(): number {
    return this.revenueCents;
  }

  /**
   * Loads operator-supplied coins into the change reserve (O.2). Loaded coins
   * join the same pool customer coins are deposited into, so they are conserved
   * exactly like inserted coins and can lift the machine out of EXACT CHANGE
   * ONLY at rest. Refused with no effect while a customer has a balance
   * pending (O.0.1).
   */
  loadChange(coins: Coin[]): void {
    if (!this.isIdle()) return;
    for (const coin of coins) {
      this.bank.add(coin);
    }
  }

  /**
   * Total value of coins physically in the machine (O.4), in cents. This is the
   * whole pool: the change float plus any coins a customer has inserted but not
   * yet spent — they share one bank. Read-only; reading has no side effect.
   */
  cashOnHand(): number {
    return this.bank.total();
  }

  /**
   * Remaining stock of a product (O.4). Stock is finite-only: a product absent
   * from the inventory map is unconfigured and begins sold out, reported here as
   * zero (§5, Appendix A.7).
   */
  stockOf(product: Product): number {
    return this.inventory.get(product) ?? 0;
  }

  /** Converts a balance in cents into US dollar notation, e.g. 5 -> "$0.05". */
  private formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
