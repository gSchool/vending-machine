import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { QUARTER, DIME, NICKEL } from "./coin";

describe("VendingMachine — operator load change (O.2)", () => {
  it("keeps EXACT CHANGE ONLY until enough change is loaded, then clears it (O.2.2)", () => {
    // Empty float: at rest the machine warns it cannot make change.
    const machine = new VendingMachine(new Map(), []);
    expect(machine.display()).toBe("EXACT CHANGE ONLY");

    // Not yet enough: a lone nickel can make 5¢ but not every 5¢ step up to the
    // ceiling C ($0.20) — it cannot make 10/15/20 — so the warning persists.
    machine.loadChange([NICKEL]);
    expect(machine.display()).toBe("EXACT CHANGE ONLY");

    // Three dimes now cover every step to C: 5 (N), 10/20 (dimes), 15 (D+N).
    // The machine becomes change-capable (§7) and resumes INSERT COIN.
    machine.loadChange([...Array(3).fill(DIME)]);
    expect(machine.display()).toBe("INSERT COIN");
  });

  it("increases the coins on hand by the loaded value, conserving it (O.2.3)", () => {
    const machine = new VendingMachine(new Map(), [QUARTER]);
    expect(machine.cashOnHand()).toBe(25);

    machine.loadChange([DIME, NICKEL]);

    expect(machine.cashOnHand()).toBe(40);
  });
});
