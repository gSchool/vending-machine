# Vending Machine — Requirements

This document specifies the **observable behavior** of the vending machine. It
describes *what* the machine does, in terms anyone can confirm by operating it —
not *how* it is built. It is intended to be sufficient to rebuild the product
from scratch in any technology, and specific enough for a product owner to
confirm it matches intent.

## Notation

Requirements are stated in **EARS** (Easy Approach to Requirements Syntax), each
illustrated with **Gherkin** acceptance criteria.

EARS keywords:
- **WHEN** — a triggered response to an event.
- **WHILE** — a response that holds during a state.
- **IF / THEN** — a response to an unwanted or exceptional condition.
- **The machine SHALL** — a mandatory behavior.

The display strings (`INSERT COIN`, `THANK YOU`, `PRICE $x.xx`, `SOLD OUT`,
`EXACT CHANGE ONLY`) and the currency format (`$0.05`) are part of the contract
and SHALL appear exactly as written.

## Interface

The machine is operated through four observable actions and one observable
output. Nothing else is exposed to the customer.

- **Insert a coin** — present one physical coin to the machine.
- **Select a product** — request one of the products.
- **Press return-coins** — ask for the inserted money back.
- **Read the display** — observe the machine's current message (see §8).
- **Observe the coin return** — collect coins the machine has made available.

The display is read on demand. Some outputs are **one-shot**: they appear on the
next read only, then the display reverts (see §8). The machine's starting
product stock and starting change are **configuration**, not behavior; the
requirements hold for any starting configuration unless a scenario states
otherwise.

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
  back. Inserting valid coins increases it; making change, refunds, and returns
  decrease it. It is the pool every payout is drawn from.
- **Coin return** — where coins are made available to the customer. It
  accumulates everything the machine hands back (rejected coins, change, and
  refunds) until collected.
- **Resting state** — balance is zero and no one-shot message is pending.
- **Products** — cola (`$1.00`), chips (`$0.50`), candy (`$0.65`).

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
> a real machine.

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

2.1. WHEN a product is selected, the balance is at least the product's price,
and the change owed can be made (see §6), the machine SHALL dispense the
product, place any change owed in the coin return, reset the balance to zero,
reduce that product's remaining stock by one, and display `THANK YOU` once.

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
total value placed in the coin return SHALL equal the total value inserted minus
the total price of products actually dispensed. The machine SHALL hand back only
coins it holds; it never creates or destroys value.

### Acceptance criteria

```gherkin
Feature: Make Change

  Scenario: Overpayment returns change
    Given a machine that can make change
    When coins totaling $0.75 are inserted
    And chips is selected
    Then chips is dispensed
    And $0.25 is placed in the coin return

  Scenario: Money is conserved across arbitrary operations
    Given any sequence of coin insertions and product selections
    When all remaining balance is returned via the return-coins action
    Then the total value in the coin return
      equals the total inserted minus the total price of products dispensed
```

---

## 4. Return Coins

### EARS

4.1. WHEN the return-coins action is performed, the machine SHALL place coins
totaling the current balance in the coin return, reset the balance to zero, and
revert to the resting state display.

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
```

---

## 5. Sold Out

### EARS

5.1. WHEN a product with zero remaining stock is selected, the machine SHALL
display `SOLD OUT` once, without altering the balance.

5.2. After a `SOLD OUT` message has been shown once, the machine SHALL revert to
displaying the balance (if greater than zero) or the resting state.

5.3. WHEN a product is dispensed, the machine SHALL reduce that product's
remaining stock by one.

> A product with no configured stock limit is treated as available; only a
> product known to have zero remaining is sold out.

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
    When chips is purchased
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

### Acceptance criteria

```gherkin
Feature: Complete or refuse a sale based on makeable change

  Scenario: Refuse when the change owed cannot be made
    Given a machine that cannot make $0.10 in change
    When coins totaling $0.60 are inserted
    And chips is selected
    Then chips is not dispensed
    And the chips stock is unchanged
    And the full $0.60 is placed in the coin return
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
5¢ step from 5¢ up to (but not including) the highest product price, the machine
SHALL display `EXACT CHANGE ONLY` instead of `INSERT COIN`.

7.2. WHILE the balance is greater than zero, the machine SHALL display the
balance regardless of whether change can be made — the warning applies only at
rest.

> The warning is deliberately conservative: it appears if *any* single 5¢
> increment that could be owed for the priciest item cannot be made, warning the
> customer before they can get stuck.

### Acceptance criteria

```gherkin
Feature: Exact Change Only warning at rest

  Scenario: No change on hand warns
    Given a machine holding no change
    And no coins inserted
    When the display is read
    Then it shows "EXACT CHANGE ONLY"

  Scenario: Change on hand that cannot make some needed increment warns
    Given a machine that cannot make every 5-cent increment up to the highest price
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

> Reading the display consumes a waiting one-shot message: it appears on one
> read, and the following read reflects the underlying balance or resting state.
> This is what "the next display read" means throughout this document.

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
```

---

## 9. Coin recognition (acceptance requirement)

A coin is **valid** if and only if its weight and diameter match one of the
denominations below. A valid coin is accepted at the stated value; any other
coin is invalid and is returned (§1.3).

| Denomination | Value | Weight (g) | Diameter (mm) |
|--------------|-------|------------|---------------|
| Nickel       | 5¢    | 5.0        | 21.21         |
| Dime         | 10¢   | 2.268      | 17.91         |
| Quarter      | 25¢   | 5.67       | 24.26         |

A penny and any other token (foreign coin not matching the above, blank slug,
etc.) is invalid.
