import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Construction } from "lucide-react";

export default async function ActivationFormPage({
  params,
}: {
  params: Promise<{ id: string; formNumber: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id, formNumber: fnStr } = await params;
  const formNumber = Number(fnStr);
  if (![1, 2, 3, 4].includes(formNumber)) notFound();

  const activation = await prisma.activation.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!activation) notFound();

  return (
    <AppShell title={`Form ${formNumber}`}>
      <div className="space-y-4 max-w-3xl">
        <Link
          href={`/admin/finance/activation/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to {activation.name}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Form {formNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Construction className="size-10" />
              <p className="text-sm">This form is coming soon.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
