import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const WEB_ORIGIN = process.env.WEB_BASE_URL ?? "http://localhost:3000";

function mergeCookies(existing: string, headers: Headers): string {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookieHeader = headers.get("set-cookie");
  const rawParts =
    typeof getSetCookie === "function"
      ? getSetCookie.call(headers)
      : setCookieHeader
        ? [setCookieHeader]
        : [];
  const parts = rawParts
    .map((cookie) => cookie.split(";")[0] ?? "")
    .filter((cookiePart) => cookiePart.length > 0);
  const merged = new Map<string, string>();
  for (const part of [...existing.split("; ").filter(Boolean), ...parts]) {
    const eqIndex = part.indexOf("=");
    if (eqIndex <= 0) continue;
    const name = part.slice(0, eqIndex);
    const value = part.slice(eqIndex + 1);
    merged.set(name, value);
  }
  return [...merged.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing-token", request.url));
  }

  let cookies = "";

  try {
    const csrfRes = await fetch(`${API_URL}/auth/csrf`, {
      headers: { Origin: WEB_ORIGIN },
    });
    cookies = mergeCookies(cookies, csrfRes.headers);
    const csrfBody = (await csrfRes.json()) as { data: { csrfToken: string } };
    const csrfToken = csrfBody.data.csrfToken;

    const confirmRes = await fetch(`${API_URL}/auth/email-verification/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: WEB_ORIGIN,
        Cookie: cookies,
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ token }),
    });

    if (!confirmRes.ok) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid-token", request.url));
    }

    return NextResponse.redirect(new URL("/verify-email?verified=true", request.url));
  } catch {
    return NextResponse.redirect(new URL("/verify-email?error=verification-failed", request.url));
  }
}
