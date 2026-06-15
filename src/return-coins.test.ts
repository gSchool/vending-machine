import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { QUARTER, DIME } from "./coin";
import { valueOf } from "./coin-classifier";

/** Sum the value of coins in the return, for convenient assertions. */
const totalCents = (coins: ReturnType<VendingMachine["coinReturn"]>): number =>
  coins.reduce((sum, coin) => sum + (valueOf(coin) ?? 0), 0);

describe("VendingMachine — return coins", () => {
  it("places the inserted amount in the coin return", () => {
    const machine = new VendingMachine();

    machine.insertCoin(QUARTER);
    machine.insertCoin(DIME);
    machine.returnCoins();

    expect(totalCents(machine.coinReturn())).toBe(35);
  });

  it("resets the display to INSERT COIN after returning coins", () => {
    const machine = new VendingMachine();

    machine.insertCoin(QUARTER);
    machine.insertCoin(DIME);
    machine.returnCoins();

    expect(machine.display()).toBe("INSERT COIN");
  });

  it("returns nothing and stays at rest when no coins are inserted (§4.1)", () => {
    const machine = new VendingMachine();

    machine.returnCoins();

    expect(totalCents(machine.coinReturn())).toBe(0); // nothing to return
    expect(machine.display()).toBe("INSERT COIN");
  });
});
