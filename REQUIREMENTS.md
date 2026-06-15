# Vending Machine — Requirements

This document specifies the **observable behavior** of the vending machine. It
describes *what* the machine does, in terms anyone can confirm by operating it —
not *how* it is built. It is intended to be sufficient to rebuild the product
from scratch in any technology, and specific enough for a product owner to
confirm it matches intent.

## Revision history

**2026-06-15 — Under-specification pass.** A second review closed gaps where
behavior was assumed but never stated:

- Model assumptions made explicit: actions are processed one at a time, and the
  balance is unbounded (see Model assumptions).
- Coin return split into observe (non-destructive) and collect (empties it);
  the return accumulates until collected (§4.2, §4.3).
- Restock rejects a count that is not a non-negative integer (O.1.3).
- A partial collection leaves its remainder as revenue, visible on the next
  audit; no separate signal is emitted (O.3.4).
- Operator actions do not disturb a pending one-shot message (§8.5).

**2026-06-12 — Consistency-and-completeness review.** A clause-by-clause pass
resolved a set of contradictions and gaps; Appendix A records the rationale behind
each decision. Notable changes:

- Inserted coins join the change pool immediately, and a sale draws on the whole
  pool (§1.1, §6).
- Every coin payout — change, refund, return, collected earnings — is deterministic,
  largest-coin-first (§3.3).
- Explicit selection precedence, with a stock guard that prevents dispensing a
  sold-out product (§2.0, §2.1).
- "Most recent action wins" display model resolves stacked one-shot messages
  (§8.3, §8.4).
- The `EXACT CHANGE ONLY` threshold is re-grounded on the coin set as the change
  guarantee ceiling C = `$0.20`, replacing the price-based `$0.95` (§7).
- Earnings-based operator model: revenue is tracked and is what `collect` pays out,
  leaving the loaded change as float (§O.3, §O.5).
- Stock is finite-only; an unconfigured product starts sold out (§5).
- Coin recognition uses tolerance windows, with a documented known weakness against
  spec-matching slugs (§9, Appendix A.8).

## Notation

Requirements are stated in **EARS** (Easy Approach to Requirements Syntax), each
illustrated with **Gherkin** acceptance criteria.

Throughout, **§** means "section" — e.g. §6.1 is section 6.1, §O.3 the operator
section O.3, and §§1–8 (doubled) sections 1 through 8 — used for cross-references
between clauses.

EARS keywords:
- **WHEN** — a triggered response to an event.
- **WHILE** — a response that holds during a state.
- **IF / THEN** — a response to an unwanted or exceptional condition.
- **The machine SHALL** — a mandatory behavior.

The display strings (`INSERT COIN`, `THANK YOU`, `PRICE $x.xx`, `SOLD OUT`,
`EXACT CHANGE ONLY`) and the currency format (`$0.05`) are part of the contract
and SHALL appear exactly as written.

## Model assumptions

These hold throughout and are not restated per clause:

- **Actions are processed one at a time.** The machine handles each action
  (insert, select, return, read, and each operator action) to completion before
  the next begins; there is no concurrent or interleaved action. Together with
  the read-driven display (§8, Appendix A.4), this is what makes every scenario
  reproducible: the machine's state is a pure function of the *sequence* of
  actions, with no dependence on timing or overlap.
- **The balance is unbounded.** There is no maximum balance and no "acceptor
  full" condition; a customer may insert any number of valid coins, and each adds
  its value to the balance (§1.1). A real machine has a finite coin hopper; that
  limit is deliberately outside this model.

**Scenario shorthand.** In the Gherkin acceptance criteria, "*X* is purchased" or
"buys *X*" means the customer inserts enough coins and selects *X* so the sale
completes; "coins totaling $N are inserted" fixes only the total, not the
particular denominations, except where a step names specific coins.

## Interface

The machine is operated through four observable actions and one observable
output. Nothing else is exposed to the customer.

- **Insert a coin** — present one physical coin to the machine.
- **Select a product** — request one of the products.
- **Press return-coins** — ask for the inserted money back.
- **Read the display** — observe the machine's current message (see §8).
- **Observe the coin return** — look at the coins the machine has made
  available, without taking them (a non-destructive read; see §4.2).
- **Collect the coin return** — physically take the coins from the return,
  emptying it (§4.3).

The display is read on demand. Some outputs are **one-shot**: they appear on the
next read only, then the display reverts (see §8). The machine's starting
product stock and starting change are **configuration**, not behavior; the
requirements hold for any starting configuration unless a scenario states
otherwise. Each product's starting stock is a finite count; a product with no
configured starting count begins sold out (zero).

## Domain glossary

- **Coin** — a physical token characterized only by its weight and diameter. A
  coin does not carry or announce its own value; the machine determines value
  from the physical properties (see §1 and the coin table).
- **Valid coin** — a coin whose weight and diameter match a recognized
  denomination: nickel (5¢), dime (10¢), or quarter (25¢).
- **Invalid coin** — any coin not matching a recognized denomination (e.g.
  penny, half dollar, dollar coin, blank token).
- **Balance** — the total value of valid coins the customer has inserted toward
  the current transaction and not yet spent or had returned.
