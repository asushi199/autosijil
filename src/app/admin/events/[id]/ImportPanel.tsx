"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importAttendees } from "../../actions";
import type { FormField } from "@/lib/types";

export default function ImportPanel({
  eventId,
  fields,
}: {
  eventId: string;
  fields: FormField[];
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const nameField = fields.find((f) => f.role === "name");
  const multi = fields.length > 1;
  const count = text.split(/\r?\n/).filter((s) => s.trim()).length;
  // Contoh baris berbilang lajur mengikut susunan medan program ini.
  const example = fields.map((f) => f.label).join("\t");

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await importAttendees(eventId, text);
      if ("error" in res && res.error) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      const parts = [`${res.added} peserta ditambah`];
      if (res.skipped) parts.push(`${res.skipped} dilangkau (pendua / sudah ada / tiada nama)`);
      setMsg({ ok: true, text: parts.join(" · ") });
      setText("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-xs">
        Import Senarai Peserta
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label mb-0" htmlFor="import-box">
          Import senarai peserta
        </label>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMsg(null);
          }}
          className="cursor-pointer text-xs text-gray-500 hover:text-gray-800"
        >
          Tutup
        </button>
      </div>

      <p className="mb-2 text-xs text-gray-500">
        Sesuai apabila anda mahu menjana sijil tanpa peserta mengisi borang. Peserta yang
        sudah ada dilangkau.
      </p>

      {multi ? (
        <div className="mb-2 rounded-md border border-gray-200 bg-white p-2 text-xs">
          <p className="mb-1 text-gray-600">
            Satu peserta setiap baris. Untuk mengisi medan lain sekali, pisahkan lajur dengan{" "}
            <b>Tab</b> (salin terus dari Excel / Google Sheets) mengikut susunan ini:
          </p>
          <p className="flex flex-wrap items-center gap-1">
            {fields.map((f, i) => (
              <span key={f.key} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300">→</span>}
                <span
                  className={
                    f.role === "name"
                      ? "rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800"
                      : "rounded bg-gray-100 px-1.5 py-0.5 text-gray-700"
                  }
                >
                  {f.label}
                </span>
              </span>
            ))}
          </p>
          <p className="mt-1 text-gray-400">
            Hanya nama wajib. Lajur boleh dikosongkan; baris satu lajur = nama sahaja.
          </p>
        </div>
      ) : (
        <p className="mb-2 text-xs text-gray-500">Tampal satu nama setiap baris.</p>
      )}

      <textarea
        id="import-box"
        className="input font-mono text-xs"
        rows={8}
        placeholder={multi ? example + "\n" : "Ahmad bin Ali\nSiti binti Kamal\nTan Mei Ling"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={pending}
      />

      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || count === 0}
          className="btn-primary text-xs"
        >
          {pending ? "Mengimport…" : `Import ${count || ""} peserta`.replace("  ", " ").trim()}
        </button>
        {nameField && (
          <span className="text-xs text-gray-400">
            Nama dicetak pada sijil: <b>{nameField.label}</b>
          </span>
        )}
      </div>
    </div>
  );
}
