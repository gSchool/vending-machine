/**
 * A product the machine sells, identified by name and priced in cents.
 * Prices are kept in cents to match the coin balance and avoid float math.
 */
export type Product = {
  name: string;
  priceCents: number;
};

export const COLA: Product = { name: "cola", priceCents: 100 };
export const CHIPS: Product = { name: "chips", priceCents: 50 };
export const CANDY: Product = { name: "candy", priceCents: 65 };
