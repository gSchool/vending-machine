import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { QUARTER } from "./coin";

describe("VendingMachine — exact change only", () => {
  it("displays EXACT CHANGE ONLY at rest when the machine has no change", () => {
    // No inventory override; an empty change float.
    const machine = new VendingMachine(new Map(), []);

    expect(machine.display()).toBe("EXACT CHANGE ONLY");
  });

  it("displays EXACT CHANGE ONLY when the reserve cannot make some needed change", () => {
    // Quarters only: cannot produce a nickel or dime of change.
    const machine = new VendingMachine(new Map(), [QUARTER, QUARTER, QUARTER]);

    expect(machine.display()).toBe("EXACT CHANGE ONLY");
  });
});
