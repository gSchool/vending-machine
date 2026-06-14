import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { CANDY, CHIPS } from "./product";
import { QUARTER, DIME, NICKEL, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

const countByValue = (coins: Coin[]): [number, number, number] => [
  coins.filter((c) => valueOf(c) === 25).length,
  coins.filter((c) => valueOf(c) === 10).length,
  coins.filter((c) => valueOf(c) === 5).length,
];

describe("VendingMachine — selection precedence (§2.0)", () => {
  it("sold-out takes precedence over a change shortage", () => {
    // candy sold out; reserve holds only quarters so 10¢ change for candy could
    // not be made — but sold-out is checked first, so the balance is left intact
    // and nothing is returned.
    const machine = new VendingMachine(new Map([[CANDY, 0]]), [QUARTER, QUARTER, QUARTER]);

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER); // $0.75 in

    machine.selectProduct(CANDY);

    expect(machine.display()).toBe("SOLD OUT");
    expect(machine.coinReturn()).toEqual([]); // nothing returned
    // Balance still $0.75 — visible on the read after SOLD OUT is consumed.
    expect(machine.display()).toBe("$0.75");
  });

  it("insufficient funds takes precedence over a change shortage", () => {
    // Empty float (cannot make change), but balance is below the price, so the
    // PRICE message wins over EXACT CHANGE ONLY and the balance is untouched.
    const machine = new VendingMachine(new Map([[CHIPS, 1]]), []);
    machine.insertCoin(QUARTER); // $0.25 < $0.50

    machine.selectProduct(CHIPS);

    expect(machine.display()).toBe("PRICE $0.50");
    expect(machine.display()).toBe("$0.25"); // balance intact
  });
});

describe("VendingMachine — payout is largest-coin-first (§3.3)", () => {
  it("returns 25¢ change as a single quarter when quarters are on hand", () => {
    // Reserve has quarters, dimes, and nickels; customer overpays chips by 25¢.
    const reserve: Coin[] = [QUARTER, QUARTER, DIME, DIME, NICKEL, NICKEL];
    const machine = new VendingMachine(new Map([[CHIPS, 1]]), reserve);

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER); // $0.75 for $0.50 chips → 25¢ change
    machine.selectProduct(CHIPS);

    const change = machine.coinReturn();
    expect(totalCents(change)).toBe(25);
    expect(countByValue(change)).toEqual([1, 0, 0]); // one quarter, no dime/nickel
  });

  it("a return can hand back a larger coin than was inserted (coin-changer effect)", () => {
    // Insert two dimes + a nickel (25¢) into a reserve flush with quarters, then
    // return. Largest-first pays the 25¢ back as a single quarter.
    const reserve: Coin[] = [QUARTER, QUARTER, QUARTER];
    const machine = new VendingMachine(new Map(), reserve);

    machine.insertCoin(DIME);
    machine.insertCoin(DIME);
    machine.insertCoin(NICKEL);
    machine.returnCoins();

    const returned = machine.coinReturn();
    expect(totalCents(returned)).toBe(25);
    expect(countByValue(returned)).toEqual([1, 0, 0]); // came back as a quarter
  });
});

describe("VendingMachine — completes when change can be made from the whole pool (§6.2)", () => {
  it("uses the customer's just-inserted coins to make change (§1.1, §6.2)", () => {
    // Empty reserve; the customer inserts six dimes for 50¢ chips, owing 10¢.
    // The owed dime must come from the customer's own inserted coins.
    const machine = new VendingMachine(new Map([[CHIPS, 1]]), []);

    for (let i = 0; i < 6; i++) machine.insertCoin(DIME); // 60¢ in
    machine.selectProduct(CHIPS);

    expect(machine.display()).toBe("THANK YOU");
    expect(totalCents(machine.coinReturn())).toBe(10); // 10¢ change made from the pool
  });
});
