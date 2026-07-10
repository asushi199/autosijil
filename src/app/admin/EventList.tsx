"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { STATUS_LABEL, type EventStatus } from "@/lib/types";

export interface EventRowLite {
  id: string;
  title: string;
  event_date: string | null;
  status: EventStatus;
  count: number;
}

const BADGE: Record<EventStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-green-100 text-green-800",
  closed: "bg-amber-100 text-amber-800",
  released: "bg-blue-100 text-blue-800",
};

const BULAN = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];
const BULAN_PENDEK = [
  "Jan", "Feb", "Mac", "Apr", "Mei", "Jun",
  "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis",
];

function monthKey(dateStr: string | null): string {
  return dateStr ? dateStr.slice(0, 7) : "none";
}

function monthLabel(key: string): string {
  if (key === "none") return "Tiada tarikh";
  if (key === "all") return "Semua bulan";
  const [y, m] = key.split("-");
  return `${BULAN[Number(m) - 1]} ${y}`;
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default function EventList({ rows }: { rows: EventRowLite[] }) {
  // Kumpulan mengikut bulan (tarikh program), terkini di atas; "Tiada tarikh" di hujung.
  const months = useMemo(() => {
    const keys = Array.from(new Set(rows.map((r) => monthKey(r.event_date))));
    const dated = keys.filter((k) => k !== "none").sort((a, b) => b.localeCompare(a));
    return keys.includes("none") ? [...dated, "none"] : dated;
  }, [rows]);

  const datedMonths = useMemo(() => months.filter((k) => k !== "none"), [months]);
  const hasNone = months.includes("none");
  const years = useMemo(
    () => Array.from(new Set(datedMonths.map((k) => Number(k.slice(0, 4))))).sort((a, b) => a - b),
    [datedMonths],
  );
  const minYear = years[0];
  const maxYear = years[years.length - 1];

  // Lalai: bulan terkini supaya senarai awal ringkas.
  const [filter, setFilter] = useState<string>(() => months[0] ?? "all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() =>
    months[0] && months[0] !== "none" ? Number(months[0].slice(0, 4)) : maxYear ?? new Date().getFullYear(),
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  if (!rows.length) {
    return (
      <div className="card text-center text-gray-500 py-12">
        Tiada program lagi. Klik <b>Program Baharu</b> untuk bermula.
      </div>
    );
  }

  const isAll = filter === "all";
  const idx = months.indexOf(filter);
  const atNewest = idx <= 0; // months[0] = terkini
  const atOldest = idx === months.length - 1;
  const currentCount = isAll ? 0 : rows.filter((r) => monthKey(r.event_date) === filter).length;

  const goOlder = () => !isAll && !atOldest && setFilter(months[idx + 1]);
  const goNewer = () => !isAll && !atNewest && setFilter(months[idx - 1]);

  function openPicker() {
    if (filter !== "all" && filter !== "none") setPickerYear(Number(filter.slice(0, 4)));
    else if (maxYear) setPickerYear(maxYear);
    setPickerOpen((v) => !v);
  }
  function pick(key: string) {
    setFilter(key);
    setPickerOpen(false);
  }

  const shown = isAll ? months : [filter];

  return (
    <div className="space-y-4">
      {/* Kawalan bulan: anak panah untuk bulan bersebelahan, tekan label untuk pilih tahun/bulan */}
      <div ref={wrapRef} className="relative flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={goOlder}
          disabled={isAll || atOldest}
          aria-label="Bulan lebih lama"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft />
        </button>

        <button
          type="button"
          onClick={openPicker}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          className="flex min-w-[9.5rem] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-gray-100"
        >
          <span>
            {monthLabel(filter)}
            {!isAll && <span className="font-normal text-gray-400"> · {currentCount}</span>}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
            className={`h-4 w-4 text-gray-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={goNewer}
          disabled={isAll || atNewest}
          aria-label="Bulan lebih baharu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight />
        </button>

        {pickerOpen && (
          <div
            role="dialog"
            aria-label="Pilih bulan"
            className="absolute top-full left-1/2 z-40 mt-2 w-64 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPickerYear((y) => Math.max(minYear ?? y, y - 1))}
                disabled={minYear === undefined || pickerYear <= minYear}
                aria-label="Tahun sebelumnya"
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft />
              </button>
              <span className="text-sm font-semibold tabular-nums">{pickerYear}</span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => Math.min(maxYear ?? y, y + 1))}
                disabled={maxYear === undefined || pickerYear >= maxYear}
                aria-label="Tahun berikutnya"
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {BULAN_PENDEK.map((label, i) => {
                const key = `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
                const has = datedMonths.includes(key);
                const selected = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => has && pick(key)}
                    disabled={!has}
                    className={`rounded-md py-1.5 text-sm transition-colors ${
                      selected
                        ? "bg-blue-600 font-medium text-white"
                        : has
                          ? "text-gray-700 hover:bg-blue-50"
                          : "text-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => pick("all")}
                className={`rounded-md px-2 py-1 text-xs transition-colors hover:bg-gray-100 ${
                  isAll ? "font-medium text-blue-700" : "text-gray-600"
                }`}
              >
                Semua bulan
              </button>
              {hasNone && (
                <button
                  type="button"
                  onClick={() => pick("none")}
                  className={`rounded-md px-2 py-1 text-xs transition-colors hover:bg-gray-100 ${
                    filter === "none" ? "font-medium text-blue-700" : "text-gray-600"
                  }`}
                >
                  Tiada tarikh
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {shown.map((key) => {
        const group = rows.filter((r) => monthKey(r.event_date) === key);
        if (!group.length) return null;
        return (
          <section key={key} className="space-y-2">
            {isAll && (
              <h2 className="px-1 text-sm font-medium text-gray-500">
                {monthLabel(key)} <span className="text-gray-400">· {group.length}</span>
              </h2>
            )}
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Program</th>
                    <th className="px-4 py-3 font-medium">Tarikh</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((ev) => (
                    <tr key={ev.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/events/${ev.id}`} className="font-medium text-blue-700 hover:underline">
                          {ev.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ev.event_date ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[ev.status]}`}>
                          {STATUS_LABEL[ev.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{ev.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
