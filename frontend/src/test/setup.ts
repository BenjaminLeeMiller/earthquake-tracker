import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Runs for every test file regardless of environment — a no-op for the
// pure-logic/store tests that never render anything, but required for
// component tests so each test unmounts cleanly (Vitest doesn't wire up
// React Testing Library's auto-cleanup the way Jest's globals do).
afterEach(() => {
  cleanup();
});
