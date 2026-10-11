import { NextResponse } from "next/server";
import { getSession } from "@/lib/db/session";
import { getUserById } from "@/lib/db/store";
import { toPublicUser } from "@/lib/server/api-auth";

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)vma_session=([^;]+)/)?.[1];
  const session = await getSession(token);
  if (!session) return NextResponse.json({ user: null });
  const user = await getUserById(session.userId);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: toPublicUser(user) });
}
