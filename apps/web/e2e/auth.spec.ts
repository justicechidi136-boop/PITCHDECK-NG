import { test, expect } from "@playwright/test";
import {
  ApiTestClient,
  clearCapturedEmails,
  extractQueryParam,
  TEST_PASSWORD,
  uniqueEmail,
  waitForCapturedEmail,
} from "@pitchdeck/testing/e2e";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearCapturedEmails();
});

test("registers innovator with state and terms then shows verification screen", async ({ page }) => {
  const email = uniqueEmail("register");

  await page.goto("/register");
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Okonkwo");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByLabel("State").selectOption("LA");
  await page.getByLabel("I am a").selectOption("INNOVATOR");
  await page.getByRole("checkbox", { name: /terms of service/i }).check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/verify-email\?registered=true/);
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
});

test("shows validation for invalid email, short password, missing state, and missing terms", async ({
  page,
}) => {
  await page.goto("/register");

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByLabel("State").selectOption("");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByLabel("Email")).toHaveJSProperty("validity.valueMissing", false);
  await expect(page.getByLabel("Password")).toHaveJSProperty("validity.tooShort", true);
  await expect(page.getByLabel("State")).toHaveJSProperty("validity.valueMissing", true);
  await expect(page.getByRole("checkbox", { name: /terms of service/i })).toHaveJSProperty(
    "validity.valueMissing",
    true,
  );
});

test("verifies email using capture helper without exposing token in UI", async ({ page }) => {
  const email = uniqueEmail("verify");
  const client = new ApiTestClient();

  await client.registerInnovator({ email, stateCode: "LA" });
  const captured = await waitForCapturedEmail(email);
  const token = extractQueryParam(captured.actionUrl, "token");

  await page.goto(captured.actionUrl);
  await expect(page.getByText("Email verified successfully")).toBeVisible();
  await expect(page.content()).resolves.not.toContain(token);

  await expect(
    client.request("/auth/email-verification/confirm", {
      method: "POST",
      body: { token },
    }),
  ).rejects.toThrow();
});

test("blocks unverified login and allows verified login with HttpOnly cookies", async ({ page }) => {
  const email = uniqueEmail("login");
  const client = new ApiTestClient();

  await client.registerInnovator({ email, stateCode: "LA" });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(/verify your email/i);

  const captured = await waitForCapturedEmail(email);
  const token = extractQueryParam(captured.actionUrl, "token");
  await client.request("/auth/email-verification/confirm", {
    method: "POST",
    body: { token },
  });

  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/account");

  const cookies = await page.context().cookies();
  const accessCookie = cookies.find((cookie) => cookie.name === "pd_access_token");
  expect(accessCookie?.httpOnly).toBe(true);
});

test("shows generic error for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@e2e.pitchdeck.test");
  await page.getByLabel("Password").fill("WrongPassword999!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(/invalid email or password/i);
});

test("lists sessions, logs out, and redirects protected account routes", async ({ page }) => {
  const email = uniqueEmail("security");
  const client = new ApiTestClient();
  await client.registerInnovator({ email, stateCode: "LA" });
  const captured = await waitForCapturedEmail(email);
  const token = extractQueryParam(captured.actionUrl, "token");
  await client.request("/auth/email-verification/confirm", {
    method: "POST",
    body: { token },
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/account");

  await page.goto("/account/security");
  await expect(page.getByRole("heading", { name: "Active sessions" })).toBeVisible();
  await expect(page.getByText("(current)")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/account");
  await expect(page).toHaveURL("/login");
});

test("password reset avoids enumeration and rotates credentials", async ({ page }) => {
  const email = uniqueEmail("reset");
  const newPassword = "NewSecurePass1!";
  const client = new ApiTestClient();

  await client.registerInnovator({ email, stateCode: "LA" });
  let captured = await waitForCapturedEmail(email);
  await client.request("/auth/email-verification/confirm", {
    method: "POST",
    body: { token: extractQueryParam(captured.actionUrl, "token") },
  });

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists/i)).toBeVisible();

  await page.getByLabel("Email").fill("missing-user@e2e.pitchdeck.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists/i)).toBeVisible();

  captured = await waitForCapturedEmail(email);
  await page.goto(captured.actionUrl);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page).toHaveURL("/login?reset=true");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(/invalid email or password/i);

  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/account");
});
