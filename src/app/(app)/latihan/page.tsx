import { redirect } from "next/navigation";
import { homeFor } from "@/components/layout/nav";
import { getCurrentPublicUser } from "@/lib/server/data";
import { LatihanClient } from "./latihan-client";

export default async function LatihanPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "mahasiswa") redirect(homeFor(user.role));

  const { topic } = await searchParams;
  return <LatihanClient initialTopicId={topic} />;
}
