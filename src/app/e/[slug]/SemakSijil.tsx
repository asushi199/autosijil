"use client";

import { useState } from "react";

interface Match {
  id: string;
  token: string;
  name: string;
}

export default function SemakSijil({ slug }: { slug: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMatch(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/e/${slug}/semak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Ralat tidak dijangka. Sila cuba lagi.");
        return;
      }
      setMatch(body);
    } catch {
      setError("Tiada sambungan internet. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div>
          <h2 className="font-medium">Semak &amp; Muat Turun Sijil</h2>
          <p className="mt-1 text-sm text-gray-500">
            Masukkan <b>nama penuh</b> (seperti yang diisi semasa kehadiran) atau{" "}
            <b>no. kad pengenalan</b>.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="input"
            placeholder="Nama penuh atau No. KP"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
            {loading ? "Mencari…" : "Semak"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {match && (
        <div className="card text-center">
          <p className="text-sm text-gray-500">Sijil ditemui untuk</p>
          <p className="mb-3 font-medium">{match.name}</p>
          <a
            href={`/api/e/${slug}/sijil?id=${match.id}&token=${match.token}`}
            className="btn-primary w-full"
          >
            Muat Turun Sijil (PDF)
          </a>
        </div>
      )}
    </div>
  );
}
