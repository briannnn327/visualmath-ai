"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/authStore";
import { Toaster } from "@/components/ui/toast";
import type { PublicUser } from "@/lib/types";

function AuthHydrate({ user }: { user: PublicUser | null }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrate(user);
  }, [hydrate, user]);
  return null;
}

export function Providers({ children, user }: { children: ReactNode; user: PublicUser | null }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrate user={user} />
      <Toaster />
      {children}
    </QueryClientProvider>
  );
}