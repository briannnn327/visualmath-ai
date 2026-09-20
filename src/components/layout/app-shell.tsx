"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import type { NavItem } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/schemas";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import type { PublicUser } from "@/lib/types";
import { avatarColor, cn, initials } from "@/lib/utils";

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary-container text-on-primary-container"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
      )}
    >
      <Icon name={item.icon} size={20} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function UserChip({
  user,
  collapsed,
  onLogout,
}: {
  user: PublicUser;
  collapsed: boolean;
  onLogout: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl transition-opacity",
        collapsed ? "justify-center" : "p-2",
      )}
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-on-primary"
        style={{ backgroundColor: `var(${avatarColor(user.email)})` }}
      >
        {initials(user.name)}
      </span>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-on-surface">{user.name}</p>
          <p className="truncate text-xs text-on-surface-variant">{roleLabel[user.role]}</p>
        </div>
      )}
      {!collapsed && (
        <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Keluar">
          <Icon name="logout" size={16} />
        </Button>
      )}
    </div>
  );
}

export function AppShell({
  user,
  nav,
  children,
}: {
  user: PublicUser;
  nav: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const mobileOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileNavOpen);
  const logout = useAuthStore((s) => s.logout);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const active = nav.find((n) => isActive(n.href));
  const title = active?.label ?? "Beranda";

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-outline-variant bg-surface transition-[width] duration-300 lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <div
          className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "px-5")}
        >
          {collapsed ? <Logo compact /> : <Logo />}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 no-scrollbar">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        <div className="shrink-0 border-t border-outline-variant p-3">
          <UserChip user={user} collapsed={collapsed} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm animate-pop"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface shadow-float">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant px-5">
              <Logo />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu"
              >
                <Icon name="close" size={18} />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 no-scrollbar">
              {nav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>
            <div className="shrink-0 border-t border-outline-variant p-3">
              <UserChip user={user} collapsed={false} onLogout={handleLogout} />
            </div>
          </aside>
        </div>
      )}

      {/* Konten */}
      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-outline-variant bg-surface/80 px-4 backdrop-blur-md lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Icon name="menu" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={toggleSidebar}
            aria-label="Ciutkan sidebar"
          >
            <Icon name={collapsed ? "chevron-right" : "chevron-left"} />
          </Button>
          <h1 className="min-w-0 truncate font-display text-lg font-bold text-on-surface">
            {title}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant sm:inline-flex">
              <Icon name="sparkle" size={14} className="text-primary" />
              {roleLabel[user.role]}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              aria-label="Keluar"
              className="lg:hidden"
            >
              <Icon name="logout" size={16} />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
