# Teaching Lab — Using AI to Build Software

> A hands-on course for **beginners** learning how to *use AI* to build software.
> The vending machine is the worked example; AI is the tool you're learning to
> drive. You will not need to add any AI to the product — this repo already
> carries everything that makes AI-assisted development teachable: a precise
> [specification](REQUIREMENTS.md), source that cites the spec, and 110 tests
> that tell you the truth when the AI doesn't.

## The one idea behind every lab

**AI is only as trustworthy as your ability to check its work.**

A vending machine is the perfect place to learn this because *every* behavior is
pinned down two ways:

1. The [REQUIREMENTS.md](REQUIREMENTS.md) says, in plain language, exactly what
   the machine should do (e.g. "refuse any sale it can't make exact change for").
2. The test suite *proves* whether the code actually does it.

So when you ask an AI to write or change code, you always have a referee. You
never have to *believe* the AI — you can *check* it. That habit — **prompt the
AI, then verify against ground truth** — is the single most important skill these
labs build.

## Before you start (one-time setup)

```sh
npm install        # install dependencies
npm test           # run the test suite in watch mode (Ctrl-C to quit)
```

To run the suite once and stop (handy after a change):

```sh
npx vitest run
```

You should see **110 tests passing**. That green bar is your referee. If you ever
break it, you've learned something.

Open these three files in your editor and keep them handy — you'll refer to them
constantly:

- [REQUIREMENTS.md](REQUIREMENTS.md) — *what* the machine does (the contract).
- [src/vending-machine.ts](src/vending-machine.ts) — the brains.
- the `*.test.ts` files in [src/](src/) — the proof.

---

## Lab 0 — Warm-up: ask the AI to explain, then fact-check it

**Goal:** learn that AI explanations are a *starting point*, not gospel — and
that you can verify them against the code in seconds.

The README claims the machine has a "pure domain core" that does **no I/O** (no
network, no file access, no printing). Let's see if that's true.

1. **Ask the AI** (in chat):

   > Read `src/vending-machine.ts`. Does this code do any input/output —
   > network calls, file access, or printing to the console? Explain how you can
   > tell.

2. **Now verify the claim yourself** with a search instead of trusting the
   answer:

   ```sh
   grep -nE "fetch|console|fs\.|require\(|import .*('fs'|\"fs\")" src/vending-machine.ts
   ```

   If the AI said "no I/O" and the search finds nothing, the claim holds.

**What you should learn:** an AI explanation is a hypothesis. You confirmed it
with one command. Get in the habit of asking *"how would I check that?"* after
every confident-sounding answer.

---

## Lab 1 — The spec is the prompt, the test is the verifier (Agentic TDD)

**Goal:** experience the core loop of AI-assisted development — write the test
first (red), then the code (green) — using the spec as your source of truth.

This project exists to practice **Agentic TDD**: you drive the AI through
Test-Driven Development. The rhythm is **Red → Green → Refactor**:

1. Write a *failing* test that captures a requirement (red).
2. Get just enough code to make it pass (green).
3. Clean up without breaking the test (refactor).

We'll do it on a requirement that's already implemented, so you can *check the
AI's work against the existing behavior*.

### Steps

1. **Pick a requirement.** Open [REQUIREMENTS.md](REQUIREMENTS.md) and read
   **§4.1** (Return Coins):

   > WHEN the return-coins action is performed, the machine SHALL place coins
   > totaling the current balance in the coin return, reset the balance to zero,
   > and revert to the resting state display.

2. **Prompt the AI to write the test first.** Paste the requirement and ask:

   > Here is requirement §4.1 from REQUIREMENTS.md: *[paste it]*. Look at how
   > existing tests are written in `src/return-coins.test.ts`, then write **one
   > new test** in that same style for the scenario "a quarter and a dime are
   > inserted, then return-coins is pressed, and the coin return holds $0.35 and
   > the balance is back to $0.00." Match the existing imports and helpers. Do
   > not change any source files.

3. **Run it:**

   ```sh
   npx vitest run src/return-coins.test.ts
   ```

   Since §4.1 is *already* implemented, a *correct* new test should pass
   immediately. If it fails, the AI's test is wrong — read the failure, and ask
   the AI to fix the **test** (not the code) to match the spec.

**What you should learn:** the requirement *was the prompt*, and the test runner
*was the verifier*. You didn't have to know whether the AI got it right — the
suite told you. This is the whole game.

> **Going further (optional):** try a requirement that is genuinely *not* yet
> covered by a dedicated test, write the test first so it's **red**, then ask the
> AI to make it **green** — and watch the rest of the suite stay green so you
> know nothing else broke.

---

