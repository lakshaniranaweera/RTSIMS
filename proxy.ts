import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  STORES: "/stores",
  STAFF: "/staff",
};

const ROUTE_RULES: Array<{ prefix: string; allow: Role[] }> = [
  { prefix: "/admin/requests", allow: ["ADMIN", "STORES", "STAFF"] },
  { prefix: "/admin", allow: ["ADMIN"] },
  { prefix: "/stores", allow: ["ADMIN", "STORES"] },
  { prefix: "/staff", allow: ["STAFF"] },
];

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const session = req.auth;
  const role = session?.user?.role;

  // Allow Auth.js endpoints through untouched.
  if (path.startsWith("/api/auth")) return NextResponse.next();

  // Public: /login
  if (path === "/login") {
    if (role) return NextResponse.redirect(new URL(HOME_BY_ROLE[role], nextUrl));
    return NextResponse.next();
  }

  // Root: bounce to login or role home
  if (path === "/") {
    return NextResponse.redirect(
      new URL(role ? HOME_BY_ROLE[role] : "/login", nextUrl),
    );
  }

  // Role-protected sections
  const rule = ROUTE_RULES.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  if (rule) {
    if (!role) return NextResponse.redirect(new URL("/login", nextUrl));
    if (!rule.allow.includes(role))
      return NextResponse.redirect(new URL(HOME_BY_ROLE[role], nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
