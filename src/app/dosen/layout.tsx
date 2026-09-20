import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { dosenNav } from "@/components/layout/nav";
import { getCurrentPublicUser } from "@/lib/server/data";
import { homeFor } from "@/components/layout/nav";

export default async function DosenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "dosen" && user.role !== "admin") redirect(homeFor(user.role));

  return (
    <AppShell user={user} nav={dosenNav}>
      {children}
    </AppShell>
  );
}