- **Available change** — the coins the machine currently holds and can hand
  back (the *coins on hand*). Inserting valid coins increases it; making change,
  refunds, and returns decrease it. It is the pool every payout is drawn from. It
  includes coins inserted toward an in-progress transaction, which are therefore
  available to make that same transaction's change.
- **Reserve** — the available change apart from the current transaction's
  inserted coins: the coins the machine can rely on for change independently of
  what the customer just put in. At rest (no transaction in progress) the reserve
  is the whole of the available change.
- **Coin return** — where coins are made available to the customer. It
  accumulates everything the machine hands back (rejected coins, change, and
  refunds) and holds it until the customer collects it (§4.3). Observing the
  return (§4.2) only looks; it does not empty it.
- **Resting state** — balance is zero and no one-shot message is pending.
- **Products** — cola (`$1.00`), chips (`$0.50`), candy (`$0.65`).
- **Change guarantee ceiling (C)** — the most change the machine guarantees it
  can always make: `$0.20`, the largest accepted coin minus the smallest
  (`$0.25 − $0.05`). It is the largest amount a customer can be owed who stops
  inserting once the balance reaches the price, and it sets the resting
  `EXACT CHANGE ONLY` warning (§7). Note that C derives from the accepted *coins*,
  not the product prices.
- **Remaining stock** — the number of units of a product left to dispense: a
  non-negative integer. It falls by one on each dispense (§5.3) and is set by
  restock (§O.1). A product is **sold out** exactly when its remaining stock is
  zero.

All monetary values are exact multiples of 5¢; the machine never rounds and
never produces a fractional-cent result.

---

## 1. Accept Coins

### EARS

1.1. WHEN a valid coin is inserted, the machine SHALL add the coin's
denomination value to the balance, and the coin SHALL become part of the
available change.

1.2. WHILE the balance is greater than zero and no message is pending, the
machine SHALL display the balance in currency notation.

1.3. IF an inserted coin is invalid, THEN the machine SHALL leave the balance
unchanged and immediately place the coin in the coin return.

1.4. WHILE in the resting state and change can be made (see §7), the machine
SHALL display `INSERT COIN`.

> A coin's value is determined solely from its physical properties (weight and
> diameter), never from any label the coin carries. A foreign coin whose
> properties match a recognized denomination is therefore accepted — faithful to
> a real machine. Conversely, the rejected coins in the scenarios below (penny,
> blank token, and the like) are tokens that fall outside every denomination's
> window; a blank slug machined to a denomination's weight and diameter would
> instead be accepted (§9, A.8).

> A coin becomes part of available change the instant it is inserted, and may be
> handed back as change for the very transaction it was inserted into. The machine
> draws change from everything on hand — its reserve plus the coins in for the
> current sale.

### Acceptance criteria

```gherkin
Feature: Accept Coins

  Scenario: Resting machine prompts for coins
    Given a machine with no coins inserted
    And the machine can make change
    When the display is read
    Then it shows "INSERT COIN"

  Scenario Outline: Accepting a valid coin
    Given a machine with no coins inserted
    When a <coin> is inserted
    Then the display shows <amount>

    Examples:
      | coin    | amount  |
      | nickel  | "$0.05" |
      | dime    | "$0.10" |
      | quarter | "$0.25" |

  Scenario: Coins accumulate
    Given a machine with no coins inserted
    When a quarter is inserted
    And a dime is inserted
    And a nickel is inserted
    Then the display shows "$0.40"

  Scenario Outline: Rejecting an invalid coin
    Given a machine with no coins inserted
    When a <coin> is inserted
    Then the balance remains "$0.00"
    And the <coin> is immediately placed in the coin return

    Examples:
      | coin        |
      | penny       |
      | half dollar |
      | dollar coin |
      | blank token |
```

---

## 2. Select Product

### EARS

2.0. WHEN a product is selected, the machine SHALL determine the outcome by
checking these conditions in order, acting on the first that applies:
(a) the product is sold out → `SOLD OUT` (§5.1), balance unchanged;
(b) the balance is less than the price → `PRICE $x.xx` (§2.2), balance unchanged;
(c) the change owed cannot be made → refuse, return the balance,
`EXACT CHANGE ONLY` (§6.1);
(d) otherwise → dispense (§2.1).
§2.0 is authoritative for precedence: the conditions in §2.2 and §6.1 are reached
only when no earlier condition applies.

2.1. WHEN a product is selected, the product has remaining stock, the balance is
at least the product's price, and the change owed can be made (see §6), the
machine SHALL dispense the product, place any change owed in the coin return,
reset the balance to zero, reduce that product's remaining stock by one (§5.3),
and display `THANK YOU` once.

2.2. WHEN a product is selected and the balance is less than the product's
price, the machine SHALL display `PRICE` followed by the product's price once,
without altering the balance.

2.3. After a `PRICE` message has been shown once, the machine SHALL revert to
displaying the balance (if greater than zero) or the resting state (§1.4, §7).

> The products and prices are fixed: cola `$1.00`, chips `$0.50`,
> candy `$0.65`.

### Acceptance criteria

