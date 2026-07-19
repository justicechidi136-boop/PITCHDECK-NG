import { test, expect } from "@playwright/test";

test("admin shell smoke test", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();
  await expect(page.getByText("Auth integration pending")).toBeVisible();
});
