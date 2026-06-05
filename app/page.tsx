import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resolveLandingPath } from "@/lib/permissions";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  redirect(await resolveLandingPath(session.user.id));
}
