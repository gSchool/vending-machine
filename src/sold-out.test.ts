import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA } from "./product";
import { QUARTER } from "./coin";

describe("VendingMachine — sold out", () => {
  it("displays SOLD OUT when the selected product is out of stock", () => {
    const machine = new VendingMachine(new Map([[COLA, 0]]));

    machine.selectProduct(COLA);

    expect(machine.display()).toBe("SOLD OUT");
  });

  it("reverts to the current amount after SOLD OUT is shown once", () => {
    const machine = new VendingMachine(new Map([[COLA, 0]]));

    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);

    expect(machine.display()).toBe("SOLD OUT");
    expect(machine.display()).toBe("$0.25");
  });

  it("becomes sold out after the last item is purchased", () => {
    const machine = new VendingMachine(new Map([[COLA, 1]]));

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);
    machine.display(); // consume THANK YOU

    machine.selectProduct(COLA);

    expect(machine.display()).toBe("SOLD OUT");
  });
});
