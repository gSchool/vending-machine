import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA, CHIPS } from "./product";
import { QUARTER } from "./coin";

describe("VendingMachine — operator restock (O.1)", () => {
  it("makes a sold-out product available again (O.1.2)", () => {
    const machine = new VendingMachine(new Map([[COLA, 0]]));

    machine.restock(COLA, 5);

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);

    expect(machine.display()).toBe("THANK YOU");
  });

  it("sets the count rather than adding to it (O.1.1)", () => {
    const machine = new VendingMachine(new Map([[CHIPS, 2]]));

    machine.restock(CHIPS, 10);

    expect(machine.stockOf(CHIPS)).toBe(10);
  });

  it("can set a product to zero, marking it sold out", () => {
    const machine = new VendingMachine(new Map([[CHIPS, 5]]));

    machine.restock(CHIPS, 0);
    machine.selectProduct(CHIPS);

    expect(machine.display()).toBe("SOLD OUT");
  });
});
