import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { CoinBank } from "./coin-bank";
import { NICKEL, DIME, QUARTER, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const buildCoins = (c: { quarters: number; dimes: number; nickels: number }): Coin[] => [
  ...Array<Coin>(c.quarters).fill(QUARTER),
  ...Array<Coin>(c.dimes).fill(DIME),
  ...Array<Coin>(c.nickels).fill(NICKEL),
];

/**
 * Independent oracle: among ALL ways to make `cents` from the available coins,
 * the "spend largest first" objective = lexicographically maximize
 * (quarters used, dimes used) — i.e. use as many quarters as possible, then as
 * many dimes as possible. Returns the optimal [q, d, n] or null.
 */
const oracleSelection = (
  c: { quarters: number; dimes: number; nickels: number },
  cents: number,
): [number, number, number] | null => {
  let best: [number, number, number] | null = null;
  for (let q = 0; q <= c.quarters; q++) {
    for (let d = 0; d <= c.dimes; d++) {
      for (let n = 0; n <= c.nickels; n++) {
        if (q * 25 + d * 10 + n * 5 !== cents) continue;
        if (best === null || q > best[0] || (q === best[0] && d > best[1])) {
          best = [q, d, n];
        }
      }
    }
  }
  return best;
};

const countByValue = (coins: Coin[]): [number, number, number] => [
  coins.filter((c) => valueOf(c) === 25).length,
  coins.filter((c) => valueOf(c) === 10).length,
  coins.filter((c) => valueOf(c) === 5).length,
];

describe("CoinBank — withdraw spends largest coins first (gap #1)", () => {
  it("withdraw matches the spend-largest-first oracle", () => {
    const reserveCounts = fc.record({
      quarters: fc.integer({ min: 0, max: 6 }),
      dimes: fc.integer({ min: 0, max: 6 }),
      nickels: fc.integer({ min: 0, max: 6 }),
    });

    fc.assert(
      fc.property(reserveCounts, fc.integer({ min: 0, max: 150 }), (counts, cents) => {
        const expected = oracleSelection(counts, cents);
        const bank = CoinBank.fromCoins(buildCoins(counts));

        if (expected === null) {
          expect(bank.canMake(cents)).toBe(false);
          return;
        }
        const withdrawn = bank.withdraw(cents);
        expect(countByValue(withdrawn)).toEqual(expected);
      }),
    );
  });

  it("does not spend a quarter when smaller coins suffice", () => {
    // Owe 10¢ with a quarter present: must use 2 nickels, keep the quarter.
    const bank = CoinBank.fromCoins([QUARTER, NICKEL, NICKEL]);

    expect(countByValue(bank.withdraw(10))).toEqual([0, 0, 2]);
  });
});
