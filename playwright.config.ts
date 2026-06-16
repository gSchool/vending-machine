import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the STATIC build (dist/) — the same server-free
 * artifact deployed to GitHub Pages — not the dev /api server, so they cover what
 * actually ships. `npm run test:e2e` builds dist/ first; the webServer below then
 * serves it.
 *
 * Specs are named *.e2e.ts (not *.test.ts / *.spec.ts) so vitest's default globs
 * never collect them — the two runners stay cleanly separated.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/serve-static.mjs",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
