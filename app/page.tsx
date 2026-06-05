import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveLandingPath } from "@/lib/permissions";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Guard against a stale cookie referencing a user that no longer exists.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true },
  });
  if (!user || user.deletedAt) redirect("/login");

  redirect(await resolveLandingPath(session.user.id));
}
