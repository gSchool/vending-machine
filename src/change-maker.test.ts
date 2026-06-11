import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { makeChange, canMakeAmount } from "./change-maker";
import { valueOf } from "./coin-classifier";
import { NICKEL, DIME, QUARTER, type Coin } from "./coin";

/** Any change amount the machine could owe: a multiple of 5 cents. */
const changeAmount = fc.integer({ min: 0, max: 500 }).map((n) => n * 5);

/** A reserve described by how many of each denomination it holds. */
const reserveCounts = fc.record({
  quarters: fc.integer({ min: 0, max: 6 }),
  dimes: fc.integer({ min: 0, max: 6 }),
  nickels: fc.integer({ min: 0, max: 6 }),
});

const buildReserve = (c: { quarters: number; dimes: number; nickels: number }): Coin[] => [
  ...Array<Coin>(c.quarters).fill(QUARTER),
  ...Array<Coin>(c.dimes).fill(DIME),
  ...Array<Coin>(c.nickels).fill(NICKEL),
];

/**
 * Independent brute-force oracle: is there ANY combination of the available
 * coins that sums to exactly `cents`? Exhaustive triple loop, bounded by the
 * small counts above — deliberately not sharing logic with canMakeAmount.
 */
const oracleCanMake = (
  c: { quarters: number; dimes: number; nickels: number },
  cents: number,
): boolean => {
  for (let q = 0; q <= c.quarters; q++) {
    for (let d = 0; d <= c.dimes; d++) {
      for (let n = 0; n <= c.nickels; n++) {
        if (q * 25 + d * 10 + n * 5 === cents) return true;
      }
    }
  }
  return false;
};

describe("makeChange (property-based)", () => {
  it("returns coins that total exactly the requested amount", () => {
    fc.assert(
      fc.property(changeAmount, (cents) => {
        const total = makeChange(cents).reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);
        expect(total).toBe(cents);
      }),
    );
  });

  it("uses the fewest coins (canonical greedy: <=1 nickel, <=2 dimes)", () => {
    fc.assert(
      fc.property(changeAmount, (cents) => {
        const coins = makeChange(cents);
        const nickels = coins.filter((c) => c === NICKEL).length;
        const dimes = coins.filter((c) => c === DIME).length;
        expect(nickels).toBeLessThanOrEqual(1);
        expect(dimes).toBeLessThanOrEqual(2);
      }),
    );
  });
});

describe("canMakeAmount (property-based)", () => {
  it("agrees with an independent brute-force oracle", () => {
    fc.assert(
      fc.property(reserveCounts, fc.integer({ min: 0, max: 200 }), (counts, cents) => {
        const expected = oracleCanMake(counts, cents);
        expect(canMakeAmount(buildReserve(counts), cents)).toBe(expected);
      }),
    );
  });
});