```gherkin
Feature: Select Product

  Scenario: Insufficient funds shows the price, then the balance
    Given a machine with no coins inserted
    When a quarter is inserted
    And cola is selected
    Then the display shows "PRICE $1.00"
    And the next display read shows "$0.25"

  Scenario: Insufficient funds with empty balance reverts to resting state
    Given a machine with no coins inserted
    When chips is selected
    Then the display shows "PRICE $0.50"
    And the next display read shows "INSERT COIN"

  Scenario: Sold out takes precedence over a change shortage
    Given a machine where candy has zero remaining stock
    And the machine's reserve holds only quarters
    When three quarters ($0.75) are inserted
    And candy is selected
    Then candy is not dispensed
    And the display shows "SOLD OUT"
    And the balance is still "$0.75"
    And no coins are placed in the coin return

  Scenario: Exact-payment purchase
    Given a machine that can make change
    And no coins inserted
    When coins totaling $1.00 are inserted
    And cola is selected
    Then cola is dispensed
    And the display shows "THANK YOU"
    And the next display read shows "INSERT COIN"
    And the balance is "$0.00"

  Scenario Outline: Purchasing each product with exact payment
    Given a machine that can make change
    And no coins inserted
    When coins totaling <price> are inserted
    And <product> is selected
    Then <product> is dispensed
    And the display shows "THANK YOU"

    Examples:
      | product | price |
      | cola    | $1.00 |
      | chips   | $0.50 |
      | candy   | $0.65 |
```

---

## 3. Make Change

### EARS

3.1. WHEN a product is dispensed and the balance exceeds the product's price,
the machine SHALL place coins totaling exactly the difference in the coin
return.

3.2. The machine SHALL conserve money: over any sequence of operations, the
total value of valid coins placed in the coin return SHALL equal the total value
of valid coins inserted minus the total price of products actually dispensed. The
machine SHALL hand back only coins it holds; it never creates or destroys value.
Invalid coins are not part of this accounting: a rejected coin passes straight to
the coin return (§1.3) without affecting the balance, the available change, or the
revenue.

3.3. Whenever the machine pays out coins and the amount can be formed in more than
one way from the coins on hand — as change for a sale (§3.1), a refund of a refused
sale (§6.1), a return of the balance (§4.1), or collected earnings (§O.3) — the
machine SHALL dispense the combination containing the most quarters; among
combinations with equally many quarters, the one containing the most dimes. This
combination is unique, so every payout is fully determined by the coins on hand and
the amount.

> Equivalently: the machine pays out in the largest denominations it can, keeping
> the smaller coins on hand to preserve its future ability to make change. This one
> rule governs change, refunds, returns, and collected earnings alike. A side
> effect is that a return can hand back larger coins than were inserted — the
> machine doubles as a coin-changer, value-for-value.

### Acceptance criteria

```gherkin
Feature: Make Change

  Scenario: Overpayment returns change
    Given a machine that can make change
    When coins totaling $0.75 are inserted
    And chips is selected
    Then chips is dispensed
    And $0.25 is placed in the coin return

  Scenario: Change is paid in the largest coins available
    Given a machine that holds quarters, dimes, and nickels
    When three quarters ($0.75) are inserted
    And chips is selected
    Then chips is dispensed
    And the $0.25 change is returned as a single quarter

  Scenario: Money is conserved across arbitrary operations
    Given any sequence of valid-coin insertions and product selections
    When all remaining balance is returned via the return-coins action
    Then the total value of valid coins in the coin return
      equals the total value of valid coins inserted
      minus the total price of products dispensed
```

---

## 4. Return Coins

### EARS

4.1. WHEN the return-coins action is performed, the machine SHALL place coins
totaling the current balance in the coin return, reset the balance to zero, and
revert to the resting state display.

4.2. WHEN the coin return is observed, the machine SHALL report the coins
currently waiting there without removing them; observing is non-destructive, so
repeated observations report the same coins until they are collected (§4.3).

4.3. WHEN the coin return is collected, the machine SHALL hand back every coin
waiting there and leave the coin return empty; a subsequent collection (with no
coins added in between) hands back nothing.

> The coin return accumulates everything the machine hands back — rejected coins
> (§1.3), change (§3.1), and refunds (§4.1, §6.1) — and holds it until collected.
> Observing and collecting are distinct: a customer can look at the tray as often
> as they like without disturbing it (§4.2), and collecting empties it in one
> motion (§4.3). This mirrors a physical return slot, where the coins sit visibly
> in the tray until scooped out.

### Acceptance criteria

```gherkin
Feature: Return Coins

  Scenario: Returning inserted coins
    Given a machine with no coins inserted
    When a quarter is inserted
    And a dime is inserted
    And the return-coins action is performed
    Then $0.35 is placed in the coin return
    And the display shows "INSERT COIN"
    And the balance is "$0.00"

  Scenario: Returning with nothing inserted
    Given a machine with no coins inserted
    When the return-coins action is performed
    Then no coins are added to the coin return
    And the display shows "INSERT COIN"

  Scenario: Observing the coin return does not empty it
    Given a machine with $0.35 waiting in the coin return
    When the coin return is observed twice
    Then both observations report $0.35
    And the coins are still in the coin return

  Scenario: Collecting empties the coin return
    Given a machine with $0.35 waiting in the coin return
    When the coin return is collected
    Then $0.35 is handed to the customer
    And the coin return is empty
    And collecting again hands back nothing
```

---

## 5. Sold Out

### EARS

5.1. WHEN a product with zero remaining stock is selected, the machine SHALL
display `SOLD OUT` once, without altering the balance.

