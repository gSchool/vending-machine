import { describe, it, expect } from "vitest";
import { valueOf } from "./coin-classifier";
import type { Coin } from "./coin";
import { PENNY, HALF_DOLLAR, DOLLAR_COIN } from "./invalid-coins.fixtures";

/**
 * §9 Coin recognition by tolerance window. A coin is valid iff its weight AND
 * diameter both fall within the SAME denomination's acceptance window. Exact
 * equality is never required — real coins are worn — so acceptance is by a
 * tolerance window (default ±0.15 g, ±0.15 mm) around each nominal.
 *
 * These tests pin the observable §9 contract: a within-tolerance coin is
 * accepted; a coin matching one denomination's weight but another's diameter is
 * rejected; the listed non-denomination coins are rejected.
 *
 * NOTE: the current coin-classifier matches by EXACT equality, so the
 * within-tolerance acceptance cases below are expected to FAIL until the
 * classifier is reworked to windows. They encode the revised §9 requirement.
 */

/** The acceptance windows from §9, as [min, max] for weight (g) and diameter (mm). */
const WINDOWS = {
  nickel: { value: 5, weight: [4.85, 5.15], diameter: [21.06, 21.36] },
  dime: { value: 10, weight: [2.12, 2.42], diameter: [17.76, 18.06] },
  quarter: { value: 25, weight: [5.52, 5.82], diameter: [24.11, 24.41] },
} as const;

describe("coin recognition — tolerance windows (§9)", () => {
  it("accepts a slightly worn nickel within tolerance (4.95 g, 21.18 mm)", () => {
    const wornNickel: Coin = { weightGrams: 4.95, diameterMm: 21.18 };

    expect(valueOf(wornNickel)).toBe(5);
  });

  it.each([
    ["nickel low edge", { weightGrams: 4.85, diameterMm: 21.06 }, 5],
    ["nickel high edge", { weightGrams: 5.15, diameterMm: 21.36 }, 5],
    ["dime within window", { weightGrams: 2.3, diameterMm: 17.95 }, 10],
    ["quarter within window", { weightGrams: 5.6, diameterMm: 24.2 }, 25],
  ])("accepts a %s as its denomination", (_label, coin, value) => {
    expect(valueOf(coin as Coin)).toBe(value);
  });

  it("rejects a coin whose weight matches a nickel but whose diameter matches a quarter (5.0 g, 24.26 mm)", () => {
    const mismatch: Coin = { weightGrams: 5.0, diameterMm: 24.26 };

    expect(valueOf(mismatch)).toBeNull();
  });

  it.each([
    ["weight just outside the nickel window", { weightGrams: 5.31, diameterMm: 21.21 }],
    ["diameter just outside the nickel window", { weightGrams: 5.0, diameterMm: 21.52 }],
  ])("rejects a coin with %s", (_label, coin) => {
    expect(valueOf(coin as Coin)).toBeNull();
  });

  it.each([
    ["penny", PENNY],
    ["half dollar", HALF_DOLLAR],
    ["dollar coin", DOLLAR_COIN],
  ])("rejects the %s (outside every window)", (_label, coin) => {
    expect(valueOf(coin)).toBeNull();
  });

  it("keeps the acceptance windows pairwise disjoint by diameter (§9)", () => {
    // The three diameter windows must not overlap — a coin is never accepted as
    // two denominations. Nominal diameters are >3 mm apart, so a ±0.15 window
    // leaves a wide gap; assert no window's range intersects another's.
    const ranges = Object.values(WINDOWS).map((w) => w.diameter);
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const [aLo, aHi] = ranges[i]!;
        const [bLo, bHi] = ranges[j]!;
        const overlaps = aLo <= bHi && bLo <= aHi;
        expect(overlaps).toBe(false);
      }
    }
  });
});
