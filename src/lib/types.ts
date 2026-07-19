export type FieldType = "text" | "textarea" | "select" | "radio" | "checkbox" | "checkboxes" | "date" | "ic" | "school";

export type FormValue = string | string[];
export type AttendeeData = Record<string, FormValue>;

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  /** Medan nilai tunggal yang boleh dipetakan kepada slot templat sijil. */
  certificateEligible?: boolean;
  /**
   * 'name' = dicetak pada sijil & digunakan untuk semakan; 'ic' = pilihan tambahan
   * untuk semakan; 'school' = nama sekolah/unit yang boleh dicetak pada sijil.
   */
  role?: "name" | "ic" | "school";
}

export type ElementSource =
  | "name"
  | "ic"
  | "school"
  | "event_name"
  | "event_date"
  | "event_location"
  | "participant_slot"
  | "static";

export type FontId =
  | "helvetica"
  | "helvetica-bold"
  | "times"
  | "times-bold"
  | "poppins"
  | "poppins-bold"
  | "playfair-bold"
  | "great-vibes";

export type FitMode = "wrap" | "shrink";

export interface TemplateElement {
  id: string;
  source: ElementSource;
  /** teks tetap apabila source === 'static' */
  text?: string;
  /** ID stabil untuk source === 'participant_slot'. */
  slotId?: string;
  /** Label pentadbir untuk source === 'participant_slot'. */
  slotLabel?: string;
  /** kedudukan sebagai pecahan (0–1) daripada lebar/tinggi halaman; titik rujukan = tengah menegak teks */
  x: number;
  y: number;
  /** saiz fon dalam PDF points */
  size: number;
  font: FontId;
  /** warna hex, cth. #1a1a1a */
  color: string;
  align: "left" | "center" | "right";
  /** lebar kotak teks sebagai pecahan (0.1–1) daripada lebar halaman */
  boxWidth?: number;
  /** 'wrap' = balut ke baris baharu apabila teks panjang; 'shrink' = kecilkan saiz agar muat satu baris */
  fit?: FitMode;
  /** jarak antara baris (pengganda saiz fon), lalai 1.15 */
  lineHeight?: number;
}

export const FIT_LABEL: Record<FitMode, string> = {
  wrap: "Balut ke baris baharu",
  shrink: "Kecilkan agar muat satu baris",
};

/** Isi nilai lalai untuk medan baharu supaya templat lama kekal berfungsi. */
export function withElementDefaults(el: TemplateElement): TemplateElement {
  const nameLike = el.source === "name" || el.source === "ic";
  return {
    ...el,
    boxWidth: el.boxWidth ?? 0.8,
    fit: el.fit ?? (nameLike ? "shrink" : "wrap"),
    lineHeight: el.lineHeight ?? 1.15,
  };
}

export type Orientation = "portrait" | "landscape";

export interface Template {
  id: string;
  name: string;
  bg_image_path: string | null;
  orientation: Orientation;
  elements: TemplateElement[];
  created_at: string;
}

export type EventStatus = "draft" | "open" | "closed" | "released";

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  status: EventStatus;
  form_fields: FormField[];
  template_id: string | null;
  requires_certificate: boolean;
  certificate_field_mappings: Record<string, string>;
  created_at: string;
}

export interface Attendee {
  id: string;
  event_id: string;
  data: AttendeeData;
  name_value: string;
  ic_value: string | null;
  created_at: string;
}

export const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draf",
  open: "Dibuka",
  closed: "Ditutup",
  released: "Sijil Dibuka",
};

export const FONT_LABEL: Record<FontId, string> = {
  helvetica: "Helvetica",
  "helvetica-bold": "Helvetica Bold",
  times: "Times Roman",
  "times-bold": "Times Bold",
  poppins: "Poppins",
  "poppins-bold": "Poppins Bold",
  "playfair-bold": "Playfair Display Bold",
  "great-vibes": "Great Vibes (skrip)",
};

/** Saiz A4 dalam PDF points */
export const A4 = { w: 595.28, h: 841.89 };

export function pageSize(orientation: Orientation): { w: number; h: number } {
  return orientation === "portrait" ? { w: A4.w, h: A4.h } : { w: A4.h, h: A4.w };
}