5.2. After a `SOLD OUT` message has been shown once, the machine SHALL revert to
displaying the balance (if greater than zero) or the resting state.

5.3. WHEN a product is dispensed, the machine SHALL reduce that product's
remaining stock by one; a product becomes sold out once that count reaches zero
(§5.1).

> Every product has a finite remaining stock that falls by one on each dispense
> (§5.3) and is reset by restock (§O.1). A product is sold out exactly when its
> remaining stock is zero. There is no "untracked" or unlimited stock — the
> machine always knows its count, so it never takes payment for a product it
> cannot dispense.

### Acceptance criteria

```gherkin
Feature: Sold Out

  Scenario: Selecting an out-of-stock product
    Given a machine where cola has zero remaining stock
    When $1.00 is inserted
    And cola is selected
    Then the display shows "SOLD OUT"
    And the next display read shows "$1.00"

  Scenario: Out-of-stock with empty balance reverts to resting state
    Given a machine where cola has zero remaining stock
    And no coins inserted
    When cola is selected
    Then the display shows "SOLD OUT"
    And the next display read shows "INSERT COIN"

  Scenario: A product becomes sold out after its last item is bought
    Given a machine where chips has one remaining
    And the machine can make change
    When $0.50 is inserted
    And chips is selected
    And $0.50 is inserted again
    And chips is selected
    Then the display shows "SOLD OUT"
```

---

## 6. Insufficient Change — Refuse and Return

> The machine refuses any sale it cannot complete with exact change, so the
> customer is never short-changed.

### EARS

6.1. IF a product is selected and the balance is sufficient but the change owed
cannot be made from the available change, THEN the machine SHALL refuse the
sale: it SHALL NOT dispense the product, SHALL NOT alter stock, SHALL place the
full balance in the coin return, and SHALL display `EXACT CHANGE ONLY` once.

6.2. WHEN a product is selected, the balance is sufficient, and the change owed
can be assembled from the available change, the machine SHALL complete the sale.
Whether a sale completes SHALL depend only on whether the owed change can be
made from the coins the machine holds — never on the order in which coins happen
to be chosen.

> 6.1 and 6.2 together define the makeable/unmakeable boundary purely as
> customer-observable outcome: a sale completes exactly when its change can be
> formed from the coins on hand.

> The available change a sale draws on includes the coins the customer just
> inserted (§1.1). A sale is refused only when the owed amount cannot be formed
> from the machine's **entire** pool — its reserve plus the coins in hand for this
> transaction.

> **Invariant (§6 ↔ §7):** while the machine is change-capable — not showing
> `EXACT CHANGE ONLY` at rest — every sale completes as long as the change owed is
> at most the change guarantee ceiling C (`$0.20`). Since a customer who stops once
> the balance reaches the price is owed at most C, a healthy machine never
> surprises such a customer mid-purchase. A change-related refusal can therefore
> only happen on a machine already warning at rest, or when a customer over-inserts
> more than C past the price. This is precisely the guarantee §7's threshold is
> chosen to provide.

### Acceptance criteria

```gherkin
Feature: Complete or refuse a sale based on makeable change

  Scenario: Refuse when the owed change cannot be formed, even using the inserted coins
    Given a machine whose reserve holds only quarters
    When three quarters ($0.75) are inserted
    And candy is selected
    Then candy is not dispensed
    And the candy stock is unchanged
    And the full $0.75 is placed in the coin return
    And the display shows "EXACT CHANGE ONLY"

  Scenario: Complete when the change owed can be made
    Given a machine that can make $0.25 in change
    When coins totaling $0.75 are inserted
    And chips is selected
    Then chips is dispensed
    And $0.25 is placed in the coin return
    And the display shows "THANK YOU"
```

---

## 7. Exact Change Only — Resting Warning

> The warning is a live, conservative reflection of the change currently on
> hand, shown at rest in place of `INSERT COIN`.

### EARS

7.1. WHILE in the resting state and the machine cannot make change for every
5¢ step from 5¢ up to and including the change guarantee ceiling C (`$0.20`), the
machine SHALL display `EXACT CHANGE ONLY` instead of `INSERT COIN`.

7.2. WHILE the balance is greater than zero, the machine SHALL display the
balance regardless of whether change can be made — the warning applies only at
rest.

> The warning reflects exactly what a customer can be owed. Change owed is
> overpayment, and a customer who stops once the balance reaches the price
> overshoots by at most C = `$0.20` (the largest coin minus the smallest). The
> amount owed does not depend on the product price. The warning appears if any 5¢
> step up to C cannot be made, so a customer who heeds it — bringing exact change —
> is never surprised.

> C is derived from the accepted *coins* (`$0.25 − $0.05`). If the machine is ever
> changed to accept larger denominations — a dollar coin, or bills — C must be
> raised to cover the largest tender minus the cheapest product, or this guarantee
> breaks: a customer paying a $5 bill for a $0.50 item is owed $4.50, far beyond
> any coin-derived ceiling.

### Acceptance criteria

