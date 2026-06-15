import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { CANDY } from "./product";
import { QUARTER, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

describe("VendingMachine — refuse sale when change cannot be made", () => {
  it("returns the customer's coins and does not dispense", () => {
    // Empty bank; the four inserted quarters cannot make 35c change.
    const machine = new VendingMachine(new Map([[CANDY, 1]]), []);

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(CANDY); // $1.00 for $0.65 -> 35c change, unmakeable

    // The full $1.00 is returned to the customer.
    expect(totalCents(machine.coinReturn())).toBe(100);
  });

  it("leaves the product's stock unchanged when it refuses for lack of change (§6.1)", () => {
    const machine = new VendingMachine(new Map([[CANDY, 1]]), []);

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(CANDY); // refused: 35c change unmakeable

    expect(machine.stockOf(CANDY)).toBe(1); // not dispensed, stock untouched
  });

  it("displays EXACT CHANGE ONLY when it refuses for lack of change", () => {
    const machine = new VendingMachine(new Map([[CANDY, 1]]), []);

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(CANDY);

    expect(machine.display()).toBe("EXACT CHANGE ONLY");
  });
});
