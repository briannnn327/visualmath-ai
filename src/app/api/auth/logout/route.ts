import { NextResponse } from "next/server";
import { destroySession } from "@/lib/db/session";

export async function POST(request: Request) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)vma_session=([^;]+)/)?.[1];
  destroySession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("vma_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}