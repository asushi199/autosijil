"use client";

import { useTransition } from "react";
import { updateEventStatus } from "../../actions";
import type { EventStatus } from "@/lib/types";

const STEPS: { status: EventStatus; label: string; hint: string }[] = [
  { status: "draft", label: "Draf", hint: "Pautan awam belum aktif" },
  { status: "open", label: "Buka Kehadiran", hint: "Peserta boleh mengisi borang" },
  { status: "closed", label: "Tutup Kehadiran", hint: "Borang ditutup, sijil belum dibuka" },
  { status: "released", label: "Buka Muat Turun Sijil", hint: "Peserta boleh semak & muat turun sijil" },
];

export default function StatusControls({
  eventId,
  current,
  hasTemplate,
}: {
  eventId: string;
  current: EventStatus;
  hasTemplate: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {STEPS.map((s) => {
        const active = s.status === current;
        const disabled =
          pending || active || (s.status === "released" && !hasTemplate);
        return (
          <button
            key={s.status}
            disabled={disabled}
            onClick={() => startTransition(() => updateEventStatus(eventId, s.status))}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              active
                ? "border-blue-600 bg-blue-50 text-blue-800"
                : "border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            }`}
          >
            <span className="font-medium">{active ? "● " : ""}{s.label}</span>
            <span className="block text-xs text-gray-500">
              {s.status === "released" && !hasTemplate
                ? "Pilih templat sijil dahulu (dalam Sunting Majlis)"
                : s.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
