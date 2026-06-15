import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { CHIPS } from "./product";
// CHIPS stock is configured where a sale is exercised; unconfigured products
// start sold out under §5.
import { QUARTER, DIME, NICKEL, type Coin } from "./coin";

/**
 * §7 / Appendix A.5 — the change guarantee ceiling is C = $0.20, derived from
 * the coins (largest 25¢ − smallest 5¢), NOT from the highest product price.
 * At rest the machine warns EXACT CHANGE ONLY iff it cannot make EVERY 5¢ step
 * from 5¢ up to and INCLUDING 20¢ (5, 10, 15, 20).
 *
 * NOTE: the current canMakeChange() loops up to the highest price (95¢
 * exclusive), so these tests encode the revised C=$0.20 rule and are expected to
 * FAIL until canMakeChange is re-grounded on the ceiling C. In particular a
 * machine that can make every step up to 20¢ but NOT 65¢/95¢ should now show
 * INSERT COIN, where today it wrongly warns.
 */
describe("VendingMachine — change ceiling C = $0.20 (§7)", () => {
  it("does NOT warn when it can make every 5¢ step up to C ($0.20), even if it cannot make 95¢", () => {
    // 1 quarter + 2 dimes + 1 nickel = makes 5,10,15,20 (and 25), but the whole
    // float is only 50¢ — far short of making 65¢ or 95¢. Under C=$0.20 this is
    // change-capable and must show INSERT COIN.
    const float: Coin[] = [QUARTER, DIME, DIME, NICKEL];
    const machine = new VendingMachine(new Map(), float);

    expect(machine.display()).toBe("INSERT COIN");
  });

  it("warns when it cannot make some step at or below C — missing 15¢ (only quarters and a nickel)", () => {
    // Can make 5 and 25, but not 10, 15, or 20. Must warn.
    const machine = new VendingMachine(new Map(), [QUARTER, NICKEL]);

    expect(machine.display()).toBe("EXACT CHANGE ONLY");
  });

  it("warns with no change at all on hand", () => {
    const machine = new VendingMachine(new Map(), []);

    expect(machine.display()).toBe("EXACT CHANGE ONLY");
  });

  it("treats C as inclusive: a float that makes up to 15¢ but not 20¢ still warns", () => {
    // A nickel + a dime make 5, 10, and 15 but cannot make 20¢. 20¢ is at the
    // ceiling C and is required, so the machine must warn.
    const machine = new VendingMachine(new Map(), [NICKEL, DIME]);

    expect(machine.display()).toBe("EXACT CHANGE ONLY");
  });

  it("suppresses the warning while a balance is pending, regardless of change (§7.2)", () => {
    const machine = new VendingMachine(new Map(), []); // cannot make change
    machine.insertCoin(QUARTER);

    expect(machine.display()).toBe("$0.25");
  });

  it("§6↔§7 invariant: a change-capable machine completes a sale owing ≤ C", () => {
    // Change-capable float that can make every step to C but is otherwise lean.
    // Customer stops at the price + at most C overshoot: owe 15¢ on chips.
    const float: Coin[] = [QUARTER, DIME, DIME, NICKEL];
    const machine = new VendingMachine(new Map([[CHIPS, 1]]), float);
    expect(machine.display()).toBe("INSERT COIN"); // change-capable at rest

    // Insert 65¢ for 50¢ chips → owe 15¢ (≤ C). Must complete.
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(DIME);
    machine.insertCoin(NICKEL);
    machine.selectProduct(CHIPS);

    expect(machine.display()).toBe("THANK YOU");
  });
});
