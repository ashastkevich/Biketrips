"use client";

const postAuthReturnKey = "biketrips:post-auth-return-to";

export function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function savePostAuthReturnTo(value: string): void {
  try {
    window.sessionStorage.setItem(postAuthReturnKey, safeReturnTo(value));
  } catch {
    // Ignore storage errors; the URL returnTo parameter still carries the redirect target.
  }
}

export function consumePostAuthReturnTo(fallback: string): string {
  try {
    const saved = window.sessionStorage.getItem(postAuthReturnKey);
    window.sessionStorage.removeItem(postAuthReturnKey);
    return saved ? safeReturnTo(saved) : safeReturnTo(fallback);
  } catch {
    return safeReturnTo(fallback);
  }
}
