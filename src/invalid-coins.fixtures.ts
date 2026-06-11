import type { Coin } from "./coin";

/**
 * Test fixtures for coins the machine does NOT accept. These exist only so
 * tests can assert rejection with realistic measurements. Production code has
 * no concept of these coins — to the machine they are simply unrecognized
 * slugs (see coin-classifier: anything that isn't nickel/dime/quarter -> null).
 */
export const PENNY: Coin = { weightGrams: 2.5, diameterMm: 19.05 };
export const HALF_DOLLAR: Coin = { weightGrams: 11.34, diameterMm: 30.61 };
export const DOLLAR_COIN: Coin = { weightGrams: 8.1, diameterMm: 26.49 };

/** A blank, valueless slug that matches no real coin. */
export const BLANK_SLUG: Coin = { weightGrams: 0, diameterMm: 0 };
