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

const matchesAValidCoin = (c: Coin): boolean =>
  VALID_COINS.some(
    ({ coin }) => c.weightGrams === coin.weightGrams && c.diameterMm === coin.diameterMm,
  );

describe("valueOf (property-based)", () => {
  it("assigns each valid coin its exact denomination", () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_COINS), ({ coin, value }) => {
        expect(valueOf(coin)).toBe(value);
      }),
    );
  });

  it("rejects any slug that is not an exact match for a valid coin", () => {
    fc.assert(
      fc.property(
        arbitraryCoin.filter((c) => !matchesAValidCoin(c)),
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
