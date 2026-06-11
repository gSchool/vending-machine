import type { Coin } from "./coin";
import { NICKEL, DIME, QUARTER } from "./coin";
import { valueOf } from "./coin-classifier";

/** Coin object for a denomination value, for handing coins back out. */
const COIN_FOR_VALUE: Record<number, Coin> = {
  5: NICKEL,
  10: DIME,
  25: QUARTER,
};

/** Denomination values, largest first (the order change is selected in). */
const VALUES = [25, 10, 5];

/**
 * The machine's reserve of coins, tracked as counts per denomination. Inserted
 * coins are deposited here and change is withdrawn from it, so money is
 * conserved: coins are never minted or destroyed, only moved.
 */
export class CoinBank {
  private counts = new Map<number, number>();

  static fromCoins(coins: Coin[]): CoinBank {
    const bank = new CoinBank();
    for (const coin of coins) {
      bank.add(coin);
    }
    return bank;
  }

  /** Adds a coin to the bank. Unrecognized coins are ignored (no value). */
  add(coin: Coin): void {
    const value = valueOf(coin);
    if (value !== null) {
      this.counts.set(value, (this.counts.get(value) ?? 0) + 1);
    }
  }

  /** Total value held, in cents. */
  total(): number {
    let sum = 0;
    for (const [value, count] of this.counts) {
      sum += value * count;
    }
    return sum;
  }

  /** Whether the bank can produce exactly `cents` from the coins it holds. */
  canMake(cents: number): boolean {
    return this.selectFor(cents) !== null;
  }

  /**
   * Removes and returns coins totaling exactly `cents`. Throws if the amount
   * cannot be made — callers must check canMake first.
   */
  withdraw(cents: number): Coin[] {
    const selection = this.selectFor(cents);
    if (selection === null) {
      throw new Error(`Cannot make change for ${cents} cents`);
    }
    const coins: Coin[] = [];
    for (const [value, used] of selection) {
      this.counts.set(value, (this.counts.get(value) ?? 0) - used);
      for (let i = 0; i < used; i++) {
        coins.push(COIN_FOR_VALUE[value]!);
      }
    }
    return coins;
  }

  /**
   * Finds how many of each denomination make exactly `cents`, or null if
   * impossible. Tries denominations largest first, but backtracks (a plain
   * greedy pass can fail when a larger coin is available but a smaller-coin
   * solution is required). Returns a map of denomination value -> count used.
   */
  private selectFor(cents: number): Map<number, number> | null {
    const solve = (remaining: number, index: number): Map<number, number> | null => {
      if (remaining === 0) return new Map();
      if (index >= VALUES.length) return null;
      const value = VALUES[index]!;
      const available = this.counts.get(value) ?? 0;
      const maxUsable = Math.min(available, Math.floor(remaining / value));
      for (let used = maxUsable; used >= 0; used--) {
        const rest = solve(remaining - used * value, index + 1);
        if (rest !== null) {
          if (used > 0) rest.set(value, used);
          return rest;
        }
      }
      return null;
    };

    return solve(cents, 0);
  }
}
