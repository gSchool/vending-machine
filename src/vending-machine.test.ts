import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { VendingMachine } from "./vending-machine";
import { NICKEL, DIME, QUARTER } from "./coin";
import { PENNY, HALF_DOLLAR, DOLLAR_COIN, BLANK_SLUG } from "./invalid-coins.fixtures";

/** A valid coin paired with its known cents value, for property generation. */
const VALID_COIN_VALUES = [
  { coin: NICKEL, value: 5 },
  { coin: DIME, value: 10 },
  { coin: QUARTER, value: 25 },
];

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

  it("places a rejected coin in the coin return immediately", () => {
    const machine = new VendingMachine();

    machine.insertCoin(PENNY);

    expect(machine.coinReturn()).toEqual([PENNY]);
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

  it("displays the summed value of any sequence of valid coins", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...VALID_COIN_VALUES), { minLength: 1 }),
        (coins) => {
          const machine = new VendingMachine();

          for (const { coin } of coins) {
            machine.insertCoin(coin);
          }

          const totalCents = coins.reduce((sum, { value }) => sum + value, 0);
          const expected = `$${(totalCents / 100).toFixed(2)}`;
          expect(machine.display()).toBe(expected);
        },
      ),
    );
  });
});
