import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA, CHIPS } from "./product";
import { QUARTER } from "./coin";
import { PENNY } from "./invalid-coins.fixtures";

/**
 * §8 Display semantics. At most one one-shot message is pending; a newer message
 * replaces an unread one (§8.3); inserting a valid coin or returning coins clears
 * a pending message (§8.4); an invalid coin, which leaves the balance unchanged,
 * does NOT disturb a pending message (§8.4).
 */
describe("VendingMachine — one-shot display semantics (§8)", () => {
  it("a newer one-shot replaces an unread one (§8.3)", () => {
    const machine = new VendingMachine(new Map([[COLA, 1], [CHIPS, 1]]));

    machine.insertCoin(QUARTER); // $0.25
    machine.selectProduct(COLA); // PRICE $1.00 pending (insufficient), unread
    machine.selectProduct(CHIPS); // PRICE $0.50 supersedes it

    expect(machine.display()).toBe("PRICE $0.50");
    expect(machine.display()).toBe("$0.25"); // then the balance
  });

  it("inserting a valid coin clears a pending message (§8.4)", () => {
    const machine = new VendingMachine(new Map([[COLA, 1]]));

    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA); // PRICE $1.00 pending, unread
    machine.insertCoin(QUARTER); // clears the pending message

    expect(machine.display()).toBe("$0.50"); // shows balance, not PRICE
  });

  it("returning coins clears a pending message (§8.4)", () => {
    const machine = new VendingMachine(new Map([[COLA, 1]]));

    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA); // PRICE $1.00 pending, unread
    machine.returnCoins(); // clears the pending message and the balance

    expect(machine.display()).toBe("INSERT COIN");
  });

  it("an invalid coin does NOT disturb a pending message (§8.4)", () => {
    const machine = new VendingMachine(new Map([[COLA, 1]]));

    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA); // PRICE $1.00 pending, unread
    machine.insertCoin(PENNY); // rejected — balance unchanged, message intact

    expect(machine.display()).toBe("PRICE $1.00"); // still shown on next read
    expect(machine.display()).toBe("$0.25"); // then the balance
  });
});