```gherkin
Feature: Exact Change Only warning at rest

  Scenario: No change on hand warns
    Given a machine holding no change
    And no coins inserted
    When the display is read
    Then it shows "EXACT CHANGE ONLY"

  Scenario: Change on hand that cannot make some needed increment warns
    Given a machine that cannot make every 5-cent increment up to the ceiling C ($0.20)
    And no coins inserted
    When the display is read
    Then it shows "EXACT CHANGE ONLY"

  Scenario: Ample change does not warn
    Given a machine that can make every increment
    And no coins inserted
    When the display is read
    Then it shows "INSERT COIN"

  Scenario: Warning is suppressed once coins are inserted
    Given a machine that cannot make change
    When a quarter is inserted
    Then the display shows "$0.25"
```

---

## 8. Display Semantics

### EARS

8.1. WHEN any of the one-shot messages (`THANK YOU`, `PRICE $x.xx`, `SOLD OUT`,
or `EXACT CHANGE ONLY` from a refused sale) is produced, the machine SHALL show
that message on the next display read only, then discard it.

8.2. WHEN no one-shot message is waiting, each display read SHALL show the
balance (if greater than zero) or the resting state (`INSERT COIN` or
`EXACT CHANGE ONLY`, per §7).

8.3. At most one one-shot message is pending at a time. WHEN a new one-shot
message is produced while one is already pending, the new message SHALL replace
the pending one; the superseded message is never shown.

8.4. WHEN the customer inserts a valid coin or performs the return-coins action
while a one-shot message is pending, the machine SHALL discard the pending
message; the next display read then reflects the resulting balance or resting
state (§1.2, §4.1). An invalid coin, rejected with no change to the balance
(§1.3), does not disturb a pending message.

8.5. An operator action (restock, load change, collect, audit) SHALL NOT disturb a
pending one-shot message. A one-shot can be pending while the balance is zero — for
example `THANK YOU` after a sale, before it is read — and the machine is then idle,
so operator actions are permitted (§O.0); they nonetheless leave the pending message
intact, and a later customer read still shows it. Only the customer actions in §8.4,
or a read (§8.1), or a superseding one-shot (§8.3) clear it. (The customer display is
not part of the operator interface, so this is a statement about what the *next
customer read* shows, not anything the operator observes.)

> Reading the display consumes a waiting one-shot message: it appears on one
> read, and the following read reflects the underlying balance or resting state.
> This is what "the next display read" means throughout this document.

> Equivalently, the next read always reflects the customer's most recent action —
> a selection's outcome, an insertion's new balance, or a return's resting state. A
> one-shot is shown at most once, and only if no later action supersedes it before
> the customer reads. The substantive effects of every action (a dispensed product,
> coins in the coin return, a changed balance) are observable whether or not its
> message is read.

> **This display model has no notion of elapsed time** — a deliberate departure
> from a standard physical vending display, which reverts a message after a few
> seconds on a timer. Here a one-shot persists until a read consumes it or a later
> action supersedes it (§8.3, §8.4), and the resting display changes only when the
> underlying state does. Making the display read-driven rather than time-driven
> means behavior is fully determined by the sequence of actions and reads, with no
> dependence on wall-clock timing — which is what makes every scenario in this
> document reproducible.

### Acceptance criteria

```gherkin
Feature: One-shot messages

  Scenario: A one-shot message is shown once, then cleared
    Given a one-shot message is waiting
    When the display is read
    Then it shows that message
    And the next display read shows the balance or resting state instead

  Scenario: With funds and no message, the balance is shown
    Given the balance is greater than zero
    And no one-shot message is waiting
    When the display is read
    Then it shows the balance in currency notation

  Scenario: A newer message replaces an unread one
    Given a machine with no coins inserted
    When a quarter is inserted
    And cola is selected
    And chips is selected
    Then the display shows "PRICE $0.50"
    And the next display read shows "$0.25"

  Scenario: Inserting a coin clears a pending message
    Given a machine with no coins inserted
    When a quarter is inserted
    And cola is selected
    And a quarter is inserted
    Then the display shows "$0.50"

  Scenario: Returning coins clears a pending message
    Given a machine that can make change
    And no coins inserted
    When a quarter is inserted
    And cola is selected
    And the return-coins action is performed
    Then the display shows "INSERT COIN"
```

---

## 9. Coin recognition (acceptance requirement)

A coin is **valid** if and only if its weight and its diameter **both** fall
within the acceptance window of the *same* denomination below. Exact equality is
never required — no physical coin weighs exactly its nominal value, so acceptance
is by tolerance window. A valid coin is accepted at that denomination's value; any
other coin — including one whose weight matches one denomination but whose
diameter matches another — is invalid and is returned (§1.3).

| Denomination | Value | Weight (g) | Diameter (mm) |
|--------------|-------|------------|---------------|
| Nickel       | 5¢    | 5.0        | 21.21         |
| Dime         | 10¢   | 2.268      | 17.91         |
| Quarter      | 25¢   | 5.67       | 24.26         |

**Acceptance windows.** Each denomination is accepted over a tolerance window
around its nominal weight and diameter. A default tolerance of **±0.15 g** and
**±0.15 mm** gives the windows below. The exact tolerance is a calibration
parameter, but whatever value is chosen the windows MUST stay pairwise disjoint
and MUST exclude the non-denomination coins listed. (The nominal diameters are
more than 3 mm apart, so the diameter windows alone are disjoint and a coin is
never accepted as two denominations.)

