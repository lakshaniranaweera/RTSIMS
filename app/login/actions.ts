"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveLandingPath } from "@/lib/permissions";

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

  // Cookie has been set; resolve landing path for redirect.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return { error: "Account is unavailable." };

  redirect(await resolveLandingPath(user.id));
}