## Lab 2 — Break it on purpose: AI finds bugs, tests confirm them

**Goal:** see that AI can be *confidently wrong*, and that the tests — not the
chat — are what tell you the truth.

You're going to plant a small bug, then use the AI to hunt it.

1. **Plant a bug.** Open [src/coin-classifier.ts](src/coin-classifier.ts) and
   widen one of the tolerance windows slightly (for example, make a weight
   window much larger than the spec's §9 says). Save the file.

2. **Predict first.** Before running anything, ask yourself: *will the tests
   catch this? will the AI?*

3. **Run the suite:**

   ```sh
   npx vitest run
   ```

   Watch which tests go red. The spec's §9 "Required rejections" are pinned by
   tests — a too-wide window may now *accept* a penny or a dollar coin, and a
   test will say so.

4. **Now ask the AI to find it**, *without* telling it what you changed:

   > Some tests are failing. Here is the output: *[paste it]*. What's the most
   > likely cause, and which file and line would you look at?

5. **Confirm the fix.** Apply the AI's suggested fix (or just undo your change
   with `git checkout src/coin-classifier.ts`) and re-run until green.

**What you should learn:** the failing test pointed at the truth instantly and
unambiguously. The AI's diagnosis was a *lead* you confirmed against that truth.
On a real project with no tests, you'd have only the AI's guess — which is
exactly why tests matter when working with AI.

> **Reset anytime:** `git checkout src/` throws away all your edits and restores
> the original, passing code.

---

## Lab 3 — Spec-first feature with AI (capstone)

**Goal:** run the full loop end to end — *write intent → AI writes code → machine
verifies* — by adding a small feature the right way.

A great candidate is **accepting a new coin** (the spec even discusses this in
§7 and Appendix A.5). We'll sketch the workflow; the point is the *process*, not
finishing a production feature.

1. **Write the intent first (in spec language).** Before any code, draft a new
   requirement in the same EARS + Gherkin style as
   [REQUIREMENTS.md](REQUIREMENTS.md) §9. For example, a half-dollar (50¢) with
   its weight/diameter window. *Writing the spec first forces you to decide what
   "correct" means before the AI writes a line.*

   > **Important caveat the spec itself raises (§7, A.5):** adding a larger coin
   > changes the "change guarantee ceiling C." This is a *feature* of the
   > exercise — ask the AI to explain, from §7, why a bigger coin might force C
   > to change. It teaches you to read a spec for *consequences*, not just the
   > clause in front of you.

2. **Prompt the AI to work spec-first:**

   > Here is a new requirement I wrote: *[paste your EARS/Gherkin]*. Following
   > the existing patterns in `src/coin.ts` and `src/coin-classifier.ts`, and
   > writing tests first in the style of `src/coin-classifier.test.ts`, implement
   > it. Keep all existing tests passing.

3. **Verify relentlessly:**

   ```sh
   npx vitest run
   ```

   The **conservation-of-money** property test
   ([src/conservation.test.ts](src/conservation.test.ts)) is your strongest
   guardrail here — it checks that money is never created or destroyed across
   *thousands* of random operation sequences. If your new coin breaks the books,
   it will catch it where eyeballing never could.

4. **Refactor with the AI** once green: ask it to clean up duplication while you
   watch the suite stay green.

**What you should learn:** the safest way to build with AI is to *define correct
first*, let the AI produce code, and lean on automated verification — especially
property tests — to catch what review misses. You stayed in control the whole
time; the AI did the typing.

---

## How to prompt well (a beginner cheat-sheet)

These habits show up in every lab above:

- **Give the AI the ground truth.** Paste the relevant requirement or test.
  Don't make it guess the rules — they're written down.
- **Point at examples.** "In the style of `src/return-coins.test.ts`" gets far
  better output than "write a test."
- **Constrain the blast radius.** "Do not change any source files" /
  "keep all existing tests passing" keeps the AI from wandering.
- **Always verify.** After every AI change, run `npx vitest run`. The chat is a
  suggestion; the test bar is the verdict.
- **Reset fearlessly.** `git checkout src/` restores the original code so you can
  experiment without risk.

## What makes *this* repo a good teacher

- A **precise spec** ([REQUIREMENTS.md](REQUIREMENTS.md)) gives every prompt a
  source of truth and every result a referee.
- A **pure core** with no I/O means behavior is fully determined by the inputs —
  so tests are simple and reproducible, and the AI can't hide a bug behind
  "it depends on the environment."
- **Property tests** (conservation of money, change-making) verify *whole
  classes* of behavior, catching AI mistakes that example-based tests and human
  review would miss.

Carry these three ideas to your own projects, and AI becomes a reliable
collaborator instead of a confident stranger.
