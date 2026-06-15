import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA } from "./product";
import { QUARTER, DIME, NICKEL } from "./coin";

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

  it("reads do not change the values they report (O.4.1)", () => {
    const machine = new VendingMachine(new Map([[COLA, 3]]), [QUARTER, DIME, NICKEL]);

    expect(machine.cashOnHand()).toBe(machine.cashOnHand());
    expect(machine.stockOf(COLA)).toBe(machine.stockOf(COLA));
    expect(machine.coinReturn()).toEqual([]); // nothing dispensed by reading
  });
});
