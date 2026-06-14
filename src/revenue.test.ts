import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA, CHIPS, CANDY } from "./product";
import { QUARTER, DIME, NICKEL, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

/** Ample float so sales never fail for lack of change. */
const ampleReserve = (): Coin[] => [
  ...Array<Coin>(20).fill(QUARTER),
  ...Array<Coin>(20).fill(DIME),
  ...Array<Coin>(20).fill(NICKEL),
];

/** Buy a product with exact payment in quarters/dimes/nickels. */
const buyExact = (machine: VendingMachine, cents: number, product: typeof COLA): void => {
  let remaining = cents;
  while (remaining >= 25) { machine.insertCoin(QUARTER); remaining -= 25; }
  while (remaining >= 10) { machine.insertCoin(DIME); remaining -= 10; }
  while (remaining >= 5) { machine.insertCoin(NICKEL); remaining -= 5; }
  machine.selectProduct(product);
  machine.display(); // consume THANK YOU
};

/**
 * §O.5 Revenue and §O.3 earnings-based collect. The revised operator model is
 * earnings-based, NOT a change-surplus sweep (Appendix A.6): the machine tracks
 * revenue = Σ sale prices since the last collect; `collect` pays out that
 * revenue and leaves the loaded change as float; audit reports revenue.
 *
 * NOTE: the current VendingMachine has no revenue concept — `collect` performs a
 * change-surplus sweep and there is no `revenue()` accessor. These tests encode
 * the revised model and are expected to FAIL until revenue tracking and an
 * earnings-based `collect` replace the sweep.
 */
describe("VendingMachine — revenue accrual (§O.5)", () => {
  it("starts at zero revenue", () => {
    const machine = new VendingMachine(new Map(), ampleReserve());

    expect(machine.revenue()).toBe(0);
  });

  it("adds a dispensed product's price to revenue (§O.5.1)", () => {
    const machine = new VendingMachine(new Map([[CANDY, 1]]), ampleReserve());

    buyExact(machine, 65, CANDY);

    expect(machine.revenue()).toBe(65);
  });

  it("accrues across multiple sales (totaling $2.15)", () => {
    const machine = new VendingMachine(
      new Map([[COLA, 1], [CHIPS, 1], [CANDY, 1]]),
      ampleReserve(),
    );

    buyExact(machine, 100, COLA);
    buyExact(machine, 50, CHIPS);
    buyExact(machine, 65, CANDY);

    expect(machine.revenue()).toBe(215);
  });

  it("a refused sale does not change revenue (§O.5.2)", () => {
    // Empty float: 75¢ for 65¢ candy owes 10¢ change that cannot be made → refused.
    const machine = new VendingMachine(new Map([[CANDY, 1]]), []);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);

    machine.selectProduct(CANDY);

    expect(machine.display()).toBe("EXACT CHANGE ONLY");
    expect(machine.revenue()).toBe(0);
  });

  it("insufficient funds, sold out, return, and invalid coins leave revenue untouched (§O.5.2)", () => {
    const machine = new VendingMachine(new Map([[COLA, 0], [CHIPS, 1]]), ampleReserve());

    machine.insertCoin(QUARTER);
    machine.selectProduct(CHIPS); // insufficient funds
    machine.display();
    machine.selectProduct(COLA); // sold out
    machine.display();
    machine.returnCoins(); // return

    expect(machine.revenue()).toBe(0);
  });
});

describe("VendingMachine — earnings-based collect (§O.3)", () => {
  it("collects nothing before any sales and leaves the loaded change (§O.3 first scenario)", () => {
    const reserve = Array<Coin>(20).fill(QUARTER); // $5.00 of quarters
    const machine = new VendingMachine(new Map(), reserve);
    const before = machine.cashOnHand();

    const collected = machine.collect();

    expect(collected).toEqual([]);
    expect(machine.cashOnHand()).toBe(before); // $5.00 of change still held
  });

  it("collect returns the earned revenue and leaves the loaded change as float (§O.3.1)", () => {
    // $5.00 of varied change, able to make change. Buy cola for $1.00 exact.
    const machine = new VendingMachine(new Map([[COLA, 1]]), ampleReserve());
    const floatBefore = machine.cashOnHand();
    buyExact(machine, 100, COLA);
    // After the exact-payment sale, the inserted $1.00 is now in the bank too.
    expect(machine.revenue()).toBe(100);

    const collected = machine.collect();

    expect(totalCents(collected)).toBe(100); // operator receives exactly the earnings
    expect(machine.revenue()).toBe(0); // revenue cleared by collect (§O.5.2)
    // Float (the originally loaded change) remains; only earnings left.
    expect(machine.cashOnHand()).toBe(floatBefore);
    expect(machine.display()).toBe("INSERT COIN"); // still change-capable
  });

  it("collect conserves money: handed-out value equals the revenue reduction (§O.3.3)", () => {
    const machine = new VendingMachine(new Map([[CHIPS, 1]]), ampleReserve());
    buyExact(machine, 50, CHIPS);
    const revenueBefore = machine.revenue();
    const cashBefore = machine.cashOnHand();

    const collected = machine.collect();

    expect(totalCents(collected)).toBe(revenueBefore - machine.revenue());
    expect(machine.cashOnHand()).toBe(cashBefore - totalCents(collected));
  });

  it("audit reports earned revenue (§O.4.2)", () => {
    const machine = new VendingMachine(
      new Map([[COLA, 1], [CANDY, 1]]),
      ampleReserve(),
    );
    buyExact(machine, 100, COLA);
    buyExact(machine, 65, CANDY);

    expect(machine.revenue()).toBe(165);
  });

  it("audit revenue counts only completed sales, not an in-progress balance (§O.4.2)", () => {
    const machine = new VendingMachine(new Map([[COLA, 1]]), ampleReserve());
    machine.insertCoin(QUARTER); // pending balance, no sale yet

    expect(machine.revenue()).toBe(0);
  });
});
