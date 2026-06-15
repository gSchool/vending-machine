# Teaching Lab — Building AI *Features* into the Machine

> A companion to [TEACHING.md](TEACHING.md). That guide teaches you to *use AI to
> build software*. **This** one teaches you to *build AI into software* — wiring a
> language model into the vending machine to add features the original spec never
> imagined.
>
> **Audience:** intermediate. You're comfortable with the code and ready to learn
> LLM integration: tool use, structured output, and evaluation. You'll write code
> that calls the Claude API.
>
> **Status:** these are *sketches* — designed exercises, not finished code. Each
> one names the real method it builds on, the new concept it teaches, and the
> shape of the solution. Treat them as specs to implement (ideally using the
> Agentic TDD loop from [TEACHING.md](TEACHING.md) Lab 1).

## The architectural rule that makes all of this safe

The machine has a **pure domain core** ([src/vending-machine.ts](src/vending-machine.ts))
that does no I/O, wrapped by a thin I/O shell ([src/server.ts](src/server.ts)).
That boundary is exactly where AI belongs:

```
            ┌─────────────────────────────────────────┐
            │  AI layer (new)                          │
            │  natural language  ⇄  Claude API         │
            └───────────────┬─────────────────────────┘
                            │ calls real methods only
            ┌───────────────▼─────────────────────────┐
            │  VendingMachine (pure core, unchanged)   │
            │  insertCoin · selectProduct · cashOnHand │
            │  coinInventory · stockOf · …             │
            └─────────────────────────────────────────┘
```

**The AI never touches money or state directly.** It can only *suggest* an action
(e.g. "select chips"); your code decides whether to actually call
`machine.selectProduct(CHIPS)`. The core's existing rules (sold-out, exact-change,
conservation of money) remain the final authority. This containment is the most
important lesson in the whole guide: **an LLM proposes; verified code disposes.**

> **Setup note.** These use the Claude API. Add the SDK
> (`npm i @anthropic-ai/sdk`) and an API key via environment variable. Use the
> latest model — at time of writing, Opus 4.8 (`claude-opus-4-8`) for the harder
> reasoning sketches, and a faster model like `claude-haiku-4-5` for cheap
> parsing tasks. For exact model IDs and API usage, ask Claude Code (it has a
> `claude-api` reference skill) rather than guessing.

---

## Sketch 1 — Natural-language ordering (teaches: tool use)

**Concept:** *tool use / function calling* — let the model invoke your code.

**The feature.** A customer types "something cheap that isn't chocolate" and the
machine picks a product. The model doesn't *return prose*; it *calls a tool* you
define, and your code executes the real method.

**Real methods it builds on:** `selectProduct(Product)`, plus `stockOf` and the
product catalog so the model knows what's available.

**Shape of the solution:**

1. Define one tool for the model, e.g.:

   ```jsonc
   {
     "name": "select_product",
     "description": "Select a product to purchase by its name.",
     "input_schema": {
       "type": "object",
       "properties": { "name": { "enum": ["cola", "chips", "candy"] } },
       "required": ["name"]
     }
   }
   ```

2. Send the customer's text plus the current menu (names, prices from
   `product.ts`, and live stock from `stockOf`) as context.

3. When the model calls `select_product`, **your code** maps the name to the real
   `Product` and calls `machine.selectProduct(...)`. The core still enforces every
   rule — if it's sold out or the balance is short, the *machine* says so, not the
   model.

**What you should learn:** the model's job is to *translate intent into a
structured action*; the enum constrains it to real products; and the pure core is
the safety net that catches anything the model gets wrong. You've turned fuzzy
language into a verified method call.

**Verify it:** ask for "the dollar drink" → expect a `select_product("cola")`
call. Ask for "a salad" → the model should decline or pick nothing, *not*
hallucinate a product (the enum makes a fake name impossible to emit).

---

## Sketch 2 — LLM as a graded judge (teaches: eval & hallucination detection)

**Concept:** *evaluation* — measuring whether the AI is actually right, using the
verifiable core as the **answer key**.

This is the highest-value sketch in the guide, and it's only possible *because*
this domain has ground truth.

**The feature.** A test harness that asks the model to make ordering decisions,
then **grades** each one against what the machine actually allows.

**Real methods it builds on:** `stockOf`, `selectProduct`, the catalog,
`cashOnHand` — all the read-only queries that define "correct."

**Shape of the solution:**

