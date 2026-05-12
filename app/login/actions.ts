"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  STORES: "/stores",
  STAFF: "/staff",
};

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  // Cookie has been set; resolve role for redirect.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return { error: "Account is unavailable." };

  redirect(HOME_BY_ROLE[user.role]);
}
