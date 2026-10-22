import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  countUnreadNotifications,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db/store";
import { apiUser, badRequest, unauthorized } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const [items, unread] = await Promise.all([
    listNotifications(user.id),
    countUnreadNotifications(user.id),
  ]);
  const notifications = items.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));
  return NextResponse.json({ notifications, unread });
}

/** Tandai dibaca: `{ id }` untuk satu, `{ all: true }` untuk semua. */
export async function PATCH(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id, all } = (body ?? {}) as { id?: string; all?: boolean };
  if (all) {
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }
  if (!id) return badRequest("ID notifikasi wajib diisi");
  await markNotificationRead(user.id, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id } = (body ?? {}) as { id?: string };
  if (!id) return badRequest("ID notifikasi wajib diisi");
  await deleteNotification(user.id, id);
  return NextResponse.json({ ok: true });
}
