import { describe, it, expect } from "vitest";
import { VendingMachine } from "./vending-machine";
import { COLA, CHIPS, CANDY } from "./product";
import { QUARTER, DIME, NICKEL } from "./coin";

/**
 * A machine stocked with every product (and the default ample change). Under §5
 * an unconfigured product starts sold out, so tests that exercise a sale must
 * configure the product's stock explicitly.
 */
const stockedMachine = (): VendingMachine =>
  new VendingMachine(new Map([[COLA, 5], [CHIPS, 5], [CANDY, 5]]));

describe("VendingMachine — select product", () => {
  it("displays the price when a product is selected with no money inserted", () => {
    const machine = stockedMachine();

    machine.selectProduct(COLA);

    expect(machine.display()).toBe("PRICE $1.00");
  });

  it("reverts to INSERT COIN after the price message is shown once", () => {
    const machine = stockedMachine();

    machine.selectProduct(COLA);
    machine.display(); // first check shows the price

    expect(machine.display()).toBe("INSERT COIN");
  });

  it("dispenses and displays THANK YOU when enough money is inserted", () => {
    const machine = stockedMachine();

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);

    expect(machine.display()).toBe("THANK YOU");
  });

  it("resets the balance to zero after a purchase", () => {
    const machine = stockedMachine();

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);
    machine.display(); // first check shows THANK YOU

    expect(machine.display()).toBe("INSERT COIN");
  });

  it("shows the price then the current amount when funds are insufficient", () => {
    const machine = stockedMachine();

    machine.insertCoin(QUARTER);
    machine.selectProduct(COLA);

    expect(machine.display()).toBe("PRICE $1.00");
    expect(machine.display()).toBe("$0.25");
  });

  it("displays the chips price when selected with no money", () => {
    const machine = stockedMachine();

    machine.selectProduct(CHIPS);

    expect(machine.display()).toBe("PRICE $0.50");
  });

  it("dispenses candy and displays THANK YOU with exact change", () => {
    const machine = stockedMachine();

    machine.insertCoin(QUARTER);
    machine.insertCoin(QUARTER);
    machine.insertCoin(DIME);
    machine.insertCoin(NICKEL);
    machine.selectProduct(CANDY);

    expect(machine.display()).toBe("THANK YOU");
  });
});
