import { redirect } from "next/navigation";
import { auth } from "@/auth";

const HOME_BY_ROLE = {
  ADMIN: "/admin",
  STORES: "/stores",
  STAFF: "/staff",
} as const;

export default async function Home() {
  const session = await auth();
  redirect(session?.user?.role ? HOME_BY_ROLE[session.user.role] : "/login");
}
