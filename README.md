Vending Machine
===============

The brains of a vending machine: it accepts coins, identifies them by their
physical properties, makes change, tracks inventory, and dispenses products —
refusing any sale it can't complete with exact change so no customer is ever
short-changed.

Documentation
-------------

- **[REQUIREMENTS.md](REQUIREMENTS.md)** — the authoritative specification of
  what the machine does, as observable behavior (EARS requirements with Gherkin
  acceptance criteria). Start here to understand or rebuild the product.
  **Appendix A** records the rationale behind every non-obvious design decision.

The "how" lives next to the code: each module under `src/` carries doc-comments
that cite the spec sections they implement.

Design at a glance
------------------

A pure **domain core** (`VendingMachine`) surrounded by small, single-purpose
modules it delegates to. Nothing in the core does I/O — it is driven by method
calls (`insertCoin`, `selectProduct`, `returnCoins`, and the operator actions)
and observed through queries (`display`, `coinReturn`, `cashOnHand`, …), so the
whole thing is unit- and property-testable without test doubles.

| File | Responsibility |
|------|----------------|
| `vending-machine.ts` | The domain core: customer balance, display state machine, inventory, and coin bank. Orchestrates all customer *and* operator behavior. |
| `coin.ts` | The `Coin` type (`{ weightGrams, diameterMm }`) and the accepted-coin specs (`NICKEL`, `DIME`, `QUARTER`). |
| `coin-classifier.ts` | `valueOf(coin)` — assigns a cents value by physical properties using tolerance windows (§9), or `null` if unrecognized. |
| `coin-bank.ts` | `CoinBank` — the coin reserve as per-denomination counts. Owns all change math (`add`, `total`, `canMake`, `withdraw`, …). |
| `product.ts` | The `Product` type and the three products (cola $1.00, chips $0.50, candy $0.65). |

Two load-bearing properties, both pinned by `fast-check` property tests:

- **Conservation of money.** One coin bank: inserted coins are deposited, every
  payout (change, refund, return, withdraw-all) is a withdrawal. Over any sequence of
  operations the coin return equals total inserted minus total dispensed
  (`conservation.test.ts`).
- **Largest-coin-first change.** `CoinBank.withdraw` uses a backtracking search
  over denominations (greedy can fail on a finite reserve) that spends the
  largest coins it can, retaining small coins for future change. Proven against a
  brute-force oracle (`withdraw-optimal.test.ts`, `coin-bank.test.ts`).

Build & run
-----------

TypeScript, ESM. Tests run with [vitest](https://vitest.dev/) and
[fast-check](https://fast-check.dev/) for property-based testing.

```sh
npm test          # run the test suite
npx vitest run    # single pass, no watch
```

Web UI
------

A small web page exposes the whole machine — customer actions (insert coins,
select a product, return/take coins) and the operator service panel (restock,
load change, withdraw all cash, and a cash-on-hand readout that breaks the coins
on hand down into an exact count per denomination).

```sh
npm start         # serves http://localhost:3000 (set PORT to change)
```

`src/server.ts` is a thin, zero-dependency Node HTTP shell around the pure
`VendingMachine` core: it holds one machine instance — the single source of
truth, so state survives a page refresh — and maps each domain method to a JSON
endpoint under `/api/`. The browser page in `public/` calls those endpoints and
re-renders from the state snapshot each action returns. The core does no I/O;
the server is the only I/O. It runs the TypeScript directly via Node's
type-stripping (`--experimental-transform-types`) plus a tiny resolve hook
(`src/ts-resolve.mts`) that maps the source's extensionless imports to `.ts` —
so there is no build step.
