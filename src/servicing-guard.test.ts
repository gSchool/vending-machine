import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA } from "./product";
import { QUARTER, DIME, NICKEL } from "./coin";

describe("VendingMachine — servicing requires an idle machine (O.0)", () => {
  it("refuses withdraw-all while a customer has money in, leaving state unchanged (O.0.1)", () => {
    const reserve = [
      ...Array(10).fill(QUARTER),
      ...Array(10).fill(DIME),
      ...Array(10).fill(NICKEL),
    ];
    const machine = new VendingMachine(new Map(), reserve);
    machine.insertCoin(QUARTER);
    const cashBefore = machine.cashOnHand();

    const withdrawn = machine.withdrawAll();

    expect(withdrawn).toEqual([]); // nothing handed back
    expect(machine.cashOnHand()).toBe(cashBefore); // cash untouched
    expect(machine.display()).toBe("$0.25"); // balance still pending
  });

  it("refuses restock while a customer has money in (O.0.1)", () => {
    const machine = new VendingMachine(new Map([[COLA, 0]]));
    machine.insertCoin(QUARTER);

    machine.restock(COLA, 5);

    expect(machine.stockOf(COLA)).toBe(0); // stock unchanged
  });

  it("refuses load change while a customer has money in (O.0.1)", () => {
    const machine = new VendingMachine(new Map(), []);
    machine.insertCoin(QUARTER);
    const before = machine.cashOnHand();

    machine.loadChange([DIME, NICKEL]);

    expect(machine.cashOnHand()).toBe(before); // nothing loaded
  });

  it("allows the same actions once the balance is cleared", () => {
    const machine = new VendingMachine(new Map([[COLA, 0]]));
    machine.insertCoin(QUARTER);
    machine.returnCoins(); // back to rest

    machine.restock(COLA, 5);

    expect(machine.stockOf(COLA)).toBe(5);
  });

  it("allows audit reads mid-transaction (O.0.2)", () => {
    const machine = new VendingMachine(new Map(), [QUARTER, DIME, NICKEL]);
    machine.insertCoin(QUARTER);

    // Reads are never refused, even with a balance pending (§O.0.2).
    expect(machine.cashOnHand()).toBe(65); // float + pending coins share the pool
  });
});
