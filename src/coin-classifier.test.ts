import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { valueOf } from "./coin-classifier";
import { NICKEL, DIME, QUARTER, type Coin } from "./coin";

const VALID_COINS: { coin: Coin; value: number }[] = [
  { coin: NICKEL, value: 5 },
  { coin: DIME, value: 10 },
  { coin: QUARTER, value: 25 },
];

/** An arbitrary physical slug with plausible (non-negative, finite) dimensions. */
const arbitraryCoin: fc.Arbitrary<Coin> = fc.record({
  weightGrams: fc.double({ min: 0, max: 100, noNaN: true }),
  diameterMm: fc.double({ min: 0, max: 100, noNaN: true }),
});

/** The ±tolerances the classifier accepts within (§9). */
const WEIGHT_TOLERANCE_G = 0.15;
const DIAMETER_TOLERANCE_MM = 0.15;

/**
 * Whether a slug falls within SOME denomination's acceptance window — weight and
 * diameter both within tolerance of the same coin (§9). A slug outside every
 * window must be rejected.
 */
const FLOAT_EPSILON = 1e-9; // mirror the classifier's boundary slack

const fallsInSomeWindow = (c: Coin): boolean =>
  VALID_COINS.some(
    ({ coin }) =>
      Math.abs(c.weightGrams - coin.weightGrams) <= WEIGHT_TOLERANCE_G + FLOAT_EPSILON &&
      Math.abs(c.diameterMm - coin.diameterMm) <= DIAMETER_TOLERANCE_MM + FLOAT_EPSILON,
  );

describe("valueOf (property-based)", () => {
  it("assigns each valid coin its exact denomination", () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_COINS), ({ coin, value }) => {
        expect(valueOf(coin)).toBe(value);
      }),
    );
  });

  it("rejects any slug that falls outside every acceptance window (§9)", () => {
    fc.assert(
      fc.property(
        arbitraryCoin.filter((c) => !fallsInSomeWindow(c)),
        (slug) => {
          expect(valueOf(slug)).toBeNull();
        },
      ),
    );
  });

  it("only ever returns a known denomination or null", () => {
    fc.assert(
      fc.property(arbitraryCoin, (slug) => {
        const result = valueOf(slug);
        expect(result === null || [5, 10, 25].includes(result)).toBe(true);
      }),
    );
  });
});
