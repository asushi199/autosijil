"use client";

import { useMemo, useState } from "react";
import {
  formatPkgAttendanceCopy,
  groupSchoolAttendanceByPkg,
  pkgGroupLabel,
  type SchoolAttendancePkgGroup,
  type SchoolAttendanceRow,
} from "@/lib/school-attendance";

type AttendanceFilter = "absent" | "present" | "all";

export default function SchoolAttendanceSummary({
  rows,
  fieldLabel,
  totalAttendeeCount,
}: {
  rows: SchoolAttendanceRow[];
  fieldLabel: string;
  totalAttendeeCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<AttendanceFilter>("absent");
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const presentCount = rows.filter((row) => row.attendeeCount > 0).length;
  const absentRows = rows.filter((row) => row.attendeeCount === 0);
  const matchedAttendeeCount = rows.reduce((total, row) => total + row.attendeeCount, 0);
  const unmatchedAttendeeCount = Math.max(0, totalAttendeeCount - matchedAttendeeCount);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (filter === "present") return row.attendeeCount > 0;
        if (filter === "absent") return row.attendeeCount === 0;
        return true;
      })
      .filter((row) =>
        !normalizedQuery ||
        row.code.toLowerCase().includes(normalizedQuery) ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.zone.toLowerCase().includes(normalizedQuery) ||
        pkgGroupLabel(row.zone).toLowerCase().includes(normalizedQuery),
      )
      .sort((a, b) => {
        if (filter === "present" && a.attendeeCount !== b.attendeeCount) {
          return b.attendeeCount - a.attendeeCount;
        }
        return a.code.localeCompare(b.code);
      });
  }, [filter, query, rows]);

  const filteredGroups = useMemo(
    () => groupSchoolAttendanceByPkg(filteredRows),
    [filteredRows],
  );

  const absentGroups = useMemo(
    () =>
      groupSchoolAttendanceByPkg(
        [...absentRows].sort((a, b) => a.code.localeCompare(b.code)),
      ),
    [absentRows],
  );

  async function copyText(key: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
    } catch {
      setCopiedKey(null);
    }
  }

  function copyGroup(group: SchoolAttendancePkgGroup) {
    void copyText(group.zone || "lain", formatPkgAttendanceCopy([group]));
  }

  const filters: { value: AttendanceFilter; label: string; count: number }[] = [
    { value: "absent", label: "Belum hadir", count: absentRows.length },
    { value: "present", label: "Sudah hadir", count: presentCount },
    { value: "all", label: "Semua sekolah", count: rows.length },
  ];

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left transition-colors hover:bg-gray-50 -m-2 p-2"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <div className="min-w-0">
            <h2 className="font-medium">Ringkasan Kehadiran Sekolah</h2>
            <p className="mt-1 text-xs text-gray-500">
              Berdasarkan medan <b>{fieldLabel}</b> dan semua sekolah dalam Direktori Sekolah,
              dikumpulkan mengikut PKG.
            </p>
            {!expanded && (
              <p className="mt-2 text-xs text-gray-600">
                {presentCount} sudah hadir · {absentRows.length} belum hadir · {totalAttendeeCount}{" "}
                peserta
              </p>
            )}
          </div>
        </button>
        {expanded && (
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={!absentRows.length}
            onClick={() => copyText("all", formatPkgAttendanceCopy(absentGroups))}
          >
            {copiedKey === "all" ? "Semua PKG disalin" : "Salin semua PKG belum hadir"}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700">Sekolah sudah hadir</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-900">{presentCount}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">Sekolah belum hadir</p>
          <p className="mt-1 text-2xl font-semibold text-amber-900">{absentRows.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-600">Jumlah sekolah</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-700">Jumlah peserta hadir</p>
          <p className="mt-1 text-2xl font-semibold text-blue-900">{totalAttendeeCount}</p>
        </div>
      </div>

      {unmatchedAttendeeCount > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {unmatchedAttendeeCount} rekod peserta tiada padanan dalam Direktori Sekolah dan tidak
          termasuk dalam bilangan mengikut sekolah.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === item.value
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      <input
        className="input"
        placeholder="Cari kod, nama sekolah atau PKG…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {!filteredGroups.length ? (
        <p className="py-5 text-center text-sm text-gray-500">
          {!rows.length
            ? "Direktori Sekolah belum mempunyai rekod."
            : filter === "absent" && !query
            ? "Semua sekolah dalam direktori telah hadir."
            : "Tiada sekolah sepadan dengan carian."}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const absentInGroup = group.rows.filter((row) => row.attendeeCount === 0).length;
            return (
              <div key={group.zone || "lain"} className="overflow-hidden rounded-lg border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{group.label}</h3>
                    <p className="text-xs text-gray-500">
                      {group.rows.length} sekolah
                      {filter !== "present" ? ` · ${absentInGroup} belum hadir` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={!group.rows.length}
                    onClick={() => copyGroup(group)}
                  >
                    {copiedKey === (group.zone || "lain") ? "Disalin" : "Salin senarai PKG ini"}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="px-3 py-2 font-medium">Kod</th>
                        <th className="px-3 py-2 font-medium">Nama Sekolah</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 text-right font-medium">Bil. Hadir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.code} className="border-b border-gray-100 last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 font-medium">{row.code}</td>
                          <td className="min-w-56 px-3 py-2">{row.name}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                row.attendeeCount > 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {row.attendeeCount > 0 ? "Sudah hadir" : "Belum hadir"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{row.attendeeCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </section>
  );
}
