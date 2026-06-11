import type { Coin } from "./coin";
import { valueOf } from "./coin-classifier";

export class VendingMachine {
  private balance: number = 0;

  display(): string {
    return this.balance > 0 ? this.formatCurrency(this.balance) : "INSERT COIN";
  }

  insertCoin(coin: Coin): void {
    const value = valueOf(coin);
    if (value !== null) {
      this.balance += value;
    }
    // unrecognized coins are ignored (placed in the coin return)
  }

  /** Converts a balance in cents into US dollar notation, e.g. 5 -> "$0.05". */
  private formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
