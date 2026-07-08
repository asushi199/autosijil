"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateEvent } from "../../../actions";
import type { EventRow, FieldType, FormField, Template } from "@/lib/types";

let counter = 0;
function newKey() {
  return `medan_${Date.now().toString(36)}${(counter++).toString(36)}`;
}

const TYPE_LABEL: Record<FieldType, string> = {
  text: "Teks",
  select: "Senarai pilihan",
  radio: "Butang pilihan",
  checkbox: "Kotak semak (ya/tidak)",
};

export default function EventEditor({
  event,
  templates,
}: {
  event: EventRow;
  templates: Pick<Template, "id" | "name" | "orientation">[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [eventDate, setEventDate] = useState(event.event_date ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [templateId, setTemplateId] = useState(event.template_id ?? "");
  const [fields, setFields] = useState<FormField[]>(event.form_fields ?? []);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function patchField(i: number, patch: Partial<FormField>) {
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  }

  function setRole(i: number, role: "name" | "ic") {
    // 'name' mesti unik; 'ic' juga dijadikan unik untuk kesederhanaan
    setFields((fs) =>
      fs.map((f, j) => {
        if (j === i) return { ...f, role: f.role === role ? undefined : role };
        return f.role === role ? { ...f, role: undefined } : f;
      }),
    );
  }

  function move(i: number, dir: -1 | 1) {
    setFields((fs) => {
      const j = i + dir;
      if (j < 0 || j >= fs.length) return fs;
      const copy = [...fs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateEvent(event.id, {
        title,
        description: description.trim() || null,
        event_date: eventDate || null,
        location: location.trim() || null,
        form_fields: fields,
        template_id: templateId || null,
      });
      if (res?.error) setMsg({ kind: "err", text: res.error });
      else {
        setMsg({ kind: "ok", text: "Disimpan." });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sunting Majlis</h1>
        <Link href={`/admin/events/${event.id}`} className="text-sm text-blue-700 hover:underline">
          ← Kembali ke halaman majlis
        </Link>
      </div>

      <section className="card space-y-4">
        <h2 className="font-medium">Maklumat Majlis</h2>
        <div>
          <label className="label">Nama majlis / program *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Keterangan (dipaparkan pada borang)</label>
          <textarea
            className="input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tarikh</label>
            <input type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Tempat</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Templat sijil</label>
          <div className="flex gap-2">
            <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">— Belum dipilih —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.orientation === "landscape" ? "melintang" : "menegak"})
                </option>
              ))}
            </select>
            <Link href="/admin/templates" className="btn-secondary whitespace-nowrap">
              Urus Templat
            </Link>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Medan Borang Kehadiran</h2>
            <p className="text-xs text-gray-500">
              Tandakan satu medan sebagai <b>Nama</b> — nilai medan itu dicetak pada sijil dan
              digunakan untuk semakan. Medan <b>IC</b> adalah pilihan (memudahkan semakan sijil).
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() =>
              setFields((fs) => [
                ...fs,
                { key: newKey(), label: "", type: "text", required: false },
              ])
            }
          >
            + Tambah Medan
          </button>
        </div>

        {fields.map((f, i) => (
          <div key={f.key} className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input flex-1 min-w-40"
                placeholder="Label medan, cth. Nama Penuh"
                value={f.label}
                onChange={(e) => patchField(i, { label: e.target.value })}
              />
              <select
                className="input w-auto"
                value={f.type}
                onChange={(e) => patchField(i, { type: e.target.value as FieldType })}
              >
                {(Object.keys(TYPE_LABEL) as FieldType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => patchField(i, { required: e.target.checked })}
                />
                Wajib
              </label>
              <div className="flex items-center gap-1">
                <button className="btn-secondary px-2 py-1 text-xs" onClick={() => move(i, -1)} title="Naik">↑</button>
                <button className="btn-secondary px-2 py-1 text-xs" onClick={() => move(i, 1)} title="Turun">↓</button>
                <button
                  className="btn-danger px-2 py-1 text-xs"
                  onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                >
                  Padam
                </button>
              </div>
            </div>
            {(f.type === "select" || f.type === "radio") && (
              <input
                className="input"
                placeholder="Pilihan dipisahkan dengan koma, cth. Guru, PPD, Pentadbir"
                value={(f.options ?? []).join(", ")}
                onChange={(e) =>
                  patchField(i, {
                    options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            )}
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={f.role === "name"} onChange={() => setRole(i, "name")} />
                <span className={f.role === "name" ? "font-medium text-blue-700" : "text-gray-600"}>
                  Nama (dicetak pada sijil)
                </span>
              </label>
              {f.type === "text" && (
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={f.role === "ic"} onChange={() => setRole(i, "ic")} />
                  <span className={f.role === "ic" ? "font-medium text-blue-700" : "text-gray-600"}>
                    No. Kad Pengenalan
                  </span>
                </label>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.kind === "ok" ? "text-green-700" : "text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
