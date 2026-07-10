import Link from "next/link";
import { AdminHeaderNav, AdminMobileLogout, AdminTabBar } from "./AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold">
            e-Sijil <span className="text-blue-700">&amp;</span> Kehadiran
          </Link>
          <AdminHeaderNav />
          <AdminMobileLogout />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">{children}</main>
      <AdminTabBar />
    </div>
  );
}
