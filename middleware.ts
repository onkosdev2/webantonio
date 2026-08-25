import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "dr_ac_admin_session";

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/panel") &&
    !request.cookies.has(SESSION_COOKIE)
  ) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*"]
};
