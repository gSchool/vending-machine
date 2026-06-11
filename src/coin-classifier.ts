import type { Coin } from "./coin";
import { NICKEL, DIME, QUARTER } from "./coin";

/** The coins the machine recognizes, matched by physical properties. */
const COIN_VALUES: { coin: Coin; value: number }[] = [
  { coin: NICKEL, value: 5 },
  { coin: DIME, value: 10 },
  { coin: QUARTER, value: 25 },
];

/**
 * Assigns a monetary value (in cents) to a physical coin based on its weight
 * and size — the way a real vending machine identifies what was inserted.
 * Returns null for coins it does not recognize (to be rejected).
 */
export function valueOf(coin: Coin): number | null {
  const match = COIN_VALUES.find(
    ({ coin: known }) =>
      coin.weightGrams === known.weightGrams && coin.diameterMm === known.diameterMm,
  );
  return match ? match.value : null;
}
