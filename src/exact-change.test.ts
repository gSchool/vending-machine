import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";

describe("VendingMachine — exact change only", () => {
  it("displays EXACT CHANGE ONLY at rest when the machine has no change", () => {
    // No inventory override; an empty change float.
    const machine = new VendingMachine(new Map(), []);

    expect(machine.display()).toBe("EXACT CHANGE ONLY");
  });
});
