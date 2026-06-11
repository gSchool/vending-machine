/**
 * A physical coin, as the machine actually encounters it: a slug with a
 * weight and a size. The coin does NOT know its monetary value — the machine
 * measures these properties and assigns a value during classification.
 */
export type Coin = {
  weightGrams: number;
  diameterMm: number;
};

/** Real US specifications for the coins the machine accepts. */
export const NICKEL: Coin = { weightGrams: 5.0, diameterMm: 21.21 };
export const DIME: Coin = { weightGrams: 2.268, diameterMm: 17.91 };
export const QUARTER: Coin = { weightGrams: 5.67, diameterMm: 24.26 };
