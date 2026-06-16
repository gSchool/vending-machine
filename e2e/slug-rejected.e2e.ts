import { test, expect } from "@playwright/test";
import { display, coin } from "./helpers";

// An unrecognized coin must never count toward the balance — it drops straight to
// the coin return as an unknown chip, and the resting display is undisturbed.
test("an inserted slug is rejected to the coin return", async ({ page }) => {
  await page.goto("/");

  await coin(page, "slug").click();

  // One unknown chip in the tray, and no recognized value totalled.
  const tray = page.locator("#tray");
  await expect(tray.locator(".chip.unknown")).toHaveCount(1);
  await expect(tray.locator(".chip.unknown")).toHaveText("?");
  await expect(page.locator("#tray-total")).toHaveText("");

  // Balance never moved: still resting on INSERT COIN.
  await expect(display(page)).toHaveText("INSERT COIN");
});
