"use client";

import { useMemo, useState, useTransition } from "react";
import type { Attendee, FormField } from "@/lib/types";
import { deleteAttendee, updateAttendeeName } from "../../actions";

export default function AttendeeTable({
  eventId,
  attendees,
  fields,
  nameKey,
  hasTemplate,
}: {
  eventId: string;
  attendees: Attendee[];
  fields: FormField[];
  nameKey: string | null;
  hasTemplate: boolean;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter(
      (a) =>
        a.name_value.toLowerCase().includes(q) ||
        fields.some((f) => (a.data?.[f.key] ?? "").toLowerCase().includes(q)),
    );
  }, [attendees, fields, query]);

  function startEdit(a: Attendee) {
    setError(null);
    setEditing(a.id);
    setEditValue(a.name_value);
  }

  function saveEdit(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateAttendeeName(eventId, id, editValue);
      if (res?.error) setError(res.error);
      else setEditing(null);
    });
  }

  function remove(a: Attendee) {
    if (!confirm(`Padam kehadiran "${a.name_value}"? Tindakan ini tidak boleh diundur.`)) return;
    startTransition(async () => {
      await deleteAttendee(eventId, a.id);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="input"
          placeholder="Cari nama / medan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <span className="whitespace-nowrap text-xs text-gray-500">
            {filtered.length} / {attendees.length}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!filtered.length ? (
        <p className="py-6 text-center text-sm text-gray-500">
          Tiada kehadiran sepadan dengan carian.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-3 py-2 font-medium">#</th>
                {fields.map((f) => (
                  <th key={f.key} className="px-3 py-2 font-medium">{f.label}</th>
                ))}
                <th className="px-3 py-2 font-medium">Masa</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const isEditing = editing === a.id;
                return (
                  <tr key={a.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-400">{attendees.indexOf(a) + 1}</td>
                    {fields.map((f) => (
                      <td key={f.key} className="px-3 py-2">
                        {isEditing && f.key === nameKey ? (
                          <input
                            className="input"
                            value={editValue}
                            autoFocus
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(a.id);
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                        ) : (
                          a.data?.[f.key] ?? ""
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                      {new Date(a.created_at).toLocaleString("ms-MY")}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEditing ? (
                        <span className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => saveEdit(a.id)}
                            disabled={pending}
                            className="cursor-pointer text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
                          >
                            simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="cursor-pointer text-xs text-gray-500 hover:underline"
                          >
                            batal
                          </button>
                        </span>
                      ) : (
                        <span className="flex justify-end gap-3">
                          {hasTemplate && (
                            <a
                              href={`/api/admin/events/${eventId}/sijil?attendee=${a.id}`}
                              target="_blank"
                              className="text-xs text-blue-700 hover:underline"
                            >
                              sijil
                            </a>
                          )}
                          {nameKey && (
                            <button
                              type="button"
                              onClick={() => startEdit(a)}
                              className="cursor-pointer text-xs text-gray-600 hover:underline"
                            >
                              sunting
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(a)}
                            disabled={pending}
                            className="cursor-pointer text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            padam
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
