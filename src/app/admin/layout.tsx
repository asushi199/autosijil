import Link from "next/link";
import { signOut } from "./actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold">
            e-Sijil <span className="text-blue-700">&amp;</span> Kehadiran
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              Majlis
            </Link>
            <Link href="/admin/templates" className="text-gray-600 hover:text-gray-900">
              Templat Sijil
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-gray-500 hover:text-red-700 cursor-pointer">
                Log Keluar
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
