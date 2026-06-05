import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = !!req.auth?.user?.id;

  // Allow Auth.js endpoints through untouched.
  if (path.startsWith("/api/auth")) return NextResponse.next();

  // Public: /login is always reachable. The login page itself redirects an
  // already-authenticated, still-valid user to their landing page (it verifies
  // the user exists in the DB, so a stale cookie just shows the form).
  if (path === "/login") return NextResponse.next();

  // Everything else requires authentication. Fine-grained authorization is
  // enforced per-page via hasPermission(), since dynamic role names cannot be
  // checked at the edge without database access.
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
