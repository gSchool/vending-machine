import type { Coin } from "./coin";
import { QUARTER, DIME, NICKEL } from "./coin";

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
