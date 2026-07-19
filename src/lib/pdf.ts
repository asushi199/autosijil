import "server-only";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { poppinsB64 } from "./fonts/poppins-400";
import { poppinsBoldB64 } from "./fonts/poppins-700";
import { greatVibesB64 } from "./fonts/greatvibes-400";
import { playfairBoldB64 } from "./fonts/playfair-700";
import { FontId, Template, TemplateElement, pageSize, withElementDefaults } from "./types";
import { NAME_CONNECTORS, nameForPrint, shrinkSize, wrapLines } from "./text-layout";

const EMBEDDED: Partial<Record<FontId, string>> = {
  poppins: poppinsB64,
  "poppins-bold": poppinsBoldB64,
  "great-vibes": greatVibesB64,
  "playfair-bold": playfairBoldB64,
};

const STANDARD: Partial<Record<FontId, StandardFonts>> = {
  helvetica: StandardFonts.Helvetica,
  "helvetica-bold": StandardFonts.HelveticaBold,
  times: StandardFonts.TimesRoman,
  "times-bold": StandardFonts.TimesRomanBold,
};

export interface SijilValues {
  name: string;
  ic?: string;
  school?: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  slots?: Record<string, string>;
}

function resolveText(el: TemplateElement, v: SijilValues): string {
  switch (el.source) {
    case "name":
      // Nama sentiasa dicetak dalam huruf besar pada sijil
      return nameForPrint(v.name);
    case "ic":
      return v.ic ?? "";
    case "school":
      return v.school ?? "";
    case "event_name":
      return v.eventName;
    case "event_date":
      return v.eventDate;
    case "event_location":
      return v.eventLocation ?? "";
    case "participant_slot":
      return v.slots?.[el.slotId ?? ""] ?? "";
    case "static":
      return el.text ?? "";
  }
}

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function getFont(doc: PDFDocument, cache: Map<FontId, PDFFont>, id: FontId): Promise<PDFFont> {
  const hit = cache.get(id);
  if (hit) return hit;
  let font: PDFFont;
  const b64 = EMBEDDED[id];
  if (b64) {
    font = await doc.embedFont(Buffer.from(b64, "base64"), { subset: true });
  } else {
    font = await doc.embedFont(STANDARD[id] ?? StandardFonts.Helvetica);
  }
  cache.set(id, font);
  return font;
}

async function embedBackground(doc: PDFDocument, bgBytes: Uint8Array) {
  // Kenal pasti PNG vs JPEG melalui magic bytes
  const isPng =
    bgBytes.length > 4 && bgBytes[0] === 0x89 && bgBytes[1] === 0x50 && bgBytes[2] === 0x4e;
  return isPng ? doc.embedPng(bgBytes) : doc.embedJpg(bgBytes);
}

async function drawElements(
  page: PDFPage,
  template: Template,
  values: SijilValues,
  fonts: Map<FontId, PDFFont>,
  doc: PDFDocument,
) {
  const { w, h } = pageSize(template.orientation);
  for (const raw of template.elements ?? []) {
    const el = withElementDefaults(raw);
    const text = resolveText(el, values);
    if (!text) continue;

    const font = await getFont(doc, fonts, el.font);
    const maxWidth = Math.max(1, (el.boxWidth ?? 0.8) * w);
    const color = hexToRgb(el.color || "#1a1a1a");

    let size = el.size;
    let lines: string[];
    if (el.fit === "shrink") {
      size = shrinkSize(text, (s, sz) => font.widthOfTextAtSize(s, sz), el.size, maxWidth);
      lines = [text];
    } else {
      // Nama panjang dipenggal selepas penyambung (BIN/BINTI/A/L/A/P…)
      const connectors = el.source === "name" ? NAME_CONNECTORS : undefined;
      lines = wrapLines(text, (s) => font.widthOfTextAtSize(s, el.size), maxWidth, connectors);
    }

    const lineHeight = size * (el.lineHeight ?? 1.15);
    const capHeight = size * 0.7;
    const anchorX = el.x * w;
    const n = lines.length;

    lines.forEach((line, i) => {
      const lineW = font.widthOfTextAtSize(line, size);
      let x = anchorX;
      if (el.align === "center") x = anchorX - lineW / 2;
      else if (el.align === "right") x = anchorX - lineW;
      // Pusatkan keseluruhan blok teks pada el.y (dari atas halaman);
      // pdf-lib mengukur dari bawah, jadi tukar ke baseline.
      const lineCenterTop = el.y * h + (i - (n - 1) / 2) * lineHeight;
      const y = h - lineCenterTop - capHeight / 2;
      page.drawText(line, { x, y, size, font, color });
    });
  }
}

/** Jana satu sijil sebagai PDF (satu halaman A4). */
export async function generateSijil(
  template: Template,
  bgBytes: Uint8Array | null,
  values: SijilValues,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { w, h } = pageSize(template.orientation);
  const page = doc.addPage([w, h]);
  if (bgBytes) {
    const img = await embedBackground(doc, bgBytes);
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  const fonts = new Map<FontId, PDFFont>();
  await drawElements(page, template, values, fonts, doc);
  return doc.save();
}

/**
 * Jana satu PDF tergabung (satu halaman setiap peserta).
 * Imej latar & fon dikongsi merentas halaman — jauh lebih kecil daripada fail berasingan.
 */
export async function generateCombinedSijil(
  template: Template,
  bgBytes: Uint8Array | null,
  valuesList: SijilValues[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { w, h } = pageSize(template.orientation);
  const img = bgBytes ? await embedBackground(doc, bgBytes) : null;
  const fonts = new Map<FontId, PDFFont>();
  for (const values of valuesList) {
    const page = doc.addPage([w, h]);
    if (img) page.drawImage(img, { x: 0, y: 0, width: w, height: h });
    await drawElements(page, template, values, fonts, doc);
  }
  return doc.save();
}

/** Format tarikh program kepada gaya Melayu, cth. "8 Julai 2026". */
export function formatTarikh(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const bulan = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember",
  ];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}
