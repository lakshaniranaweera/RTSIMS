import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = !!req.auth?.user?.id;

  // Allow Auth.js endpoints through untouched.
  if (path.startsWith("/api/auth")) return NextResponse.next();

  // Public: /login — bounce authenticated users to their landing page.
  // ("/" resolves the role's landingPath server-side in app/page.tsx.)
  if (path === "/login") {
    if (isLoggedIn) return NextResponse.redirect(new URL("/", nextUrl));
    return NextResponse.next();
  }

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
