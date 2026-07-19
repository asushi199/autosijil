"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteTemplate, duplicateTemplate, updateTemplate, uploadTemplateBg } from "../../actions";
import { templateBgUrl } from "@/lib/storage";
import {
  FIT_LABEL,
  FONT_LABEL,
  pageSize,
  withElementDefaults,
  type ElementSource,
  type FitMode,
  type FontId,
  type Orientation,
  type Template,
  type TemplateElement,
} from "@/lib/types";
import { NAME_CONNECTORS, nameForPrint, shrinkSize, wrapLines } from "@/lib/text-layout";

const FONT_CSS: Record<FontId, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  "helvetica-bold": "Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  "times-bold": "'Times New Roman', Times, serif",
  poppins: "Poppins, sans-serif",
  "poppins-bold": "Poppins, sans-serif",
  "playfair-bold": "'Playfair Display', serif",
  "great-vibes": "'Great Vibes', cursive",
};

const SOURCE_LABEL: Record<ElementSource, string> = {
  name: "Nama Peserta",
  ic: "No. Kad Pengenalan",
  school: "Nama Sekolah / Unit",
  event_name: "Nama Program",
  event_date: "Tarikh Program",
  event_location: "Tempat Program",
  participant_slot: "Slot Maklumat Peserta",
  static: "Teks Statik",
};

const SAMPLE: Record<Exclude<ElementSource, "static">, string> = {
  name: "Muhammad Firdaus bin Abdul Rahman",
  ic: "900101-08-1234",
  school: "Sekolah Kebangsaan Seri Manjung",
  event_name: "WORK COE: Penataran Modul Pendigitalan Google, Canva dan AI",
  event_date: "8 Julai 2026",
  event_location: "Dewan PPD Manjung",
  participant_slot: "Maklumat peserta",
};

function previewText(el: TemplateElement): string {
  if (el.source === "static") return el.text || "Teks…";
  if (el.source === "participant_slot") return el.slotLabel || SAMPLE.participant_slot;
  // Nama dipaparkan huruf besar (sama seperti cetakan sijil)
  if (el.source === "name") return nameForPrint(SAMPLE.name);
  return SAMPLE[el.source];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number) => Math.round(n * 1000) / 1000;

let counter = 0;
const newId = () => `el_${Date.now().toString(36)}${(counter++).toString(36)}`;

// Kanvas ukuran teks kongsi untuk pratonton 'shrink' (anggaran DOM ≈ PDF)
let measureCanvas: HTMLCanvasElement | null = null;
function measureWidthPx(text: string, family: string, weight: number, sizePx: number): number {
  if (typeof document === "undefined") return 0;
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = `${weight} ${sizePx}px ${family}`;
  return ctx.measureText(text).width;
}

const fontWeight = (f: FontId) => (f.includes("bold") ? 700 : 400);

