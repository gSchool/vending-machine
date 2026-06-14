import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { VendingMachine } from "./vending-machine";
import { NICKEL, DIME, QUARTER, type Coin } from "./coin";
import { COLA, CHIPS, CANDY, type Product } from "./product";
import { valueOf } from "./coin-classifier";

const totalCents = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (valueOf(c) ?? 0), 0);

/** A generous bank so purchases never fail for lack of change. */
const ampleReserve = (): Coin[] => [
  ...Array<Coin>(50).fill(QUARTER),
  ...Array<Coin>(50).fill(DIME),
  ...Array<Coin>(50).fill(NICKEL),
];

/** Operations a customer can perform, as generated tokens. */
type Op = { kind: "insert"; coin: Coin } | { kind: "select"; product: Product };

const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.constantFrom(QUARTER, DIME, NICKEL).map((coin): Op => ({ kind: "insert", coin })),
  fc.constantFrom(COLA, CHIPS, CANDY).map((product): Op => ({ kind: "select", product })),
);

describe("VendingMachine — conservation of money (property-based)", () => {
  it("returns exactly what was inserted minus what was purchased", () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 40 }), (ops) => {
        // Ample stock and ample change, so the only reason a purchase fails is
        // insufficient funds. Under §5 a product must be configured to be in
        // stock, so every product is given plenty.
        const stock = new Map<Product, number>([
          [COLA, 100],
          [CHIPS, 100],
          [CANDY, 100],
        ]);
        const machine = new VendingMachine(stock, ampleReserve());

        let inserted = 0;
        let purchased = 0;

        for (const op of ops) {
          if (op.kind === "insert") {
            machine.insertCoin(op.coin);
            inserted += valueOf(op.coin) ?? 0;
          } else {
            machine.selectProduct(op.product);
            if (machine.display() === "THANK YOU") {
              purchased += op.product.priceCents;
            }
          }
        }

        machine.returnCoins();

        expect(totalCents(machine.coinReturn())).toBe(inserted - purchased);
      }),
    );
  });
});
