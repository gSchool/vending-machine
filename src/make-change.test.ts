import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA } from "./product";
import { QUARTER, DIME, NICKEL } from "./coin";
import { valueOf } from "./coin-classifier";

/** Sum the value of coins in the return, for convenient assertions. */
const totalCents = (coins: ReturnType<VendingMachine["coinReturn"]>): number =>
  coins.reduce((sum, coin) => sum + (valueOf(coin) ?? 0), 0);

describe("VendingMachine — make change", () => {
  it("returns the overpaid amount as change after a purchase", () => {
    const machine = new VendingMachine();

    // $1.25 inserted for a $1.00 cola -> $0.25 change
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);

    expect(totalCents(machine.coinReturn())).toBe(25);
  });

  it("returns change using varied coin denominations", () => {
    const machine = new VendingMachine();

    // $1.40 inserted for a $1.00 cola -> $0.40 change
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(DIME);
    machine.insertCoin(NICKEL);
    machine.selectProduct(COLA);

    expect(totalCents(machine.coinReturn())).toBe(40);
  });
});
