import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA } from "./product";
import { QUARTER } from "./coin";

/**
 * §5 / Appendix A.7 — stock is finite-only. "A product with no configured
 * starting count begins sold out (zero)." There is no untracked/unlimited slot;
 * an unconfigured product is treated as zero remaining and shows SOLD OUT until
 * the operator restocks it.
 *
 * NOTE: the current VendingMachine treats a product absent from the inventory
 * map as in stock (stockOf → Infinity, selectProduct only blocks an explicit 0).
 * These tests encode the revised §5 rule and are expected to FAIL until the
 * default is flipped to sold-out.
 */
describe("VendingMachine — unconfigured product starts sold out (§5)", () => {
  it("reports zero remaining for a product with no configured count", () => {
    const machine = new VendingMachine(new Map());

    expect(machine.stockOf(COLA)).toBe(0);
  });

  it("shows SOLD OUT when an unconfigured product is selected", () => {
    const machine = new VendingMachine(new Map());

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);

    expect(machine.display()).toBe("SOLD OUT");
  });

  it("can sell once the operator restocks the unconfigured product", () => {
    const machine = new VendingMachine(new Map());
    machine.restock(COLA, 1);

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);

    expect(machine.display()).toBe("THANK YOU");
  });
});
