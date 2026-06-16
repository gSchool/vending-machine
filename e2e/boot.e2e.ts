import { test, expect } from "@playwright/test";
import { display, product, stock, coin } from "./helpers";

// The page should open in a working state, built entirely from the first state
// snapshot the in-browser session hands the render layer.
test.describe("boot", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("opens resting on INSERT COIN", async ({ page }) => {
    await expect(display(page)).toHaveText("INSERT COIN");
  });

  test("renders the three products with their catalog prices and full stock", async ({ page }) => {
    const expected = [
      { id: "cola", name: "cola", price: "$1.00" },
      { id: "chips", name: "chips", price: "$0.50" },
      { id: "candy", name: "candy", price: "$0.65" },
    ];
    for (const p of expected) {
      await expect(product(page, p.id).locator(".name")).toHaveText(p.name);
      await expect(product(page, p.id).locator(".price")).toHaveText(p.price);
      await expect(stock(page, p.id)).toHaveText("5 left");
    }
  });

  test("offers the four coin buttons including the slug", async ({ page }) => {
    for (const id of ["nickel", "dime", "quarter", "slug"]) {
      await expect(coin(page, id)).toBeVisible();
    }
  });
});
