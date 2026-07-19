import type { AttendeeData, FormField, FormValue } from "./types";

type SubmissionResult =
  | { data: AttendeeData; name: string; ic: string | null }
  | { error: string };

function requiredError(field: FormField) {
  return { error: `Medan "${field.label}" wajib diisi.` };
}

function optionError(field: FormField) {
  return { error: `Pilihan bagi medan "${field.label}" tidak sah.` };
}

function dateIsValid(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function normaliseChoices(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

export function formatFormValue(value: FormValue | undefined): string {
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function validateSingleValue(field: FormField, raw: unknown): string | { error: string } {
  const value = normalizeString(raw);
  if (value === null) return field.required ? requiredError(field) : "";
  if (!value) return field.required ? requiredError(field) : "";

  const maximum = field.type === "textarea" ? 2000 : 300;
  if (value.length > maximum) return { error: `Medan "${field.label}" terlalu panjang.` };

  if ((field.type === "select" || field.type === "radio") && !(field.options ?? []).includes(value)) {
    return optionError(field);
  }
  if (field.type === "date" && !dateIsValid(value)) {
    return { error: `Tarikh bagi medan "${field.label}" tidak sah.` };
  }
  if (field.type === "ic" && !/^\d{12}$/.test(value)) {
    return { error: "No. Kad Pengenalan mesti mengandungi tepat 12 digit tanpa sengkang." };
  }
  return value;
}

export function validateSubmission(fields: FormField[], raw: Record<string, unknown>): SubmissionResult {
  const data: AttendeeData = {};

  for (const field of fields) {
    if (field.type === "checkboxes") {
      const choices = normaliseChoices(raw[field.key]);
      if (choices === null) return field.required ? requiredError(field) : { error: `Pilihan bagi medan "${field.label}" tidak sah.` };
      if (field.required && !choices.length) return requiredError(field);
      if (choices.some((choice) => !(field.options ?? []).includes(choice))) return optionError(field);
      data[field.key] = choices;
      continue;
    }

    const value = validateSingleValue(field, raw[field.key]);
    if (typeof value !== "string") return value;
    data[field.key] = value;
  }

  const nameField = fields.find((field) => field.role === "name");
  const nameValue = nameField ? data[nameField.key] : "";
  const name = typeof nameValue === "string" ? nameValue : "";
  if (!name) return { error: "Nama diperlukan." };

  const icField = fields.find((field) => field.role === "ic");
  const icValue = icField ? data[icField.key] : "";
  const ic = typeof icValue === "string" && icValue ? icValue.replace(/[\s-]/g, "") : null;
  return { data, name, ic };
}
