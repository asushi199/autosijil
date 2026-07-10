"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importAttendees } from "../../actions";

export default function ImportPanel({
  eventId,
  nameLabel,
}: {
  eventId: string;
  nameLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const count = text.split(/\r?\n/).filter((s) => s.trim()).length;

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await importAttendees(eventId, text);
      if ("error" in res && res.error) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      const parts = [`${res.added} nama ditambah`];
      if (res.skipped) parts.push(`${res.skipped} dilangkau (pendua / sudah ada)`);
      setMsg({ ok: true, text: parts.join(" · ") });
      setText("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary text-xs"
      >
        Import Senarai Nama
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label mb-0" htmlFor="import-box">
          Import senarai nama
        </label>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMsg(null);
          }}
          className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
        >
          Tutup
        </button>
      </div>
      <p className="mb-2 text-xs text-gray-500">
        Tampal satu nama setiap baris. Sesuai apabila anda mahu menjana sijil tanpa peserta
        mengisi borang. Nama yang sudah ada akan dilangkau.
      </p>
      <textarea
        id="import-box"
        className="input font-mono text-xs"
        rows={8}
        placeholder={"Ahmad bin Ali\nSiti binti Kamal\nTan Mei Ling"}
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
          {pending ? "Mengimport…" : `Import ${count || ""} nama`.trim()}
        </button>
        <span className="text-xs text-gray-400">
          Nama dicetak pada sijil: <b>{nameLabel}</b>
        </span>
      </div>
    </div>
  );
}
