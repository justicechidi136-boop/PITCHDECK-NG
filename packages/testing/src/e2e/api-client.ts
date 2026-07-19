export const DEFAULT_API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000/v1";
export const DEFAULT_WEB_ORIGIN = process.env.PLAYWRIGHT_WEB_ORIGIN ?? "http://localhost:3000";
export const DEFAULT_ADMIN_ORIGIN = process.env.PLAYWRIGHT_ADMIN_ORIGIN ?? "http://localhost:3001";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}@e2e.pitchdeck.test`;
}

export const TEST_PASSWORD = "TestPassword123!";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

export class ApiTestClient {
  private cookies = "";
  private csrfToken = "";

  constructor(
    private readonly apiUrl = DEFAULT_API_URL,
    private readonly origin = DEFAULT_WEB_ORIGIN,
  ) {}

  async fetchCsrf(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/auth/csrf`, {
      headers: { Origin: this.origin },
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookies = setCookie.split(",").map((part) => part.split(";")[0]).join("; ");
    }
    const body = (await response.json()) as ApiEnvelope<{ csrfToken: string }>;
    this.csrfToken = body.data.csrfToken;
    return this.csrfToken;
  }

  async request(
    path: string,
    options: { method?: string; body?: unknown; origin?: string } = {},
  ): Promise<{ status: number; data: unknown; headers: Headers }> {
    if (!this.csrfToken && options.method && options.method !== "GET") {
      await this.fetchCsrf();
    }

    const response = await fetch(`${this.apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Origin: options.origin ?? this.origin,
        ...(this.cookies ? { Cookie: this.cookies } : {}),
        ...(options.method && options.method !== "GET"
          ? { "X-CSRF-Token": this.csrfToken }
          : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const incoming = setCookie.split(",").map((part: string) => part.split(";")[0]);
      const existing = this.cookies
        ? this.cookies.split("; ").filter(Boolean)
        : [];
      const merged = new Map<string, string>();
      for (const cookiePart of [...existing, ...incoming]) {
        if (!cookiePart) {
          continue;
        }
        const [name, ...rest] = cookiePart.split("=");
        if (!name) {
          continue;
        }
        merged.set(name, rest.join("="));
      }
      this.cookies = [...merged.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    }

    const json = (await response.json()) as ApiEnvelope<unknown> | ApiErrorEnvelope;
    if (!response.ok || !json.success) {
      const message =
        "error" in json ? json.error.message : `Request failed with status ${String(response.status)}`;
      throw new Error(message);
    }

    return { status: response.status, data: json.data, headers: response.headers };
  }

  async registerInnovator(input: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    stateCode?: string;
  }) {
    return this.request("/auth/register", {
      method: "POST",
      body: {
        email: input.email,
        password: input.password ?? TEST_PASSWORD,
        firstName: input.firstName ?? "Test",
        lastName: input.lastName ?? "User",
        role: "INNOVATOR",
        stateCode: input.stateCode ?? "LA",
        acceptedTerms: true,
      },
    });
  }

  async login(email: string, password = TEST_PASSWORD) {
    return this.request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  }

  async me(): Promise<unknown> {
    return this.request("/auth/me");
  }

  async logout() {
    return this.request("/auth/logout", { method: "POST" });
  }

  getCookieHeader(): string {
    return this.cookies;
  }
}

export interface CapturedEmail {
  id: string;
  to: string;
  subject: string;
  actionUrl: string;
  capturedAt: string;
}

export async function clearCapturedEmails(apiUrl = DEFAULT_API_URL): Promise<void> {
  await fetch(`${apiUrl}/test/emails`, { method: "DELETE" });
}

export async function getCapturedEmails(
  to?: string,
  apiUrl = DEFAULT_API_URL,
): Promise<CapturedEmail[]> {
  const url = new URL(`${apiUrl}/test/emails`);
  if (to) {
    url.searchParams.set("to", to);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to read captured emails (${String(response.status)})`);
  }
  const body = (await response.json()) as ApiEnvelope<{ emails: CapturedEmail[] }>;
  return body.data.emails;
}

export async function waitForCapturedEmail(
  to: string,
  options: { timeoutMs?: number; apiUrl?: string } = {},
): Promise<CapturedEmail> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const apiUrl = options.apiUrl ?? DEFAULT_API_URL;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const emails = await getCapturedEmails(to, apiUrl);
    if (emails.length > 0) {
      const latest = emails.at(-1);
      if (latest) {
        return latest;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for captured email to ${to}`);
}

export function extractQueryParam(url: string, key: string): string {
  const parsed = new URL(url);
  const value = parsed.searchParams.get(key);
  if (!value) {
    throw new Error(`Missing ${key} in URL: ${url}`);
  }
  return value;
}
