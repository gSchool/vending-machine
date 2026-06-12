# Vending Machine — Architecture & Handoff

A TDD implementation of the vending machine kata, extended into a
money-conserving engine intended to be correct enough to drive real hardware.
This document orients a new maintainer: the design, the key invariants, the
test strategy, and the known gaps.

## Design overview

The code follows a loosely hexagonal style: a pure **domain core**
(`VendingMachine`) surrounded by small, single-purpose modules it delegates to.
Nothing in the core does I/O — it is driven by method calls (`insertCoin`,
`selectProduct`, `returnCoins`) and observed through queries (`display`,
`coinReturn`). That makes the whole thing unit- and property-testable without any test doubles.

### Modules

| File | Responsibility |
|------|----------------|
| `vending-machine.ts` | The domain core. Holds the customer balance, the display state machine, inventory, and the coin bank. Orchestrates all behavior. |
| `coin.ts` | The `Coin` type (`{ weightGrams, diameterMm }`) and the real specs for the accepted coins (`NICKEL`, `DIME`, `QUARTER`). |
| `coin-classifier.ts` | `valueOf(coin)` — assigns a cents value to a coin **by its physical properties**, or `null` if unrecognized. The machine never trusts a coin to know its own value. |
| `coin-bank.ts` | `CoinBank` — the machine's reserve of coins, tracked as counts per denomination. Owns all change math: `add`, `total`, `canMake`, `withdraw`. |
| `product.ts` | The `Product` type and the three products (`COLA` $1.00, `CHIPS` $0.50, `CANDY` $0.65), priced in cents. |
| `invalid-coins.fixtures.ts` | Test-only fixtures for coins the machine rejects (penny, half dollar, dollar coin, blank slug). Production code has no concept of these. |

## Key modeling decisions

These are the non-obvious choices a maintainer should understand before changing
anything.

1. **Coins are physical, not valued.** A `Coin` is a weight and a diameter. The
   `coin-classifier` measures it and assigns a value. This mirrors a real
   machine and is the kata's explicit guidance. Consequence: a foreign coin
   matching a US coin's specs would be accepted — accepted as faithful, since a
   real machine behaves the same way. Matching is currently exact (`===`), which
   makes the model *stricter* than a real machine (a worn coin slightly off-spec
   is wrongly rejected); a tolerance band would fix that but widen the
   foreign-coin window.

2. **All money is in cents (integers).** No floating-point money anywhere.
   `formatCurrency` is the only place cents become a dollar string, and only for
   the display.

3. **One coin bank; money is conserved.** Inserted valid coins are *deposited*
   into the `CoinBank`. Every dispense — purchase change, refund, and
   `returnCoins` — is a *withdrawal* from the same bank. Coins are never minted
   or destroyed, only moved. (Rejected coins bypass the bank and go straight to
   the coin return.)

4. **Refuse-and-return when change can't be made.** If a customer has enough
   money but the bank cannot produce the exact change, the sale is **refused**:
   nothing is dispensed, the balance is returned, and the display shows
   `EXACT CHANGE ONLY`. No one is ever short-changed.

5. **`EXACT CHANGE ONLY` is a live, conservative warning.** At rest, the machine
   shows it instead of `INSERT COIN` whenever the bank cannot make *every*
   5-cent step up to the highest price. This is deliberately cautious: it warns
   before a customer can get stuck, and it reflects the current bank contents.

6. **`display()` is a command, not a pure query.** It consumes a one-shot
   `pendingMessage` (`THANK YOU`, `PRICE $x.xx`, `SOLD OUT`, refusal). After one
   read the message clears and the display reverts to the balance or the
   resting state, per the spec's "subsequent checks" wording. Calling
   `display()` therefore has a side effect — tests rely on this.

7. **Inventory is sparse.** A product *absent* from the inventory map is treated
   as in stock; only an explicit count of `0` is `SOLD OUT`. This keeps the
   default constructor (`new VendingMachine()`) fully stocked without listing
   every product.

## Core invariant: conservation of money

The property a money-handling machine must never violate:

> Over any sequence of operations, the value in the coin return equals the
> total value inserted minus the total price of products actually dispensed.

This is verified two ways:
- **Unit level** (`coin-bank.test.ts`): `withdraw(n)` returns coins totaling
  exactly `n` and reduces the bank's total by exactly `n`.
- **End-to-end** (`conservation.test.ts`): a property test drives arbitrary
  sequences of inserts and selections, then flushes via `returnCoins`, and
  asserts `coinReturn total == inserted − purchased`.

## Change-making algorithm

`CoinBank.canMake` / `withdraw` use a **backtracking search** over denominations
(largest first), not a plain greedy pass. With a *finite* reserve, greedy can
fail where a solution exists (take a quarter, then be unable to make the
remainder, when smaller coins would have worked). The search tries every
feasible count of each denomination; the space is tiny (three denominations) so
it is cheap. Correctness is pinned by a property test that compares `canMake`
against an independent brute-force oracle.

## Test strategy

`vitest` for the runner, `fast-check` for property-based tests. ~38 tests total.
Example tests document each feature's behavior; property tests guard the
load-bearing logic (classification, change-making, conservation).

| Test file | Covers |
|-----------|--------|
| `vending-machine.test.ts` | Accept Coins: resting state, reject fixtures, each denomination, accumulation, rejected-coin-to-return. |
| `select-product.test.ts` | Select Product: price display, dispense, balance reset, all three products. |
| `make-change.test.ts` | Make Change on overpayment (varied denominations). |
| `return-coins.test.ts` | Return Coins button. |
| `sold-out.test.ts` | Sold Out + stock depletion on purchase. |
| `exact-change.test.ts` | `EXACT CHANGE ONLY` at rest for empty / unmakeable reserves. |
| `insufficient-change.test.ts` | Refuse-and-return when change can't be made. |
| `coin-classifier.test.ts` | Classification properties (valid → denomination, non-match → null). |
| `coin-bank.test.ts` | Bank examples + `canMake` oracle + `withdraw` conservation properties. |
| `conservation.test.ts` | End-to-end money conservation over random op sequences. |

## Build & run

- TypeScript, ESM (`"type": "module"`, `module: preserve` + `moduleResolution:
  bundler`). Imports are extensionless.
- `npm test` runs vitest (`npx vitest run` for a single pass).

## Known gaps / next steps for production

None of these are required by the kata; they are the real path to deployment.

1. **Change-selection strategy is greedy and can strand future change.**
   `withdraw` dispenses largest-coin-first, which can hand out a coin
   (e.g. a dime) that leaves the bank less able to make future change than an
   alternative (two nickels) would have. A real machine optimizes to preserve
   small denominations. This is a correctness-of-service issue, property-testable
   ("a withdrawal never renders a previously-makeable amount unmakeable when an
   alternative selection existed").

2. **No operator APIs.** Restocking products, loading/collecting coins, and
   reading totals are constructor-only. Real operation needs methods for these.

3. **No atomicity / concurrency model.** `selectProduct` does read-modify-write
   on balance, bank, and inventory. If driven by concurrent hardware threads
   (coin sensor, button, display), these sequences need to be made atomic.

4. **Coin matching is exact.** See modeling decision #1 — real coin acceptance
   uses tolerance bands.
