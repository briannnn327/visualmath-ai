"use client";

import { create } from "zustand";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";
import { uid } from "@/lib/utils";

export type ToastKind = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = uid("t-");
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const tone: Record<ToastKind, { icon: IconName; ring: string; text: string }> = {
  success: { icon: "check-circle", ring: "text-success", text: "text-on-success-container" },
  error: { icon: "warning", ring: "text-error", text: "text-on-error-container" },
  info: { icon: "info", ring: "text-info", text: "text-on-info-container" },
  warning: { icon: "warning", ring: "text-warning", text: "text-on-warning-container" },
};

const bgTone: Record<ToastKind, string> = {
  success: "bg-success-container",
  error: "bg-error-container",
  info: "bg-info-container",
  warning: "bg-warning-container",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 shadow-float animate-fade-up",
            bgTone[t.kind]
          )}
          role="status"
        >
          <Icon name={tone[t.kind].icon} className={cn("mt-0.5", tone[t.kind].ring)} size={18} />
          <p className={cn("text-sm font-medium", tone[t.kind].text)}>{t.message}</p>
        </div>
      ))}
    </div>
  );
}