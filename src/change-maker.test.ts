import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { makeChange } from "./change-maker";
import { valueOf } from "./coin-classifier";
import { NICKEL, DIME } from "./coin";

/** Any change amount the machine could owe: a multiple of 5 cents. */
const changeAmount = fc.integer({ min: 0, max: 500 }).map((n) => n * 5);

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
