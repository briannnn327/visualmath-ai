"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  type NotificationItem,
  useDeleteNotification,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks/queries";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<NotificationItem["kind"], IconName> = {
  info: "info",
  success: "check-circle",
  warning: "warning",
  error: "x",
};

const KIND_TONE: Record<NotificationItem["kind"], string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}

/** Bell notifikasi in-app di header. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const remove = useDeleteNotification();

  const items = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Notifikasi"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-float animate-pop">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <p className="font-display text-sm font-bold text-on-surface">Notifikasi</p>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markRead.mutate({ all: true })}
                disabled={markRead.isPending}
              >
                Tandai semua
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-on-surface-variant">
                Belum ada notifikasi.
              </p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "group flex items-start gap-3 border-b border-outline-variant/50 px-4 py-3 transition-colors hover:bg-surface-container/50",
                  !n.read && "bg-primary-container/20",
                )}
              >
                <Icon
                  name={KIND_ICON[n.kind]}
                  size={18}
                  className={cn("mt-0.5 shrink-0", KIND_TONE[n.kind])}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface">{n.title}</p>
                  <p className="text-xs text-on-surface-variant">{n.body}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] text-on-surface-variant/70">
                      {timeAgo(n.createdAt)}
                    </span>
                    {n.href && (
                      <Link
                        href={n.href}
                        onClick={() => {
                          if (!n.read) markRead.mutate({ id: n.id });
                          setOpen(false);
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Buka
                      </Link>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Hapus notifikasi"
                  className="shrink-0 rounded-lg p-1 text-on-surface-variant/0 transition-colors group-hover:text-on-surface-variant hover:bg-surface-container"
                  onClick={() => remove.mutate(n.id)}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>

          {items.some((n) => !n.read) && (
            <div className="border-t border-outline-variant px-4 py-2">
              <Badge variant="primary">{unread} belum dibaca</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
