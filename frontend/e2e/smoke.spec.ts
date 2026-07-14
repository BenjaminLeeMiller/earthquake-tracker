import { test, expect, type Page } from "@playwright/test";

// Collect console errors on every page; each test asserts none happened.
// A page can render its shell while every real interaction throws.
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

test("loads the app: stats panel, globe canvas, no console errors", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");

  await expect(page.getByText("Earthquake Tracker")).toBeVisible();
  await expect(page.getByText("Total events")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  // The dataset load either finished already or shows its loading note —
  // wait until markers' data is in (loading note gone).
  await expect(page.getByText("Loading earthquakes…")).toHaveCount(0, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("sidebar sections behave as an accordion", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");

  const options = page.getByRole("button", { name: /Options/ });
  const timeRange = page.getByRole("button", { name: /Time Range/ });

  await options.click();
  await expect(options).toHaveAttribute("aria-expanded", "true");

  await timeRange.click();
  await expect(timeRange).toHaveAttribute("aria-expanded", "true");
  await expect(options).toHaveAttribute("aria-expanded", "false");
  expect(errors).toEqual([]);
});

test("magnitude Reset restores the 2.5–10.0 default", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");

  await page.getByRole("button", { name: /Magnitude Range/ }).click();
  const minSlider = page.locator('input[type="range"]').first();
  await minSlider.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(el, "6");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByText("6.0 – 10.0")).toBeVisible();

  await page.getByText("Reset").click();
  await expect(page.getByText("2.5 – 10.0")).toBeVisible();
  expect(errors).toEqual([]);
});

test("time range datetime inputs narrow the window and auto-slow the replay speed", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  // The default speed label depends on the dataset's span; wait for stats
  // to seed the time range before touching the inputs.
  await expect(page.getByText("Total events")).toBeVisible();

  await page.getByRole("button", { name: /Time Range/ }).click();
  const datetimes = page.locator('input[type="datetime-local"]');
  await expect(datetimes).toHaveCount(2);

  // Narrow To to 20 minutes after From — auto speed must clamp to the
  // slowest setting (1.0 min/sec), whatever the dataset's dates are.
  const fromValue = await datetimes.nth(0).inputValue();
  const from = new Date(fromValue);
  const to = new Date(from.getTime() + 20 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toValue = `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}T${pad(to.getHours())}:${pad(to.getMinutes())}`;
  await datetimes.nth(1).fill(toValue);

  await expect(page.getByText("1.0 min/sec")).toBeVisible();
  expect(errors).toEqual([]);
});

test("replay starts and the clock advances", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByText("Total events")).toBeVisible();
  await expect(page.getByText("Not started")).toBeVisible();

  await page.getByRole("button", { name: "▶", exact: true }).click();
  // "Not started" is replaced by a running timestamp.
  await expect(page.getByText("Not started")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("sidebar collapses to give the globe full width, and reopens", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByText("Total events")).toBeVisible();

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByText("Total events")).toHaveCount(0);

  await page.getByRole("button", { name: "Open sidebar" }).click();
  await expect(page.getByText("Total events")).toBeVisible();
  expect(errors).toEqual([]);
});
