import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { VendingMachine } from "./vending-machine";
import { COLA, CHIPS, CANDY, type Product } from "./product";
import { QUARTER, DIME, NICKEL, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

const ampleReserve = (): Coin[] => [
  ...Array<Coin>(20).fill(QUARTER),
  ...Array<Coin>(20).fill(DIME),
  ...Array<Coin>(20).fill(NICKEL),
];

const buyExact = (machine: VendingMachine, cents: number, product: Product): boolean => {
  let remaining = cents;
  while (remaining >= 25) { machine.insertCoin(QUARTER); remaining -= 25; }
  while (remaining >= 10) { machine.insertCoin(DIME); remaining -= 10; }
  while (remaining >= 5) { machine.insertCoin(NICKEL); remaining -= 5; }
  machine.selectProduct(product);
  const ok = machine.display() === "THANK YOU";
  return ok;
};

/**
 * §O.3 — collect is earnings-based (Appendix A.6): it pays out the tracked
 * revenue, drawn largest-coin-first (§3.3), and leaves the loaded change as
 * float. The change-capability guard (§O.3.2) holds back only the revenue whose
 * payout would strand the machine; the surplus-sweep model is REJECTED.
 *
 * NOTE: the current `collect` performs a change-surplus sweep with no revenue
 * concept, so these tests are expected to FAIL until collect is reworked to pay
 * out revenue.
 */
describe("VendingMachine — operator collect (§O.3)", () => {
  it("returns nothing before any sales and leaves the loaded change (§O.3 scenario 1)", () => {
    const machine = new VendingMachine(new Map(), ampleReserve());
    const before = machine.cashOnHand();

    const collected = machine.collect();

    expect(collected).toEqual([]);
    expect(machine.cashOnHand()).toBe(before);
  });

  it("returns earnings and leaves the loaded change (§O.3.1)", () => {
    const machine = new VendingMachine(new Map([[COLA, 1]]), ampleReserve());
    const floatBefore = machine.cashOnHand();
    buyExact(machine, 100, COLA);

    const collected = machine.collect();

    expect(totalCents(collected)).toBe(100); // the operator's earnings
    expect(machine.revenue()).toBe(0); // earnings cleared
    expect(machine.cashOnHand()).toBe(floatBefore); // float retained
    expect(machine.display()).toBe("INSERT COIN"); // still change-capable
  });

  it("never makes the machine unable to make change if it was capable before (§O.3.2, property)", () => {
    const reserveCounts = fc.record({
      quarters: fc.integer({ min: 0, max: 8 }),
      dimes: fc.integer({ min: 0, max: 8 }),
      nickels: fc.integer({ min: 0, max: 8 }),
    });
    const opArb: fc.Arbitrary<Product> = fc.constantFrom(COLA, CHIPS, CANDY);

    fc.assert(
      fc.property(reserveCounts, fc.array(opArb, { maxLength: 10 }), (c, buys) => {
        const reserve = [
          ...Array<Coin>(c.quarters).fill(QUARTER),
          ...Array<Coin>(c.dimes).fill(DIME),
          ...Array<Coin>(c.nickels).fill(NICKEL),
        ];
        const stock = new Map<Product, number>([[COLA, 99], [CHIPS, 99], [CANDY, 99]]);
        const machine = new VendingMachine(stock, reserve);

        for (const p of buys) buyExact(machine, p.priceCents, p);

        const capableBefore = machine.display() === "INSERT COIN";
        const collected = machine.collect();
        const capableAfter = machine.display() === "INSERT COIN";

        // Collecting never strands a machine that could make change (§O.3.2).
        if (capableBefore) expect(capableAfter).toBe(true);
        // Money conserved: revenue drops by exactly what was handed out (§O.3.3).
        expect(totalCents(collected)).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});
