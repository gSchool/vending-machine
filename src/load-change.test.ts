import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { QUARTER, DIME, NICKEL } from "./coin";

describe("VendingMachine — operator load change (O.2)", () => {
  it("keeps EXACT CHANGE ONLY until enough change is loaded, then clears it (O.2.2)", () => {
    // Empty float: at rest the machine warns it cannot make change.
    const machine = new VendingMachine(new Map(), []);
    expect(machine.display()).toBe("EXACT CHANGE ONLY");

    // Not yet enough: 60¢ in small coins cannot make every 5¢ increment up to
    // the highest price (e.g. it cannot make 65¢), so the warning persists.
    machine.loadChange([
      ...Array(4).fill(NICKEL),
      ...Array(4).fill(DIME),
    ]);
    expect(machine.display()).toBe("EXACT CHANGE ONLY");

    // Topping up with quarters now lets it make every increment up to 95¢.
    machine.loadChange([...Array(4).fill(QUARTER)]);
    expect(machine.display()).toBe("INSERT COIN");
  });

  it("increases the coins on hand by the loaded value, conserving it (O.2.3)", () => {
    const machine = new VendingMachine(new Map(), [QUARTER]);
    expect(machine.cashOnHand()).toBe(25);

    machine.loadChange([DIME, NICKEL]);

    expect(machine.cashOnHand()).toBe(40);
  });
});
