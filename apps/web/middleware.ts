import { NextResponse, type NextRequest } from "next/server";

import { SITE_HOST } from "./app/lib/site";

// Fallback for www -> apex when nginx forwards the original Host header.
export function middleware(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]!
    .trim()
    .toLowerCase();

  if (host !== `www.${SITE_HOST}`) {
    return NextResponse.next();
  }

  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${SITE_HOST}`);
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|img/).*)"],
};
