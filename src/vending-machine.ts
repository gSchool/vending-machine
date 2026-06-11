import type { Coin } from "./coin";
import type { Product } from "./product";
import { valueOf } from "./coin-classifier";
import { makeChange } from "./change-maker";

export class VendingMachine {
  private balance: number = 0;
  private pendingMessage: string | null = null;
  private returnedCoins: Coin[] = [];

  display(): string {
    if (this.pendingMessage !== null) {
      const message = this.pendingMessage;
      this.pendingMessage = null;
      return message;
    }
    return this.balance > 0 ? this.formatCurrency(this.balance) : "INSERT COIN";
  }

  insertCoin(coin: Coin): void {
    const value = valueOf(coin);
    if (value !== null) {
      this.balance += value;
    }
    // unrecognized coins are ignored (placed in the coin return)
  }

  selectProduct(product: Product): void {
    if (this.balance < product.priceCents) {
      this.pendingMessage = `PRICE ${this.formatCurrency(product.priceCents)}`;
    } else {
      const changeOwed = this.balance - product.priceCents;
      this.balance = 0;
      this.returnedCoins.push(...makeChange(changeOwed));
      this.pendingMessage = "THANK YOU";
    }
  }

  returnCoins(): void {
    this.returnedCoins.push(...makeChange(this.balance));
    this.balance = 0;
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
