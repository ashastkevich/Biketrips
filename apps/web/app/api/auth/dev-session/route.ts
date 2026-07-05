import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const authCookieName = "biketrips_session";

const devUsers = {
  user: {
    sub: "00000000-0000-4000-8000-000000000001",
    name: "Тестовый пользователь",
    role: "user",
    phone: "",
    phoneVerified: false,
  },
  creator: {
    sub: "00000000-0000-4000-8000-000000000002",
    name: "Тестовый создатель",
    role: "user",
    phone: "+7 (999) 000-00-02",
    phoneVerified: true,
  },
  admin: {
    sub: "00000000-0000-4000-8000-000000000003",
    name: "Тестовый администратор",
    role: "admin",
    phone: "+7 (999) 000-00-03",
    phoneVerified: true,
  },
} as const;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const requestedReturnTo = url.searchParams.get("returnTo") ?? "/";
  const returnTo =
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/";
  const response = NextResponse.redirect(new URL(returnTo, url.origin));

  if (mode === "guest") {
    response.cookies.set(authCookieName, "", { path: "/", maxAge: 0 });
    return response;
  }

  const user = mode && mode in devUsers
    ? devUsers[mode as keyof typeof devUsers]
    : null;

  if (!user) {
    return NextResponse.json({ message: "Unknown development role" }, { status: 400 });
  }

  const token = jwt.sign(user, process.env.JWT_SECRET ?? "local-development-secret", {
    expiresIn: "7d",
  });
  response.cookies.set(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
