"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "./actions";

type Tab = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: React.ReactNode;
};

const TABS: Tab[] = [
  {
    href: "/admin",
    label: "Program",
    match: (p) => p === "/admin" || p.startsWith("/admin/events"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v3M16 3v3" />
      </svg>
    ),
  },
  {
    href: "/admin/templates",
    label: "Templat",
    match: (p) => p.startsWith("/admin/templates"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <circle cx="12" cy="9" r="4.5" />
        <path d="M8.5 12.5 7 21l5-2.5L17 21l-1.5-8.5" />
      </svg>
    ),
  },
];

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M4 12h11" />
    </svg>
  );
}

/** Pautan navigasi untuk header (desktop). */
export function AdminHeaderNav() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {TABS.map((t) => {
        const active = t.match(path);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              active ? "bg-blue-50 font-medium text-blue-700" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
      <form action={signOut}>
        <button
          type="submit"
          className="cursor-pointer rounded-lg px-3 py-1.5 text-gray-500 transition-colors hover:text-red-700"
        >
          Log Keluar
        </button>
      </form>
    </nav>
  );
}

/** Bar tab bawah untuk mudah alih (mobile). */
export function AdminTabBar() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-blue-700" : "text-gray-500 active:text-gray-900"
              }`}
            >
              <span className={active ? "-translate-y-px" : ""}>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Butang log keluar untuk header (mudah alih). */
export function AdminMobileLogout() {
  return (
    <form action={signOut} className="md:hidden">
      <button
        type="submit"
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 transition-colors active:text-red-700"
      >
        <LogoutIcon />
        Log Keluar
      </button>
    </form>
  );
}
