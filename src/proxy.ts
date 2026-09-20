import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/db/session";
import type { Role } from "@/lib/types";

const STUDENT_PATHS = ["/dashboard", "/ai-explainer", "/grafik", "/latihan", "/riwayat", "/profil"];
const GUEST_ONLY = ["/login", "/register"];
const DOSEN_PATHS = ["/dosen"];
const ADMIN_PATHS = ["/admin"];

function homeFor(role: Role): string {
  return role === "dosen" ? "/dosen" : role === "admin" ? "/admin" : "/dashboard";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("vma_session")?.value;
  const session = getSession(token);
  const role = session?.role;

  const isStudentRoute = STUDENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isDosenRoute = DOSEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAdminRoute = ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isGuestOnly = GUEST_ONLY.includes(pathname);

  /* Halaman hanya untuk tamu: /login & /register */
  if (isGuestOnly) {
    if (session) {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(session.role);
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  /* Rute mahasiswa */
  if (isStudentRoute) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  /* Rute dosen */
  if (isDosenRoute) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    if (role !== "dosen" && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  /* Rute admin */
  if (isAdminRoute) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = role === "dosen" ? "/dosen" : "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png$|.*\\.svg$).*)",
  ],
};
