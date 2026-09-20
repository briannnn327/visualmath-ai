import { NextResponse } from "next/server";
import { getSession } from "@/lib/db/session";
import { ensureSeeded, getUserById } from "@/lib/db/store";
import { toPublicUser } from "@/lib/server/api-auth";

export async function GET(request: Request) {
  ensureSeeded();
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)vma_session=([^;]+)/)?.[1];
  const session = getSession(token);
  if (!session) return NextResponse.json({ user: null });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: toPublicUser(user) });
}