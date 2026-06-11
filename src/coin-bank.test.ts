import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { CoinBank } from "./coin-bank";
import { NICKEL, DIME, QUARTER, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

/** A reserve described by how many of each denomination it holds. */
const reserveCounts = fc.record({
  quarters: fc.integer({ min: 0, max: 6 }),
  dimes: fc.integer({ min: 0, max: 6 }),
  nickels: fc.integer({ min: 0, max: 6 }),
});

const buildCoins = (c: { quarters: number; dimes: number; nickels: number }): Coin[] => [
  ...Array<Coin>(c.quarters).fill(QUARTER),
  ...Array<Coin>(c.dimes).fill(DIME),
  ...Array<Coin>(c.nickels).fill(NICKEL),
];

/**
 * Independent brute-force oracle: is there ANY combination of the available
 * coins that sums to exactly `cents`? Exhaustive triple loop, deliberately not
 * sharing logic with CoinBank.canMake.
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

describe("CoinBank", () => {
  it("starts empty and reports zero total", () => {
    const bank = new CoinBank();

    expect(bank.total()).toBe(0);
  });

  it("tallies the coins it is built from", () => {
    const bank = CoinBank.fromCoins([QUARTER, DIME, NICKEL]);

    expect(bank.total()).toBe(40);
  });

  it("grows when a coin is added", () => {
    const bank = new CoinBank();

    bank.add(QUARTER);

    expect(bank.total()).toBe(25);
  });

  it("can make an amount it has exact coins for", () => {
    const bank = CoinBank.fromCoins([QUARTER, DIME, NICKEL]);

    expect(bank.canMake(35)).toBe(true); // quarter + dime
  });

  it("cannot make an amount it lacks the coins for", () => {
    const bank = CoinBank.fromCoins([QUARTER, QUARTER]);

    expect(bank.canMake(10)).toBe(false); // no dimes or nickels
  });

  it("withdraws coins totaling the requested amount and removes them", () => {
    const bank = CoinBank.fromCoins([QUARTER, DIME, NICKEL]);

    const withdrawn = bank.withdraw(30); // quarter + nickel

    expect(totalCents(withdrawn)).toBe(30);
    expect(bank.total()).toBe(10); // the dime remains
  });
});

describe("CoinBank (property-based)", () => {
  it("canMake agrees with an independent brute-force oracle", () => {
    fc.assert(
      fc.property(reserveCounts, fc.integer({ min: 0, max: 200 }), (counts, cents) => {
        const expected = oracleCanMake(counts, cents);
        expect(CoinBank.fromCoins(buildCoins(counts)).canMake(cents)).toBe(expected);
      }),
    );
  });

  it("withdraw conserves value: returns the amount and reduces the bank by it", () => {
    fc.assert(
      fc.property(reserveCounts, fc.integer({ min: 0, max: 200 }), (counts, cents) => {
        const bank = CoinBank.fromCoins(buildCoins(counts));
        const before = bank.total();
        fc.pre(bank.canMake(cents)); // only test withdrawable amounts

        const withdrawn = bank.withdraw(cents);

        expect(totalCents(withdrawn)).toBe(cents);
        expect(bank.total()).toBe(before - cents);
      }),
    );
  });
});
