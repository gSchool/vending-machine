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
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — how this implementation is built: the
  design, key invariants, the change-making algorithm, the test strategy, and
  known gaps.

Build & run
-----------

TypeScript, ESM. Tests run with [vitest](https://vitest.dev/) and
[fast-check](https://fast-check.dev/) for property-based testing.

```sh
npm test          # run the test suite
npx vitest run    # single pass, no watch
```
