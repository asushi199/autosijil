import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isAuthedCookie } from "@/lib/admin-auth";

// Pengganti middleware (konvensyen Next 16) — lindungi /admin & /api/admin
// dengan satu kata laluan pentadbir dikongsi (kuki sesi bertandatangan).
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const needsAuth = path.startsWith("/admin") || path.startsWith("/api/admin");
  if (!needsAuth) return NextResponse.next();

  const authed = await isAuthedCookie(request.cookies.get(ADMIN_COOKIE)?.value);
  if (authed) return NextResponse.next();

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Tidak dibenarkan" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
