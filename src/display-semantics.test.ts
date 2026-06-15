import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA, CHIPS, CANDY } from "./product";
import { QUARTER, DIME } from "./coin";
import { PENNY } from "./invalid-coins.fixtures";

/**
 * §8 Display semantics. At most one one-shot message is pending; a newer message
 * replaces an unread one (§8.3); inserting a valid coin or returning coins clears
 * a pending message (§8.4); an invalid coin, which leaves the balance unchanged,
 * does NOT disturb a pending message (§8.4).
 */
describe("VendingMachine — one-shot display semantics (§8)", () => {
  it("shows a one-shot message once, then reverts to the underlying state (§8.1)", () => {
    const machine = new VendingMachine(new Map([[COLA, 1]]));

    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA); // PRICE $1.00 pending (insufficient funds)

    expect(machine.display()).toBe("PRICE $1.00"); // shown on the next read only
    expect(machine.display()).toBe("$0.25"); // then discarded — balance shows
    expect(machine.display()).toBe("$0.25"); // and stays; the message is gone
  });

  it("shows the balance when funds are in and no one-shot is pending (§8.2)", () => {
    const machine = new VendingMachine();

    machine.insertCoin(QUARTER);
    machine.insertCoin(DIME); // $0.35, no message produced

    expect(machine.display()).toBe("$0.35");
  });

  it("shows the resting state when no funds and no one-shot is pending (§8.2)", () => {
    const machine = new VendingMachine(); // ample reserve, change-capable

    expect(machine.display()).toBe("INSERT COIN");
  });

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

  it("inserting a valid coin clears a pending SOLD OUT message (§8.4)", () => {
    const machine = new VendingMachine(new Map([[COLA, 0]]));

    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA); // SOLD OUT pending, unread
    machine.insertCoin(QUARTER); // clears it

    expect(machine.display()).toBe("$0.50"); // shows balance, not SOLD OUT
  });

  it("inserting a valid coin clears a pending EXACT CHANGE ONLY from a refused sale (§8.4)", () => {
    // Empty bank: $1.00 toward $0.65 candy owes 35¢, unmakeable -> refused, the
    // balance is returned, and EXACT CHANGE ONLY is pending. A fresh coin clears
    // that one-shot and the next read shows the new balance.
    const machine = new VendingMachine(new Map([[CANDY, 1]]), []);

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(CANDY); // refused -> balance returned, ECO pending
    machine.insertCoin(QUARTER); // clears the pending one-shot

    expect(machine.display()).toBe("$0.25"); // new balance, not EXACT CHANGE ONLY
  });

  it("returning coins clears a pending SOLD OUT message (§8.4)", () => {
    const machine = new VendingMachine(new Map([[COLA, 0]]));

    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA); // SOLD OUT pending, unread
    machine.returnCoins(); // clears it and the balance

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

  it("an operator action does NOT disturb a pending one-shot (§8.5)", () => {
    const machine = new VendingMachine(new Map([[CHIPS, 1]]));

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER); // $0.50, exact
    machine.selectProduct(CHIPS); // THANK YOU pending, balance back to 0 (idle)

    machine.restock(COLA, 5); // permitted (idle), must not clear the one-shot

    expect(machine.display()).toBe("THANK YOU"); // still shown on the next read
  });
});
