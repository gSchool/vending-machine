import type { Coin } from "./coin";
import type { Product } from "./product";
import { NICKEL, DIME, QUARTER } from "./coin";
import { COLA, CHIPS, CANDY } from "./product";
import { valueOf } from "./coin-classifier";
import { CoinBank, VALUES } from "./coin-bank";

/** The highest product price (cents); change may be owed up to just under this. */
const MAX_PRICE_CENTS = Math.max(COLA.priceCents, CHIPS.priceCents, CANDY.priceCents);

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

  /**
   * Inventory maps a product to its remaining stock. A product absent from the
   * map is treated as in stock; only an explicit count of 0 is sold out.
   * The change reserve seeds the machine's coin bank.
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
   * Safe rule: the reserve must be able to produce every change amount that
   * could ever be owed — i.e. each 5-cent step from 5 up to the largest price.
   * If any is unmakeable, the machine warns EXACT CHANGE ONLY.
   */
  private canMakeChange(): boolean {
    for (let amount = 5; amount < MAX_PRICE_CENTS; amount += 5) {
      if (!this.bank.canMake(amount)) {
        return false;
      }
    }
    return true;
  }

  insertCoin(coin: Coin): void {
    const value = valueOf(coin);
    if (value !== null) {
      this.balance += value;
      this.bank.add(coin);
    } else {
      this.returnedCoins.push(coin);
    }
  }

  selectProduct(product: Product): void {
    if (this.inventory.get(product) === 0) {
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
    this.pendingMessage = "THANK YOU";
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
   * Collects the surplus revenue (O.3): hands back as many coins as possible
   * while keeping the machine change-capable (§7), and retains that float.
   *
   * Strategy: try to remove coins one at a time, largest value first, keeping a
   * removal only if the bank stays change-capable. This never breaks capability,
   * so a machine that could make change still can (O.3.2). If the machine is not
   * change-capable to begin with there is no surplus over a capable float, so
   * nothing is collected (O.3.3).
   *
   * This greedy removal guarantees capability is preserved and money is
   * conserved (both property-tested), but it is NOT proven to collect the
   * maximum possible value — only a capability-safe amount. A provably-maximal
   * collection would search retained sets; the spec asks only that the machine
   * stay change-capable, so the simpler greedy pass suffices.
   *
   * Refused (collects nothing) while a customer has a balance pending (O.0.1).
   */
  collect(): Coin[] {
    if (!this.isIdle()) return [];
    const collected: Coin[] = [];
    for (const value of VALUES) {
      while (this.bank.countOf(value) > 0) {
        const coin = this.bank.removeOne(value);
        if (this.canMakeChange()) {
          collected.push(coin);
        } else {
          this.bank.add(coin); // putting it back would break change-making — keep it
          break;
        }
      }
    }
    return collected;
  }

  /**
   * The value the operator could collect right now (O.4), without changing
   * anything. Computed by running the very same selection `collect` uses and
   * then putting the coins back, so it is a faithful, side-effect-free predictor
   * of what `collect` would hand back.
   */
  collectableSurplus(): number {
    const surplus = this.collect();
    this.loadChange(surplus); // restore: this read must not mutate state
    return surplus.reduce((sum, coin) => sum + (valueOf(coin) ?? 0), 0);
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
   * Remaining stock of a product (O.4). A product absent from the inventory map
   * has no configured limit and is always in stock, reported here as Infinity
   * (consistent with §5: only an explicit 0 is sold out).
   */
  stockOf(product: Product): number {
    return this.inventory.get(product) ?? Infinity;
  }

  /** Converts a balance in cents into US dollar notation, e.g. 5 -> "$0.05". */
  private formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
