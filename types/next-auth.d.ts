import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    roleId: string | null;
    roleName: string | null;
  }
  interface Session {
    user: {
      id: string;
      roleId: string | null;
      roleName: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    roleId: string | null;
    roleName: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    roleId: string | null;
    roleName: string | null;
  }
}
