"use client";

import { useState } from "react";
import type { FormField } from "@/lib/types";

export default function AttendanceForm({ slug, fields }: { slug: string; fields: FormField[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setValue(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/e/${slug}/hadir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Ralat tidak dijangka. Sila cuba lagi.");
        return;
      }
      setDone(true);
    } catch {
      setError("Tiada sambungan internet. Sila cuba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <div className="mb-2 text-3xl">✅</div>
        <p className="font-medium">Terima kasih! Kehadiran anda telah direkodkan.</p>
        <p className="mt-2 text-sm text-gray-500">
          Sijil penyertaan boleh dimuat turun <b>di pautan yang sama</b> selepas dibuka oleh
          urus setia program.
        </p>
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
              value={values[f.key] ?? ""}
              onChange={(e) => setValue(f.key, e.target.value)}
            />
          )}
          {f.type === "select" && (
            <select
              className="input"
              required={f.required}
              value={values[f.key] ?? ""}
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
                    checked={values[f.key] === o}
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
                checked={values[f.key] === "Ya"}
                onChange={(e) => setValue(f.key, e.target.checked ? "Ya" : "")}
              />
              Ya
            </label>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Menghantar…" : "Hantar Kehadiran"}
      </button>
    </form>
  );
}
