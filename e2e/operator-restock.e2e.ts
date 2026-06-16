import { test, expect } from "@playwright/test";
import { product, stock } from "./helpers";

// The operator panel drives inventory. Restocking cola to zero must mark it sold
// out, and a sold-out tile must refuse the sale rather than dispense.
test("restocking a product to zero sells it out and blocks selection", async ({ page }) => {
  await page.goto("/");

  await page.locator("#restock-product").selectOption("cola");
  await page.locator("#restock-count").fill("0");
  await page.locator("#restock-btn").click();

  await expect(stock(page, "cola")).toHaveText("sold out");
  await expect(product(page, "cola")).toHaveClass(/soldout/);

  // Clicking the sold-out tile is a no-op: stock stays at sold out.
  await product(page, "cola").click();
  await expect(stock(page, "cola")).toHaveText("sold out");
});
