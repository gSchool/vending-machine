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

const buyExact = (machine: VendingMachine, cents: number, product: Product): void => {
  let remaining = cents;
  while (remaining >= 25) { machine.insertCoin(QUARTER); remaining -= 25; }
  while (remaining >= 10) { machine.insertCoin(DIME); remaining -= 10; }
  while (remaining >= 5) { machine.insertCoin(NICKEL); remaining -= 5; }
  machine.selectProduct(product);
  machine.display(); // consume THANK YOU
};

/**
 * §O.3 — the operator owns all the cash in the machine. `withdrawAll` hands back
 * every coin on hand, drawn largest-denomination-first (§3.3), and empties the
 * bank: the starting reserve, loaded change, and sale proceeds alike. The machine
 * keeps no float back. Re-seeding change afterward is the operator's job (§O.2).
 */
describe("VendingMachine — operator withdraw-all (§O.3)", () => {
  it("withdraws all the loaded change when there have been no sales", () => {
    const machine = new VendingMachine(new Map(), ampleReserve());
    const before = machine.cashOnHand(); // $14.00 of change

    const withdrawn = machine.withdrawAll();

    expect(totalCents(withdrawn)).toBe(before); // operator gets everything
    expect(machine.cashOnHand()).toBe(0); // bank emptied
  });

  it("withdraws reserve plus sale proceeds together (§O.3.1)", () => {
    const machine = new VendingMachine(new Map([[COLA, 1]]), ampleReserve());
    const floatBefore = machine.cashOnHand();
    buyExact(machine, 100, COLA); // exact $1.00 now in the bank too

    const withdrawn = machine.withdrawAll();

    expect(totalCents(withdrawn)).toBe(floatBefore + 100); // float + the sale's cash
    expect(machine.cashOnHand()).toBe(0);
  });

  it("leaves the machine showing EXACT CHANGE ONLY until change is reloaded (§7, §O.2)", () => {
    const machine = new VendingMachine(new Map(), ampleReserve());

    machine.withdrawAll();

    // Empty bank cannot make change, so the resting display warns (§7).
    expect(machine.display()).toBe("EXACT CHANGE ONLY");

    // The operator's remedy is to load change (§O.2), not the machine's to hold back.
    machine.loadChange(ampleReserve());
    expect(machine.display()).toBe("INSERT COIN");
  });

  it("hands back largest-denomination-first (§3.3)", () => {
    // A reserve that can be expressed two ways; largest-first uses the quarter.
    const machine = new VendingMachine(new Map(), [QUARTER, DIME, DIME, NICKEL]);

    const withdrawn = machine.withdrawAll();

    // Every coin comes out, quarters before dimes before nickels.
    expect(withdrawn.map((c) => valueOf(c))).toEqual([25, 10, 10, 5]);
    expect(totalCents(withdrawn)).toBe(50);
  });

  it("conserves money: handed-out value equals the cash removed (§3.2)", () => {
    const machine = new VendingMachine(new Map([[CHIPS, 1]]), ampleReserve());
    buyExact(machine, 50, CHIPS);
    const cashBefore = machine.cashOnHand();

    const withdrawn = machine.withdrawAll();

    expect(totalCents(withdrawn)).toBe(cashBefore);
    expect(machine.cashOnHand()).toBe(0);
  });

  it("a second withdrawal hands back nothing (the bank is already empty)", () => {
    const machine = new VendingMachine(new Map(), ampleReserve());

    machine.withdrawAll();
    const again = machine.withdrawAll();

    expect(again).toEqual([]);
  });

  it("property: withdraw-all empties the bank and conserves the cash on hand", () => {
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

        const cashBefore = machine.cashOnHand();
        const withdrawn = machine.withdrawAll();

        // Everything comes out, and nothing is left behind (no float kept).
        expect(totalCents(withdrawn)).toBe(cashBefore);
        expect(machine.cashOnHand()).toBe(0);
      }),
    );
  });
});
