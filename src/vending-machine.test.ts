import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { NICKEL, DIME, QUARTER } from "./coin";
import { PENNY, HALF_DOLLAR, DOLLAR_COIN, BLANK_SLUG } from "./invalid-coins.fixtures";

describe("VendingMachine", () => {
  it("displays INSERT COIN when no coins have been inserted", () => {
    const machine = new VendingMachine();

    expect(machine.display()).toBe("INSERT COIN");
  });

  it.each([
    ["a penny", PENNY],
    ["a half dollar", HALF_DOLLAR],
    ["a dollar coin", DOLLAR_COIN],
    ["a blank slug", BLANK_SLUG],
  ])("rejects %s, leaving the display unchanged", (_label, coin) => {
    const machine = new VendingMachine();

    machine.insertCoin(coin);

    expect(machine.display()).toBe("INSERT COIN");
  });

  it("displays the coin's value after a valid coin is inserted", () => {
    const machine = new VendingMachine();

    machine.insertCoin(NICKEL);

    expect(machine.display()).toBe("$0.05");
  });

  it("displays $0.10 after a dime is inserted", () => {
    const machine = new VendingMachine();

    machine.insertCoin(DIME);

    expect(machine.display()).toBe("$0.10");
  });

  it("displays $0.25 after a quarter is inserted", () => {
    const machine = new VendingMachine();

    machine.insertCoin(QUARTER);

    expect(machine.display()).toBe("$0.25");
  });

  it("accumulates the value of multiple coins", () => {
    const machine = new VendingMachine();

    machine.insertCoin(QUARTER);
    machine.insertCoin(DIME);

    expect(machine.display()).toBe("$0.35");
  });
});
