import { test, expect } from "@playwright/test";

test("landing page smoke test", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Connect bold ideas",
  );
  await expect(main.getByRole("link", { name: "Submit Your Idea" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Discover Innovations" })).toBeVisible();
});
