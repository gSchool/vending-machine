import { test, expect } from "@playwright/test";
import { display, product, stock, insert } from "./helpers";

// A full happy-path sale: the balance climbs as coins go in, the product
// dispenses on exact funds, and inventory drops by one.
test("buying cola with four quarters dispenses it and decrements stock", async ({ page }) => {
  await page.goto("/");

  await insert(page, "quarter", "$0.25");
  await insert(page, "quarter", "$0.50");
  await insert(page, "quarter", "$0.75");
  await insert(page, "quarter", "$1.00");

  await product(page, "cola").click();

  // The one-shot THANK YOU is shown once after the sale...
  await expect(display(page)).toHaveText("THANK YOU");
  // ...and the cola shelf now reads one fewer.
  await expect(stock(page, "cola")).toHaveText("4 left");
});