| Denomination | Weight window (g) | Diameter window (mm) |
|--------------|-------------------|----------------------|
| Nickel       | 4.85 – 5.15       | 21.06 – 21.36        |
| Dime         | 2.12 – 2.42       | 17.76 – 18.06        |
| Quarter      | 5.52 – 5.82       | 24.11 – 24.41        |

**Required rejections (testable).** These common coins fall outside every window
and SHALL be returned as invalid:

| Coin        | Weight (g) | Diameter (mm) |
|-------------|------------|---------------|
| Penny       | 2.500      | 19.05         |
| Half dollar | 11.340     | 30.61         |
| Dollar coin | 8.100      | 26.49         |

Calibration trades off false rejects (a good but worn coin turned away) against
false accepts (a slug let in); the tolerance is set to keep both acceptable while
preserving the two guarantees above.

A penny and any other token (foreign coin not matching the above, blank slug,
etc.) is invalid.

### Acceptance criteria

```gherkin
Feature: Coin recognition by tolerance window

  Scenario: A slightly worn coin within tolerance is accepted
    Given a token weighing 4.95 g with a 21.18 mm diameter
    When it is inserted
    Then it is accepted as a nickel
    And $0.05 is added to the balance

  Scenario: A coin matching one denomination's weight but another's diameter is rejected
    Given a token weighing 5.0 g with a 24.26 mm diameter
    When it is inserted
    Then it is invalid
    And it is immediately placed in the coin return
```

---

# Operator Interface

Everything above describes the **customer** — the person buying a product.
This section describes the **operator** — the person who services the machine:
restocking products, loading change, collecting revenue, and auditing the
machine's state. The operator is a distinct actor with privileged access
(a key, a service panel); operator actions are not exposed to the customer.

## Operator domain glossary

- **Operator** — the privileged actor who services the machine. Distinct from
  the customer; the operator's actions are not part of the customer interface
  (§§1–8) and are not available through it.
- **Revenue** — the value the machine has taken in from completed sales since the
  last collect: the operator's uncollected earnings, and the cash `collect` pays
  out. A completed sale adds the product's price to revenue (§O.5.1); only
  `collect` (§O.3) reduces it (§O.5.2).
- **Change float** — the coins the machine keeps to make change: everything on
  hand that is *not* revenue — the starting reserve plus all loaded change, less
  anything previously collected (equivalently, coins-on-hand value minus revenue).
  `collect` leaves the change float in the machine and removes only revenue, so the
  float is operator-controlled, not pinned to a minimum. The machine is
  *change-capable* (§7) when the coins it holds can make every 5¢ step up to the
  ceiling C (`$0.20`); otherwise it shows `EXACT CHANGE ONLY` at rest.
- **At rest** — balance is zero and no customer transaction is in progress
  (§ resting state). Operator actions are permitted only at rest.

> **Servicing actions are permitted only at rest.** Because the customer's
> inserted coins live in the same pool the operator services, a *mutating*
> operator action (restock, load change, collect) attempted while a customer has
> a balance pending is **refused** with no effect, so servicing can never disturb
> an in-progress sale (see O.0). Audit (§O.4) is read-only and is always
> permitted, including mid-transaction.

---

## O.0 Servicing requires an idle machine

### EARS

O.0.1. IF a mutating operator action (restock, load change, or collect) is
attempted while the customer balance is greater than zero, THEN the machine
SHALL refuse the action, leaving stock, change, revenue, and balance unchanged.

O.0.2. Audit (§O.4) is exempt: a read SHALL be permitted regardless of the
customer balance, since it has no side effect and cannot disturb a sale.

### Acceptance criteria

```gherkin
Feature: Operator actions require an idle machine

  Scenario: Servicing is refused while a customer has money in
    Given a machine with a quarter inserted
    When the operator attempts to collect coins
    Then the action is refused
    And the balance is still "$0.25"
    And the coins on hand are unchanged
```

---

## O.1 Restock products

### EARS

O.1.1. WHEN the operator restocks a product to a given count while at rest, the
machine SHALL set that product's remaining stock to the given count.

O.1.2. WHEN a product previously at zero stock is restocked to a positive count,
the machine SHALL once again dispense that product on a valid purchase
(§2.1), and SHALL no longer show `SOLD OUT` for it (§5.1).

O.1.3. IF a restock is attempted with a count that is not a non-negative integer
(negative, or fractional), THEN the machine SHALL refuse it, leaving that
product's remaining stock unchanged. Remaining stock is a count of physical units
(see glossary), so only a non-negative integer is meaningful.

> Restock **sets** the count rather than adding to it, so the operator states the
> shelf's true contents after refilling. Setting a count of zero is permitted and
> marks the product sold out. A negative or fractional count is not a possible
> shelf contents, so it is rejected rather than coerced (O.1.3).

### Acceptance criteria

```gherkin
Feature: Restock products

  Scenario: Restocking a sold-out product makes it available again
    Given a machine where cola has zero remaining stock
    And the machine can make change
    When the operator restocks cola to 5
    And $1.00 is inserted
    And cola is selected
    Then cola is dispensed
    And the display shows "THANK YOU"

  Scenario: Restock sets, not adds
    Given a machine where chips has 2 remaining
    When the operator restocks chips to 10
    Then chips has 10 remaining

  Scenario Outline: An invalid count is refused
    Given a machine where chips has 5 remaining
    When the operator restocks chips to <count>
    Then chips still has 5 remaining

    Examples:
      | count |
      | -3    |
      | 2.5   |
```

