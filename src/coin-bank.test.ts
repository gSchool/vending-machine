import { describe, it, expect } from "vitest";
import { CoinBank } from "./coin-bank";
import { NICKEL, DIME, QUARTER, type Coin } from "./coin";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

describe("CoinBank", () => {
  it("starts empty and reports zero total", () => {
    const bank = new CoinBank();

    expect(bank.total()).toBe(0);
  });

  it("tallies the coins it is built from", () => {
    const bank = CoinBank.fromCoins([QUARTER, DIME, NICKEL]);

    expect(bank.total()).toBe(40);
  });

  it("grows when a coin is added", () => {
    const bank = new CoinBank();

    bank.add(QUARTER);

    expect(bank.total()).toBe(25);
  });

  it("can make an amount it has exact coins for", () => {
    const bank = CoinBank.fromCoins([QUARTER, DIME, NICKEL]);

    expect(bank.canMake(35)).toBe(true); // quarter + dime
  });

  it("cannot make an amount it lacks the coins for", () => {
    const bank = CoinBank.fromCoins([QUARTER, QUARTER]);

    expect(bank.canMake(10)).toBe(false); // no dimes or nickels
  });

  it("withdraws coins totaling the requested amount and removes them", () => {
    const bank = CoinBank.fromCoins([QUARTER, DIME, NICKEL]);

    const withdrawn = bank.withdraw(30); // quarter + nickel

    expect(totalCents(withdrawn)).toBe(30);
    expect(bank.total()).toBe(10); // the dime remains
  });
});
