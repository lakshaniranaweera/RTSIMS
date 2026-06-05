import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveLandingPath } from "@/lib/permissions";
import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage() {
  // If the session is valid (user still exists), skip the form and go to their
  // landing page. A stale cookie (user deleted / DB reset) falls through here
  // and simply renders the form.
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { deletedAt: true },
    });
    if (user && !user.deletedAt) {
      redirect(await resolveLandingPath(session.user.id));
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Inventory Management System. Use a demo account or your assigned credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-6 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo account</p>
            <ul className="mt-1 grid gap-0.5">
              <li>admin@example.com — Administrator</li>
            </ul>
            <p className="mt-1">Password: <code>password123</code></p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
