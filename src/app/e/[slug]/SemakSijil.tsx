"use client";

import { useEffect, useRef, useState } from "react";

interface Match {
  id: string;
  token: string;
  name: string;
}

export default function SemakSijil({ slug }: { slug: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const matchRef = useRef<HTMLDivElement>(null);

  async function checkCertificate(name: string) {
    setError(null);
    setMatch(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/e/${slug}/semak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: name }),
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void checkCertificate(query);
  }

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch(`/api/e/${slug}/cadangan?q=${encodeURIComponent(term)}`);
        const body = await res.json();
        if (active && res.ok) setSuggestions(Array.isArray(body.names) ? body.names : []);
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSuggesting(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, slug]);

  useEffect(() => {
    let target: HTMLElement | null = null;
    if (match) target = matchRef.current;
    else if (error) target = errorRef.current;
    else if (suggestions.length) target = suggestionsRef.current;

    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [error, match, suggestions]);

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div>
          <h2 className="font-medium">Semak &amp; Muat Turun Sijil</h2>
          <p className="mt-1 text-sm text-gray-500">
            Masukkan <b>nama penuh</b> anda seperti yang diisi semasa merekod kehadiran.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="input"
            placeholder="Nama penuh"
            value={query}
            onChange={(e) => {
              const nextQuery = e.target.value;
              setQuery(nextQuery);
              if (nextQuery.trim().length < 3) {
                setSuggestions([]);
                setSuggesting(false);
              }
              setMatch(null);
              setError(null);
            }}
            required
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
            {loading ? "Mencari…" : "Semak"}
          </button>
        </form>
        {suggesting && <p className="text-xs text-gray-500">Mencari nama…</p>}
        {!!suggestions.length && (
          <div
            ref={suggestionsRef}
            className="scroll-mt-4 rounded-lg border border-gray-200 bg-white p-1"
          >
            <p className="px-2 py-1 text-xs text-gray-500">Pilih nama anda</p>
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-blue-50"
                onClick={() => {
                  setQuery(name);
                  setSuggestions([]);
                  void checkCertificate(name);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p ref={errorRef} className="scroll-mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {match && (
        <div ref={matchRef} className="card scroll-mt-4 text-center">
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
