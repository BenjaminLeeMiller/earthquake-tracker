import { defineConfig } from "@playwright/test";

/**
 * E2e smoke suite — runs against the full Docker stack.
 *
 *   docker compose up -d --build   (from the repo root)
 *   npm run e2e                    (from frontend/)
 *
 * If the stack isn't already up, the webServer block below starts it (and
 * tears it back down when the run finishes). The suite only asserts
 * data-shape-independent behavior, since the backend serves whatever USGS
 * data it last ingested.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1400, height: 900 },
  },
  webServer: {
    command: "docker compose up",
    cwd: "..",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