1. Generate scenarios programmatically: random stock levels, random balance,
   random request ("pick the cheapest in-stock item").
2. Ask the model to choose.
3. **Grade with code, not vibes.** For each decision, check against the core:
   - Is the chosen product real? (`name in catalog`)
   - Is it actually in stock? (`machine.stockOf(p) > 0`)
   - Could the sale actually complete? (run it on a *copy* of the machine and see
     if it dispenses)
4. Report a **score**: % of decisions that were valid.

**What you should learn:** "the demo looked good" is not evaluation. A real eval
generates many cases and scores them automatically against ground truth — and a
verifiable domain like this one is what makes automatic scoring possible. You'll
*see* the hallucination rate as a number, and watch it change as you improve the
prompt. This is the skill that separates shipping AI from playing with it.

> **Tie-in:** this is the product-side mirror of [TEACHING.md](TEACHING.md)
> Lab 2 — there, *tests* are the referee for AI-written code; here, *the core* is
> the referee for AI *runtime decisions*.

---

## Sketch 3 — Structured-output parsing with validation (teaches: schemas)

**Concept:** *structured output + validation* — force the model to emit data in a
shape your types accept, then validate before trusting it.

**The feature.** A customer describes coins in words — "I'm putting in two
quarters and a dime" — and the system converts that to actual `Coin` insertions.

**Real methods it builds on:** `insertCoin(Coin)` and the `NICKEL/DIME/QUARTER`
specs in [src/coin.ts](src/coin.ts).

**Shape of the solution:**

1. Ask the model to return JSON matching a schema like
   `{ "coins": [{ "denomination": "quarter", "count": 2 }, ...] }`.
2. **Validate the output** before acting: every denomination must be one your
   `coin.ts` recognizes; counts must be positive integers. Reject and re-prompt
   on a mismatch.
3. Expand into real `Coin` objects and call `machine.insertCoin(...)` for each.

**What you should learn:** never `JSON.parse` model output and trust it. The
schema *constrains* the model, and explicit validation *catches* the cases where
it ignores the schema anyway. The pure core's strict `Coin` type is your last
line of defense — a malformed coin literally can't be inserted.

**Verify it:** feed it "three pennies" → the validator should reject (penny isn't
an accepted denomination, per spec §9), demonstrating that validation, not the
model, owns correctness.

---

## Sketch 4 — Conversational operator assistant (teaches: read-only grounding)

**Concept:** *grounding answers in real state* via read-only tools — the safest
possible AI feature, and a great first one to build.

**The feature.** The operator asks plain-English questions — "how much cash is in
the till?", "which coins are running low?", "what's sold out?" — and gets answers
grounded in the machine's actual state.

**Real methods it builds on:** the audit surface — `cashOnHand(): number`,
`coinInventory(): {value, count}[]`, `stockOf(Product)`. All read-only (spec
§O.4), so this feature **cannot change anything** — the worst an error can do is
give a wrong answer, never break the machine.

**Shape of the solution:**

1. Expose the three audit queries as read-only tools the model can call.
2. The model answers questions by calling them and summarizing the results.
3. Because the data comes from `coinInventory`/`cashOnHand`, the answer is
   *grounded* — it reflects real state, not the model's imagination.

**What you should learn:** the easiest, safest place to add AI is over **read-only
data**. The model becomes a friendly query interface; it can't corrupt anything
because the tools you gave it have no side effects. Grounding (answering *from
retrieved real data*) is what keeps it from making up a cash total.

**Verify it:** withdraw all cash (`withdrawAll`), then ask "how much is in the
till?" → the answer must be `$0.00`, because it's reading `cashOnHand`, not
guessing.

---

## A suggested order to build these

1. **Sketch 4** first — read-only, can't break anything, teaches tool use gently.
2. **Sketch 1** — your first *write* action, still fully guarded by the core.
3. **Sketch 3** — adds the discipline of schema validation.
4. **Sketch 2** — ties it together: now *measure* how good your AI features
   actually are.

## The thread through all four

Every sketch keeps the language model on the **outside**, proposing structured
actions, while the **pure core stays the final authority** on money and state.
That's not just tidy architecture — it's how you build AI features you can trust:
the model handles the fuzzy human language, and verified code handles the part
that must be correct.

Build each one test-first ([TEACHING.md](TEACHING.md) Lab 1), and grade the AI's
behavior against the core (Sketch 2), and you're practicing AI engineering the way
it should be done.