---

## O.2 Load change

### EARS

O.2.1. WHEN the operator loads coins into the machine while at rest, the machine
SHALL add those coins to the available change.

O.2.2. WHEN loading change makes the machine change-capable (§7), the machine
SHALL stop displaying `EXACT CHANGE ONLY` at rest and resume `INSERT COIN`.

O.2.3. Loaded coins SHALL be conserved exactly like inserted coins: they
increase the available change by their full value and are never created or
destroyed (§3.2).

> Loading change is the operator's remedy for `EXACT CHANGE ONLY`. Loaded coins
> are not revenue; they become change float and are never returned by `collect`
> (§O.3) — only earnings are collected.

### Acceptance criteria

```gherkin
Feature: Load change

  Scenario: Loading change clears the exact-change warning
    Given a machine holding no change
    And no coins inserted
    When the operator loads enough coins to make every increment
    And the display is read
    Then it shows "INSERT COIN"
```

---

## O.3 Collect coins

### EARS

O.3.1. WHEN the operator collects coins while at rest, the machine SHALL hand
back coins totaling the current revenue — the operator's earnings — drawn
largest-denomination-first (§3.3), and SHALL reduce the revenue by the value
handed back. It SHALL retain its change float; collect never returns the starting
reserve or loaded change.

O.3.2. Collecting SHALL NOT make the machine unable to make change if it could
before: IF the machine is change-capable and paying out the full revenue would
leave it unable to make every 5¢ step up to the ceiling C (§7), THEN it SHALL pay
out only as much revenue as it can while remaining change-capable, retaining the
remainder as revenue. (If the machine was already not change-capable, this guard
does not apply and the full revenue is paid out.) Collecting therefore never
causes `EXACT CHANGE ONLY` at rest if it was not already showing.

O.3.3. Collecting SHALL conserve money: the value handed to the operator equals
the value of coins removed, and the revenue decreases by exactly that amount
(§3.2).

O.3.4. WHEN a collection pays out less than the full revenue because of the
change-capability guard (O.3.2), the retained remainder SHALL remain as revenue
and SHALL be visible to the operator on the next audit (§O.4). The machine emits
no separate "partial collection" signal; the audited revenue *is* the record of
what was held back, and a later collection (after the float is replenished by
loading change, §O.2) pays it out.

> Collect pays the operator their earnings and nothing more: the starting reserve
> and any loaded change stay in the machine as change float, so the float is
> operator-controlled — load more change and more stays. Because earnings are paid
> largest-coins-first (§3.3) they come out mostly as quarters, leaving the small
> coins that make change; only when the earnings are themselves tied up in
> float-critical small coins is any revenue left behind (O.3.2).

> A partial collection is not an error and raises no flag — the operator sees it by
> comparing the cash handed out against the revenue reported by a follow-up audit
> (O.3.4). Loading more change (§O.2) frees the held-back earnings for a later
> collect.

### Acceptance criteria

```gherkin
Feature: Collect coins

  Scenario: Collecting before any sales returns nothing
    Given a machine loaded with $5.00 of change
    And no sales have occurred
    And no coins inserted
    When the operator collects coins
    Then no coins are handed to the operator
    And the machine still holds $5.00 of change

  Scenario: Collect returns earnings and leaves the loaded change
    Given a machine loaded with $5.00 of change and able to make change
    And no coins inserted
    When a customer buys cola for $1.00 with exact payment
    And the operator collects coins
    Then the operator receives $1.00
    And the machine still holds $5.00 of change
    And the display still shows "INSERT COIN"
```

---

## O.4 Audit / read totals

### EARS

O.4.1. WHEN the operator reads the machine's state, the machine SHALL report
the current value of coins on hand and the count of each denomination held, the
remaining stock of each product, and the revenue (the collectable earnings) —
without altering any of them.

O.4.2. Audit SHALL be permitted at any time, including while a customer balance
is pending (§O.0.2). When read mid-transaction, the reported coins on hand
SHALL include the customer's inserted coins, since they share the same pool. The
reported revenue, however, counts only completed sales and is unaffected by an
in-progress balance.

> Audit is read-only: it is the operator's view of the same state §§1–8 expose to
> the customer only indirectly. Reading it has no side effect (unlike the
> customer `display`, §8, which consumes one-shot messages), which is why it
> needs no idle-machine guard. The per-denomination counts let the operator see,
> for example, whether nickels are running low before the machine ever warns
> `EXACT CHANGE ONLY`.

### Acceptance criteria

```gherkin
Feature: Audit

  Scenario: Reading totals does not change them
    Given a machine with a known reserve and stock
    When the operator reads the totals twice
    Then both reads report the same values
    And no coins are dispensed

  Scenario: Audit reports earned revenue
    Given a machine that has completed sales with prices totaling $2.15
    And no coins inserted
    When the operator reads the totals
    Then the reported revenue is "$2.15"
```

---

## O.5 Revenue

### EARS

O.5.1. WHEN a sale completes (§2.1), the machine SHALL add the dispensed product's
price to the revenue.

O.5.2. The revenue SHALL change only through O.5.1 (a completed sale) and `collect`
(§O.3); no other action — an invalid coin, a refused or insufficient-funds
selection, a return, a `SOLD OUT` selection, restock, or load change — alters it.

