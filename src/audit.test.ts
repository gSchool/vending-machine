import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA } from "./product";
import { QUARTER, DIME, NICKEL, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

describe("VendingMachine — operator audit (O.4)", () => {
  it("reports the value of coins on hand", () => {
    const machine = new VendingMachine(new Map(), [QUARTER, DIME, NICKEL]);

    expect(machine.cashOnHand()).toBe(40);
  });

  it("reports remaining stock of a product", () => {
    const machine = new VendingMachine(new Map([[COLA, 3]]));

    expect(machine.stockOf(COLA)).toBe(3);
  });

  it("does not change state when read (O.4.1)", () => {
    const machine = new VendingMachine(new Map(), [QUARTER, DIME, NICKEL]);

    const first = machine.cashOnHand();
    const second = machine.cashOnHand();

    expect(first).toBe(second);
    expect(machine.coinReturn()).toEqual([]); // nothing dispensed by reading
  });

  it("is allowed mid-transaction and includes the customer's pending coins (O.4.2)", () => {
    // Empty float so the only cash on hand is what the customer inserts.
    const machine = new VendingMachine(new Map(), []);

    machine.insertCoin(QUARTER);

    expect(machine.cashOnHand()).toBe(25); // pending coins share the pool
    expect(machine.display()).toBe("$0.25"); // reading cash didn't disturb the sale
  });

  it("reports the collectable surplus without changing state (O.4.1, O.4.2)", () => {
    const reserve = [
      ...Array(10).fill(QUARTER),
      ...Array(10).fill(DIME),
      ...Array(10).fill(NICKEL),
    ];
    const machine = new VendingMachine(new Map(), reserve);
    const before = machine.cashOnHand();

    const surplus = machine.collectableSurplus();

    expect(surplus).toBeGreaterThan(0); // there is collectable surplus
    expect(machine.cashOnHand()).toBe(before); // reading did not remove anything
  });

  it("reports the surplus equal to what collect() actually hands back", () => {
    const reserve = [
      ...Array(10).fill(QUARTER),
      ...Array(10).fill(DIME),
      ...Array(10).fill(NICKEL),
    ];
    const machine = new VendingMachine(new Map(), reserve);

    const predicted = machine.collectableSurplus();
    const collected = machine.collect();

    expect(totalCents(collected)).toBe(predicted); // the read predicts the action
  });

  it("reports zero surplus when the machine cannot make change (O.3.3)", () => {
    const machine = new VendingMachine(new Map(), [QUARTER, QUARTER, QUARTER]);

    expect(machine.collectableSurplus()).toBe(0);
  });
});
