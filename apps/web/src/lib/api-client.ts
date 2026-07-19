import type { ApiResponse } from "@pitchdeck/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const match = /(?:^|;\s*)pd_csrf_token=([^;]+)/.exec(document.cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers.set("X-CSRF-Token", csrf);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiClientError(json.error.code, json.error.message);
  }

  return json.data;
}

export async function fetchCsrfToken(): Promise<string> {
  const data = await apiFetch<{ csrfToken: string }>("/auth/csrf");
  return data.csrfToken;
}
