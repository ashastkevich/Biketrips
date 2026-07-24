import { NextResponse } from "next/server";

import { isSecureRequest } from "../session-cookie";

const authCookieName = "biketrips_session";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: 0,
  });

  return response;
}
