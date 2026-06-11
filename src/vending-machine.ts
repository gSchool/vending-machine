import type { Coin } from "./coin";
import type { Product } from "./product";
import { NICKEL, DIME, QUARTER } from "./coin";
import { COLA, CHIPS, CANDY } from "./product";
import { valueOf } from "./coin-classifier";
import { CoinBank } from "./coin-bank";

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

  /** Converts a balance in cents into US dollar notation, e.g. 5 -> "$0.05". */
  private formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
