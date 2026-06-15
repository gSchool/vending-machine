import type { Coin } from "./coin";
import { NICKEL, DIME, QUARTER } from "./coin";

/**
 * Acceptance tolerance for matching a coin to a denomination (§9). A coin is
 * recognized when BOTH its weight and its diameter fall within this tolerance of
 * a denomination's nominal. Exact equality is never required — real coins are
 * worn and dirty — so acceptance is by window.
 *
 * The nominal diameters are >3 mm apart, so a ±0.15 mm window keeps the three
 * denominations pairwise disjoint: no coin is ever accepted as two of them.
 */
const WEIGHT_TOLERANCE_G = 0.15;
const DIAMETER_TOLERANCE_MM = 0.15;

/**
 * A tiny slack added to the comparison so a measurement exactly at a window
 * boundary (e.g. 4.85 g, the nickel's low edge) is accepted despite binary
 * floating-point representation error — |4.85 − 5.0| evaluates to
 * 0.1500000000000003, a hair over the nominal 0.15. The §9 windows are
 * inclusive ranges, so the boundary belongs inside.
 */
const FLOAT_EPSILON = 1e-9;

/** The coins the machine recognizes, with their nominal physical properties. */
const COIN_VALUES: { coin: Coin; value: number }[] = [
  { coin: NICKEL, value: 5 },
  { coin: DIME, value: 10 },
  { coin: QUARTER, value: 25 },
];

const within = (measured: number, nominal: number, tolerance: number): boolean =>
  Math.abs(measured - nominal) <= tolerance + FLOAT_EPSILON;

/**
 * Assigns a monetary value (in cents) to a physical coin based on its weight and
 * size — the way a real vending machine identifies what was inserted. A coin is
 * valid only when its weight and diameter both fall within the SAME
 * denomination's window (§9). Returns null for coins it does not recognize
 * (to be rejected).
 */
export function valueOf(coin: Coin): number | null {
  const match = COIN_VALUES.find(
    ({ coin: known }) =>
      within(coin.weightGrams, known.weightGrams, WEIGHT_TOLERANCE_G) &&
      within(coin.diameterMm, known.diameterMm, DIAMETER_TOLERANCE_MM),
  );
  return match ? match.value : null;
}
