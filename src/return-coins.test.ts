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

  it("observing the coin return does not empty it; collecting does (§4)", () => {
    const machine = new VendingMachine();

    machine.insertCoin(QUARTER);
    machine.insertCoin(DIME);
    machine.returnCoins();

    // Observing is non-destructive: repeated reads report the same coins.
    expect(totalCents(machine.coinReturn())).toBe(35);
    expect(totalCents(machine.coinReturn())).toBe(35);

    // Collecting hands the coins back and empties the return.
    expect(totalCents(machine.collectCoinReturn())).toBe(35);
    expect(totalCents(machine.coinReturn())).toBe(0);
    expect(totalCents(machine.collectCoinReturn())).toBe(0); // nothing left
  });

  it("accumulates across actions until collected (§4)", () => {
    const machine = new VendingMachine();

    machine.insertCoin(QUARTER);
    machine.returnCoins(); // 25¢ in the return
    machine.insertCoin(DIME);
    machine.returnCoins(); // another 10¢ — accumulates, not replaced

    expect(totalCents(machine.collectCoinReturn())).toBe(35);
  });
});
