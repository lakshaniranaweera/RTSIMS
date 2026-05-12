import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
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
            <p className="font-medium text-foreground">Demo accounts</p>
            <ul className="mt-1 grid gap-0.5">
              <li>admin@example.com — ADMIN</li>
              <li>stores@example.com — STORES</li>
              <li>staff@example.com — STAFF</li>
            </ul>
            <p className="mt-1">Password: <code>password123</code></p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
