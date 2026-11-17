import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: visitors without a session cookie are sent to the
 * login page before any app page renders. Every page and Server Action still
 * validates the session against the database.
 */
const SESSION_COOKIE = "aip_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/login", request.url);
  const destination = request.nextUrl.pathname + request.nextUrl.search;
  if (destination !== "/dashboard") login.searchParams.set("next", destination);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/planner/:path*",
    "/calendar/:path*",
    "/tasks/:path*",
    "/journal/:path*",
    "/mood/:path*",
    "/fitness/:path*",
    "/settings/:path*",
  ],
};