> Revenue is the machine's only running account: it rises by a product's price
> exactly when that product is dispensed, and falls only when the operator collects
> earnings. Everything else moves coins between the customer and the coin return
> without touching what the operator has earned.

### Acceptance criteria

```gherkin
Feature: Revenue accrual

  Scenario: A completed sale adds its price to revenue
    Given a machine reporting "$0.00" revenue
    And the machine can make change
    When candy is purchased for $0.65
    Then the reported revenue is "$0.65"

  Scenario: A refused sale does not change revenue
    Given a machine reporting "$1.30" revenue
    And the machine cannot make change
    When three quarters ($0.75) are inserted
    And candy is selected
    Then the sale is refused
    And the reported revenue is still "$1.30"
```

---

# Appendix A — Design decisions (non-normative)

This appendix records the *why* behind the non-obvious choices above, so they are
not relitigated by a future reader. It is explanatory only; the normative contract
is §§1–9 and O.0–O.5.

## A.1 Inserted coins join the change pool immediately (Model A)

A coin is part of available change the instant it is inserted, and may be handed
back as change for the same transaction (§1.1). **Why:** there is no benefit to the
customer or the operator in reserving inserted coins — the machine should complete
any sale it physically can. **Rejected:** a "reserve-only" model that ignores the
inserted coins would refuse completable sales — e.g. six dimes inserted for `$0.50`
chips, owing `$0.10`, refused while the machine literally holds the customer's dimes.

## A.2 Every payout is deterministic, largest-coin-first (§3.3)

When an amount can be made more than one way, the machine pays the most quarters,
then the most dimes. **Why:** determinism is required for verifiability — without a
fixed rule, two conforming builds diverge over a sequence of transactions (the same
history can leave one able to make a nickel and the other not), and "rebuild from
scratch → identical machine" fails. Largest-first also conserves the small coins the
machine most needs for future change. The rule governs change, refunds, returns, and
collected earnings alike.

## A.3 Selection precedence: sold-out → funds → change → sell (§2.0)

**Why this order:** quoting `PRICE` for a sold-out item is misleading and invites the
customer to feed money toward something they cannot buy; and dumping the balance over
a change shortage (§6.1) on an item the machine is not selling anyway is hostile. So
sold-out is checked first and leaves the balance intact for another selection or a
return.

## A.4 The display is read-driven and shows the most recent action (§8)

A message persists until a read consumes it or a later action supersedes it; it does
not revert on a timer. **Why:** read-driven behavior is fully determined by the
sequence of actions and reads, with no dependence on wall-clock timing — which makes
every scenario reproducible. Unread messages may be superseded because the
substantive effects (a dispensed product, coins in the return, a changed balance) are
observable regardless of whether the message was read.

## A.5 The change-guarantee ceiling is C = $0.20, derived from the coins (§7)

The resting `EXACT CHANGE ONLY` warning fires when the machine cannot make every 5¢
step up to **C = `$0.20`**. **Why C, and why coin-based:** the change a customer can
be owed is overpayment, and a customer who stops once the balance reaches the price
overshoots by at most (largest coin − smallest coin) = `$0.20` — *independent of the
product price*. The earlier "up to the highest price (`$0.95`)" basis was both too
much (it over-warned and tied up roughly `$1` of float for sales it could always
complete) and not enough (it still could not guarantee a customer who over-inserts).
**Forward risk:** C is tied to the accepted coins; accepting a dollar coin or bills
would require raising C to (largest tender − cheapest product), or the guarantee
breaks.

## A.6 The operator model is earnings-based, not a sweep (§O.3, §O.5)

The machine tracks revenue (Σ sale prices since the last collect); `collect` pays out
that revenue and leaves the operator's loaded change as float. **Why:** it matches the
operator's mental model ("collect what the machine earned, leave the change"), makes
revenue observable, and avoids a footgun — a surplus-based "sweep" would claw back
change the operator just loaded (load `$10` of nickels, collect, and `$9.80` comes
straight back out, leaving the machine on a hair-trigger float). **Rejected:** the
sweep model (collect everything above the bare minimum float).

## A.7 Stock is finite-only (§5)

Every product has a finite remaining count; there is no "untracked" or unlimited
stock. **Why:** besides realism, an untracked slot that is physically empty would
still accept payment and "dispense" nothing — taking the customer's money for air,
violating the §6 never-short-change principle. A product with no configured count
starts sold out, so a freshly-installed machine is safe by default.

## A.8 Coin recognition — and its known weakness

Coins are accepted by **tolerance window** on weight and diameter (§9), because exact
equality would reject every real (worn, dirty) coin.

> **Known limitation (accepted).** The machine identifies a coin from **only its
> weight and diameter**. It therefore cannot distinguish a genuine coin from a slug
> or foreign coin machined to the same weight and diameter — any such token is
> accepted at the matching denomination's value. This is faithful to a simple
> mechanical acceptor, but it means the machine has **no defense against well-made
> counterfeits or matching foreign coinage**: the loss is borne both as bad coins
> taken in and as real coins paid out against them in change and refunds. Closing the
> gap would require a third discriminator — material or electromagnetic signature —
> which is deliberately outside the current weight-and-diameter model. If counterfeit
> exposure becomes a concern, that is the change to make.
