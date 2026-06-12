import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { VendingMachine } from "./vending-machine";
import { QUARTER, DIME, NICKEL, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

describe("VendingMachine — operator collect (O.3)", () => {
  it("hands back surplus and stays able to make change (O.3.1, O.3.2)", () => {
    // Ample float: more than the minimum needed to stay change-capable.
    const reserve = [
      ...Array(10).fill(QUARTER),
      ...Array(10).fill(DIME),
      ...Array(10).fill(NICKEL),
    ];
    const machine = new VendingMachine(new Map(), reserve);
    const before = machine.cashOnHand();

    const collected = machine.collect();

    expect(totalCents(collected)).toBeGreaterThan(0); // there was surplus
    expect(machine.display()).toBe("INSERT COIN"); // still change-capable
    // Conserved: what's left + what was collected == what we started with.
    expect(machine.cashOnHand() + totalCents(collected)).toBe(before);
  });

  it("collects nothing when the machine cannot make change (O.3.3)", () => {
    // Quarters only: cannot make a nickel/dime of change — not change-capable.
    const machine = new VendingMachine(new Map(), [QUARTER, QUARTER, QUARTER]);
    expect(machine.display()).toBe("EXACT CHANGE ONLY");
    const before = machine.cashOnHand();

    const collected = machine.collect();

    expect(collected).toEqual([]);
    expect(machine.cashOnHand()).toBe(before);
    expect(machine.display()).toBe("EXACT CHANGE ONLY");
  });

  it("never strands the machine: after collect it is change-capable iff it was before (O.3.2, property)", () => {
    const reserveCounts = fc.record({
      quarters: fc.integer({ min: 0, max: 8 }),
      dimes: fc.integer({ min: 0, max: 8 }),
      nickels: fc.integer({ min: 0, max: 8 }),
    });

    fc.assert(
      fc.property(reserveCounts, (c) => {
        const reserve = [
          ...Array<Coin>(c.quarters).fill(QUARTER),
          ...Array<Coin>(c.dimes).fill(DIME),
          ...Array<Coin>(c.nickels).fill(NICKEL),
        ];
        const machine = new VendingMachine(new Map(), reserve);
        const capableBefore = machine.display() === "INSERT COIN";
        const before = machine.cashOnHand();

        const collected = machine.collect();
        const capableAfter = machine.display() === "INSERT COIN";

        // Capability is preserved exactly (never made worse, never magically better).
        expect(capableAfter).toBe(capableBefore);
        // Money conserved across the collect.
        expect(machine.cashOnHand() + totalCents(collected)).toBe(before);
        // If it wasn't capable, nothing was collected (O.3.3).
        if (!capableBefore) expect(collected).toEqual([]);
      }),
    );
  });
});
