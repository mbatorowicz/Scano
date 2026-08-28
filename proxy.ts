import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, isSessionTokenValid } from "@/lib/auth";

const LOGIN_PATH = "/login";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = isSessionTokenValid(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (signedIn) {
    if (pathname === LOGIN_PATH) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Brak aktywnej sesji. Zaloguj się w aplikacji." },
      { status: 401 },
    );
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  const target = `${pathname}${search}`;
  if (target !== "/") {
    loginUrl.searchParams.set("dalej", target);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)",
  ],
};
