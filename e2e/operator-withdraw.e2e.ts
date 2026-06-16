import { test, expect } from "@playwright/test";

// Withdraw All empties the bank (the operator owns all cash). Afterwards the
// cash readout reads zero and every denomination count is ×0.
test("withdraw all empties the cash on hand", async ({ page }) => {
  await page.goto("/");

  const cash = page.locator("#cash");
  // The machine opens with an ample change float, so there is cash to withdraw.
  await expect(cash).not.toHaveText("$0.00");

  await page.locator("#withdraw-btn").click();

  await expect(cash).toHaveText("$0.00");
  // Every per-denomination count drops to zero.
  const counts = page.locator("#coin-breakdown .cnt");
  await expect(counts.first()).toBeVisible();
  for (const text of await counts.allTextContents()) {
    expect(text).toBe("×0");
  }
});
