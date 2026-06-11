import type { Coin } from "./coin";
import { QUARTER, DIME, NICKEL } from "./coin";
import { valueOf } from "./coin-classifier";

/** Denominations the machine dispenses, largest first for greedy change. */
const DENOMINATIONS: { coin: Coin; value: number }[] = [
  { coin: QUARTER, value: 25 },
  { coin: DIME, value: 10 },
  { coin: NICKEL, value: 5 },
];

/**
 * Breaks an amount in cents into physical coins to dispense as change.
 * Greedy: takes the largest denomination first. Because US coin values are
 * canonical and the amount is always a multiple of 5, this yields the fewest
 * coins and the remainder always reaches exactly 0.
 */
export function makeChange(cents: number): Coin[] {
  const coins: Coin[] = [];
  let remaining = cents;
  for (const { coin, value } of DENOMINATIONS) {
    while (remaining >= value) {
      coins.push(coin);
      remaining -= value;
    }
  }
  return coins;
}

/** Tallies how many of each denomination value a reserve of coins holds. */
function tally(reserve: Coin[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const coin of reserve) {
    const value = valueOf(coin);
    if (value !== null) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Whether a finite reserve of coins can produce exactly `cents`. Tries every
 * feasible count of each denomination (largest first), since a plain greedy
 * pass can fail when a larger coin is available but a smaller-coin solution is
 * required. The search space is tiny (three denominations), so this is cheap.
 */
export function canMakeAmount(reserve: Coin[], cents: number): boolean {
  const counts = tally(reserve);
  const values = DENOMINATIONS.map((d) => d.value); // [25, 10, 5]

  const solve = (remaining: number, index: number): boolean => {
    if (remaining === 0) return true;
    if (index >= values.length) return false;
    const value = values[index]!;
    const available = counts.get(value) ?? 0;
    const maxUsable = Math.min(available, Math.floor(remaining / value));
    for (let used = maxUsable; used >= 0; used--) {
      if (solve(remaining - used * value, index + 1)) return true;
    }
    return false;
  };

  return solve(cents, 0);
}
