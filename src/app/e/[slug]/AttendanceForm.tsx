"use client";

import { useState } from "react";
import type { AttendeeData, FormField, FormValue } from "@/lib/types";
import type { SchoolDirectoryEntry } from "@/lib/school-directory";
import SchoolPicker from "./SchoolPicker";

export default function AttendanceForm({
  slug,
  fields,
  schools,
  isRegistration = false,
}: {
  slug: string;
  fields: FormField[];
  schools: SchoolDirectoryEntry[];
  isRegistration?: boolean;
}) {
  const nameKey = fields.find((f) => f.role === "name")?.key;
  const [values, setValues] = useState<AttendeeData>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [makeupSessions, setMakeupSessions] = useState<Array<{ id: string; date: string; slot: string }>>([]);
  const [selectedMakeups, setSelectedMakeups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function setValue(key: string, v: FormValue) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function stringValue(key: string) {
    const value = values[key];
    return typeof value === "string" ? value : "";
  }

  function toggleChoice(key: string, option: string) {
    const current = values[key];
    const selected = Array.isArray(current) ? current : [];
    setValue(key, selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/e/${slug}/hadir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values, makeupSessionIds: selectedMakeups }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Ralat tidak dijangka. Sila cuba lagi.");
        return;
      }
      setMakeupSessions(body.makeupSessions ?? []);
      if ((body.makeupSessions ?? []).length === 0 || selectedMakeups.length > 0) setDone(true);
    } catch {
      setError("Tiada sambungan internet. Sila cuba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const submittedName = nameKey ? stringValue(nameKey).trim() : "";
    return (
      <div className="card text-center">
        <div className="mb-2 text-3xl">✅</div>
        <p className="font-medium">
          Terima kasih! {isRegistration ? "Pendaftaran" : "Kehadiran"} anda telah direkodkan.
        </p>
        {submittedName && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Nama untuk sijil: <b>{submittedName}</b>
          </p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Semak ejaan nama di atas — nama inilah yang akan dicetak pada sijil. Jika silap,
          sila maklumkan kepada urus setia program.
        </p>
        {!isRegistration && (
          <p className="mt-2 text-sm text-gray-500">
            Sijil penyertaan boleh dimuat turun <b>di pautan yang sama</b> selepas dibuka oleh
            urus setia program.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="label">
            {f.label}
            {f.required && <span className="text-red-500"> *</span>}
          </label>
          {f.type === "text" && (
            <input
              className="input"
              required={f.required}
              value={stringValue(f.key)}
              onChange={(e) => setValue(f.key, e.target.value)}
            />
          )}
          {f.type === "school" && (
            <SchoolPicker
              value={stringValue(f.key)}
              schools={schools}
              required={f.required}
              onChange={(code) => setValue(f.key, code)}
            />
          )}
          {f.type === "select" && (
            <select
              className="input"
              required={f.required}
              value={stringValue(f.key)}
              onChange={(e) => setValue(f.key, e.target.value)}
            >
              <option value="">— Pilih —</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
          {f.type === "radio" && (
            <div className="space-y-1.5">
              {(f.options ?? []).map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={f.key}
                    required={f.required}
                    checked={stringValue(f.key) === o}
                    onChange={() => setValue(f.key, o)}
                  />
                  {o}
                </label>
              ))}
            </div>
          )}
          {f.type === "checkbox" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={stringValue(f.key) === "Ya"}
                onChange={(e) => setValue(f.key, e.target.checked ? "Ya" : "")}
              />
              Ya
            </label>
          )}
          {f.type === "textarea" && (
            <textarea
              className="input"
              rows={4}
              required={f.required}
              value={stringValue(f.key)}
              onChange={(e) => setValue(f.key, e.target.value)}
            />
          )}
          {f.type === "date" && (
            <input
              type="date"
              className="input"
              required={f.required}
              value={stringValue(f.key)}
              onChange={(e) => setValue(f.key, e.target.value)}
            />
          )}
          {f.type === "ic" && (
            <input
              inputMode="numeric"
              pattern="[0-9]{12}"
              maxLength={12}
              className="input"
              required={f.required}
              value={stringValue(f.key)}
              onChange={(e) => setValue(f.key, e.target.value.replace(/\D/g, ""))}
            />
          )}
          {f.type === "checkboxes" && (
            <div className="space-y-1.5">
              {(f.options ?? []).map((option) => {
                const current = values[f.key];
                const selected = Array.isArray(current) ? current : [];
                return (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => toggleChoice(f.key, option)}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {makeupSessions.length > 0 && (
        <fieldset className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <legend className="px-1 font-medium">Pilih tarikh untuk rekod kehadiran lewat</legend>
          <p className="mb-2 text-xs text-gray-600">Kehadiran lewat direkodkan dengan masa sebenar anda menghantar borang ini.</p>
          {makeupSessions.map((session) => (
            <label key={session.id} className="flex gap-2 py-1">
              <input type="checkbox" checked={selectedMakeups.includes(session.id)} onChange={() => setSelectedMakeups((items) => items.includes(session.id) ? items.filter((id) => id !== session.id) : [...items, session.id])} />
              {session.date} · {session.slot === "full_day" ? "Sepanjang Hari" : session.slot === "am" ? "Pagi" : "Petang"}
            </label>
          ))}
          <button type="button" className="mt-2 text-xs font-medium text-blue-700 underline" onClick={() => setDone(true)}>
            Tiada kehadiran lewat untuk direkodkan
          </button>
        </fieldset>
      )}
      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Menghantar…" : selectedMakeups.length ? "Simpan Kehadiran Lewat" : "Hantar Kehadiran"}
      </button>
    </form>
  );
}
