import { type Page, expect } from "@playwright/test";

/** The dot-matrix display — the machine's primary state readout. */
export const display = (page: Page) => page.locator("#display");

/** A product tile on the shelf, e.g. product(page, "cola"). */
export const product = (page: Page, id: string) =>
  page.locator(`.product[data-product="${id}"]`);

/** The per-product stock caption ("5 left" / "sold out"). */
export const stock = (page: Page, id: string) => page.locator(`#stock-${id}`);

/** A coin button in the insert row, e.g. coin(page, "quarter") or "slug". */
export const coin = (page: Page, id: string) => page.locator(`.coin[data-coin="${id}"]`);

/** Insert a recognized coin and wait for the display to settle on the new value. */
export async function insert(page: Page, id: string, expectedDisplay: string) {
  await coin(page, id).click();
  await expect(display(page)).toHaveText(expectedDisplay);
}
