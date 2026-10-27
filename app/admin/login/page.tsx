import { getServerSession } from "next-auth";
import { authOptions, isAdminSession } from "@/lib/auth";
import { AdminLoginClient } from "./AdminLoginClient";

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = isAdminSession(session);

  return <AdminLoginClient signedInEmail={session?.user?.email ?? null} isAdmin={isAdmin} />;
}