export default function TemplateEditor({ template }: { template: Template }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(template.name);
  const [orientation, setOrientation] = useState<Orientation>(template.orientation);
  const [elements, setElements] = useState<TemplateElement[]>(() =>
    (template.elements ?? []).map(withElementDefaults),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [guide, setGuide] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(700);
  const bg = templateBgUrl(template.bg_image_path);
  const page = pageSize(orientation);
  const scale = canvasW / page.w;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasW(el.clientWidth));
    ro.observe(el);
    setCanvasW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const patch = useCallback((id: string, p: Partial<TemplateElement>) => {
    setElements((els) => els.map((e) => (e.id === id ? { ...e, ...p } : e)));
    setDirty(true);
  }, []);

  // Anjak dengan kekunci anak panah untuk kedudukan tepat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const step = e.shiftKey ? 0.02 : 0.004;
      const el = elements.find((x) => x.id === selectedId);
      if (!el) return;
      if (e.key === "ArrowLeft") patch(el.id, { x: round(clamp(el.x - step, 0, 1)) });
      else if (e.key === "ArrowRight") patch(el.id, { x: round(clamp(el.x + step, 0, 1)) });
      else if (e.key === "ArrowUp") patch(el.id, { y: round(clamp(el.y - step, 0, 1)) });
      else if (e.key === "ArrowDown") patch(el.id, { y: round(clamp(el.y + step, 0, 1)) });
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, elements, patch]);

  function addElement(source: ElementSource) {
    const nameLike = source === "name" || source === "ic";
    const el: TemplateElement = {
      id: newId(),
      source,
      text: source === "static" ? "Teks baharu" : undefined,
      slotId: source === "participant_slot" ? `slot_${newId()}` : undefined,
      slotLabel: source === "participant_slot" ? "Maklumat peserta" : undefined,
      x: 0.5,
      y: 0.5,
      size: source === "name" ? 32 : 16,
      font: source === "name" ? "great-vibes" : "poppins",
      color: "#1a1a1a",
      align: "center",
      boxWidth: 0.8,
      fit: nameLike ? "shrink" : "wrap",
      lineHeight: 1.15,
    };
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
    setDirty(true);
  }

  function startDrag(e: React.PointerEvent, el: TemplateElement) {
    e.preventDefault();
    setSelectedId(el.id);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x;
    const origY = el.y;

    function onMove(ev: PointerEvent) {
      let nx = clamp(origX + (ev.clientX - startX) / rect.width, 0, 1);
      let ny = clamp(origY + (ev.clientY - startY) / rect.height, 0, 1);
      const snapV = Math.abs(nx - 0.5) < 0.012;
      const snapH = Math.abs(ny - 0.5) < 0.012;
      if (snapV) nx = 0.5;
      if (snapH) ny = 0.5;
      setGuide({ v: snapV, h: snapH });
      patch(el.id, { x: round(nx), y: round(ny) });
    }
    function onUp() {
      setGuide({ v: false, h: false });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(e: React.PointerEvent, el: TemplateElement, side: "l" | "r") {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const anchorX = el.x * rect.width;

    function onMove(ev: PointerEvent) {
      const px = ev.clientX - rect.left;
      let bw: number;
      if (el.align === "center") bw = (2 * Math.abs(px - anchorX)) / rect.width;
      else if (el.align === "left") bw = (px - anchorX) / rect.width;
      else bw = (anchorX - px) / rect.width;
      // untuk left/right, gunakan sisi yang betul sahaja
      if ((el.align === "left" && side === "l") || (el.align === "right" && side === "r")) return;
      patch(el.id, { boxWidth: round(clamp(bw, 0.1, 1)) });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function save(onDone?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const res = await updateTemplate(template.id, { name, orientation, elements });
      if (res?.error) setMsg({ kind: "err", text: res.error });
      else {
        setMsg({ kind: "ok", text: "Disimpan." });
        setDirty(false);
        onDone?.();
      }
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadTemplateBg(template.id, fd);
    setUploading(false);
    if (res?.error) setMsg({ kind: "err", text: res.error });
    else router.refresh();
  }

  const alignTransform = (align: TemplateElement["align"]) =>
    align === "center" ? "-50%" : align === "right" ? "-100%" : "0";

  return (
    <div className="space-y-4">
      {/* Fon pratonton (paparan sahaja; PDF menggunakan fon terbenam) */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Great+Vibes&family=Playfair+Display:wght@700&display=swap"
        rel="stylesheet"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/templates" className="text-sm text-blue-700 hover:underline">
            ← Templat
          </Link>
          <input
            className="input w-72 font-medium"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {msg && (
            <span className={`text-sm ${msg.kind === "ok" ? "text-green-700" : "text-red-600"}`}>
              {msg.text}
            </span>
          )}
          {dirty && <span className="text-xs text-amber-600">● Belum disimpan</span>}
          <button
            className="btn-secondary"
            onClick={() => save(() => window.open(`/api/admin/templates/${template.id}/preview`, "_blank"))}
            disabled={pending}
          >
            Pratonton PDF
          </button>
          <button className="btn-primary" onClick={() => save()} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Kanvas */}
        <div>
          <div
            ref={canvasRef}
            className="relative w-full select-none overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm"
            style={{
              aspectRatio: `${page.w} / ${page.h}`,
              backgroundImage: bg ? `url(${bg})` : undefined,
              backgroundSize: "100% 100%",
            }}
            onPointerDown={() => setSelectedId(null)}
          >
            {!bg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-sm text-gray-400">
                <span className="text-2xl">🖼️</span>
                <span>Belum ada imej latar</span>
                <span className="text-xs">
                  Muat naik reka bentuk sijil A4 (PNG/JPG) di panel kanan →
                </span>
              </div>
            )}

            {/* Garis panduan tengah */}
            {guide.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-pink-500/70" />}
            {guide.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-pink-500/70" />}

            {elements.map((el) => {
              const active = el.id === selectedId;
              const text = previewText(el);
              const family = FONT_CSS[el.font];
              const weight = fontWeight(el.font);
              const boxPx = clamp(el.boxWidth ?? 0.8, 0.1, 1) * canvasW;
              const baseSize = el.size * scale;
              let sizePx = baseSize;
              let lines: string[] = [text];
              if (el.fit === "shrink") {
                sizePx = shrinkSize(
                  text,
                  (s, sz) => measureWidthPx(s, family, weight, sz),
                  baseSize,
                  boxPx,
                );
              } else {
                const connectors = el.source === "name" ? NAME_CONNECTORS : undefined;
                lines = wrapLines(
                  text,
                  (s) => measureWidthPx(s, family, weight, baseSize),
                  boxPx,
                  connectors,
                );
              }
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag(e, el);
                  }}
                  className={`absolute cursor-move ${
                    active
                      ? "outline-2 outline-dashed outline-blue-500"
                      : "hover:outline-1 hover:outline-dashed hover:outline-blue-300"
                  }`}
                  style={{
                    left: `${el.x * 100}%`,
                    top: `${el.y * 100}%`,
                    width: boxPx,
                    transform: `translate(${alignTransform(el.align)}, -50%)`,
                    fontSize: sizePx,
                    fontFamily: family,
                    fontWeight: weight,
                    color: el.color,
                    lineHeight: el.lineHeight ?? 1.15,
                    textAlign: el.align,
                    whiteSpace: "nowrap",
                  }}
                >
                  {lines.map((ln, li) => (
                    <div key={li}>{ln || " "}</div>
                  ))}
                  {active && (el.align === "center" || el.align === "right") && (
                    <span
                      onPointerDown={(e) => startResize(e, el, "l")}
                      className="absolute top-1/2 -left-1.5 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-white bg-blue-600 shadow"
                    />
                  )}
                  {active && (el.align === "center" || el.align === "left") && (
                    <span
                      onPointerDown={(e) => startResize(e, el, "r")}
                      className="absolute top-1/2 -right-1.5 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-white bg-blue-600 shadow"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Seret teks untuk memindahkan · seret bulatan biru untuk mengubah lebar kotak ·
            kekunci anak panah untuk anjakan halus (tekan Shift untuk lebih besar).
          </p>
        </div>

        {/* Panel sisi */}
        <div className="space-y-4">
          <ol className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 space-y-1">
            <li><b>1.</b> Muat naik imej latar sijil (A4).</li>
            <li><b>2.</b> Tambah elemen teks (Nama, Nama Program, Tarikh…).</li>
            <li><b>3.</b> Seret ke tempatnya &amp; laraskan lebar kotak, fon, saiz.</li>
            <li><b>4.</b> <b>Simpan</b>, kemudian <b>Pratonton PDF</b>.</li>
          </ol>

          <section className="card space-y-3">
            <h2 className="text-sm font-medium">Imej Latar (A4, PNG/JPG)</h2>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={onUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-600 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploading && <p className="text-xs text-gray-500">Memuat naik…</p>}
            <div>
              <label className="label">Orientasi</label>
              <select
                className="input"
                value={orientation}
                onChange={(e) => {
                  setOrientation(e.target.value as Orientation);
                  setDirty(true);
                }}
              >
                <option value="landscape">Melintang (landscape)</option>
                <option value="portrait">Menegak (portrait)</option>
              </select>
            </div>
          </section>

          <section className="card space-y-2">
            <h2 className="text-sm font-medium">Tambah Elemen Teks</h2>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SOURCE_LABEL) as ElementSource[]).map((s) => (
                <button key={s} className="btn-secondary px-2.5 py-1 text-xs" onClick={() => addElement(s)}>
                  + {SOURCE_LABEL[s]}
                </button>
              ))}
            </div>
          </section>

          {selected ? (
            <section className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">{SOURCE_LABEL[selected.source]}</h2>
                <button
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                  onClick={() => {
                    setElements((els) => els.filter((e) => e.id !== selected.id));
                    setSelectedId(null);
                    setDirty(true);
                  }}
                >
                  Padam elemen
                </button>
              </div>

              {selected.source === "static" && (
                <div>
                  <label className="label">Teks</label>
                  <input
                    className="input"
                    value={selected.text ?? ""}
                    onChange={(e) => patch(selected.id, { text: e.target.value })}
                  />
                </div>
              )}
              {selected.source === "participant_slot" && (
                <div>
                  <label className="label">Label slot</label>
                  <input
                    className="input"
                    value={selected.slotLabel ?? ""}
                    onChange={(e) => patch(selected.id, { slotLabel: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="label">Fon</label>
                <select
                  className="input"
                  value={selected.font}
                  onChange={(e) => patch(selected.id, { font: e.target.value as FontId })}
                >
                  {(Object.keys(FONT_LABEL) as FontId[]).map((f) => (
                    <option key={f} value={f}>{FONT_LABEL[f]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Saiz ({selected.size} pt)</label>
                  <input
                    type="range"
                    min={8}
                    max={72}
                    value={selected.size}
                    onChange={(e) => patch(selected.id, { size: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="label">Warna</label>
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(e) => patch(selected.id, { color: e.target.value })}
                    className="h-9 w-full cursor-pointer rounded border border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="label">Lebar kotak teks ({Math.round((selected.boxWidth ?? 0.8) * 100)}%)</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round((selected.boxWidth ?? 0.8) * 100)}
                  onChange={(e) => patch(selected.id, { boxWidth: Number(e.target.value) / 100 })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="label">Bila teks terlalu panjang</label>
                <div className="flex gap-1">
                  {(Object.keys(FIT_LABEL) as FitMode[]).map((m) => (
                    <button
                      key={m}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                        (selected.fit ?? "wrap") === m
                          ? "border-blue-600 bg-blue-50 text-blue-800"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                      onClick={() => patch(selected.id, { fit: m })}
                    >
                      {FIT_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              {(selected.fit ?? "wrap") === "wrap" && (
                <div>
                  <label className="label">Jarak baris ({(selected.lineHeight ?? 1.15).toFixed(2)})</label>
                  <input
                    type="range"
                    min={100}
                    max={200}
                    value={Math.round((selected.lineHeight ?? 1.15) * 100)}
                    onChange={(e) => patch(selected.id, { lineHeight: Number(e.target.value) / 100 })}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="label">Jajaran</label>
                <div className="flex gap-1">
                  {(["left", "center", "right"] as const).map((a) => (
                    <button
                      key={a}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                        selected.align === a
                          ? "border-blue-600 bg-blue-50 text-blue-800"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                      onClick={() => patch(selected.id, { align: a })}
                    >
                      {a === "left" ? "Kiri" : a === "center" ? "Tengah" : "Kanan"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn-secondary w-full text-xs"
                onClick={() => patch(selected.id, { x: 0.5, align: "center" })}
              >
                Pusatkan secara mendatar
              </button>
            </section>
          ) : (
            <section className="card text-center text-xs text-gray-500 py-6">
              Klik satu elemen teks pada kanvas untuk mengubah fon, saiz, warna, lebar &amp; jajaran.
            </section>
          )}

          <section className="card space-y-2">
            <h2 className="text-sm font-medium">Tindakan Templat</h2>
            <form action={() => duplicateTemplate(template.id)}>
              <button type="submit" className="btn-secondary w-full">Salin Templat Ini</button>
            </form>
            <form action={() => deleteTemplate(template.id)}>
              <button type="submit" className="btn-danger w-full">Padam Templat</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
