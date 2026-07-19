import { test, expect, type Page } from "@playwright/test";
import { readAdminE2EFixtures } from "./admin-fixtures";

const fixtures = readAdminE2EFixtures();

async function signInAsAdmin(
  page: Page,
  account: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard");
}

test.describe("Admin RBAC", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();

    await page.goto("/users");
    await expect(page).toHaveURL("/login");
  });

  test("denies innovator and sponsor accounts", async ({ page }) => {
    for (const account of [fixtures.innovator, fixtures.sponsor]) {
      await page.goto("/login");
      await page.getByLabel("Email").fill(account.email);
      await page.getByLabel("Password").fill(account.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.locator("form").getByRole("alert")).toContainText(/admin access required/i);
    }
  });

  test("allows super admin to reach dashboard and users", async ({ page }) => {
    await signInAsAdmin(page, fixtures.superAdmin);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByText(fixtures.lagosInnovator.email)).toBeVisible();
  });

  test("shows user detail and requires state for state admin assignment UI", async ({ page }) => {
    await signInAsAdmin(page, fixtures.superAdmin);

    await page.goto(`/users/${fixtures.lagosInnovator.userId}`);
    await expect(page.getByRole("heading", { name: "E2E INNOVATOR" })).toBeVisible();
    await expect(page.getByText(fixtures.lagosInnovator.email)).toBeVisible();

    await page.getByLabel("Role").selectOption("STATE_ADMIN");
    await expect(page.getByLabel("State code")).toBeVisible();
  });

  test("isolates Lagos state admin to Lagos users only", async ({ page }) => {
    await signInAsAdmin(page, fixtures.lagosStateAdmin);

    await page.goto("/users");
    await expect(page.getByText(fixtures.lagosInnovator.email)).toBeVisible();
    await expect(page.getByText(fixtures.riversInnovator.email)).toHaveCount(0);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/admin/users/${fixtures.riversInnovator.userId}`) &&
        response.status() === 403,
    );
    await page.goto(`/users/${fixtures.riversInnovator.userId}`);
    await responsePromise;
    await expect(page.getByText("Access denied")).toBeVisible();
  });

  test("blocks suspended admin accounts", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(fixtures.suspendedAdmin.email);
    await page.getByLabel("Password").fill(fixtures.suspendedAdmin.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText(/suspended/i);
  });
});

test("admin shell renders secure navigation when authenticated", async ({ page }) => {
  await signInAsAdmin(page, fixtures.superAdmin);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();
});
