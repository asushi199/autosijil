import type { FormField } from "./types";

export function parseOptionsWhileEditing(input: string) {
  return input.split(",").map((option) => option.trimStart());
}

export function normalizeFormFieldsForSave(fields: FormField[]) {
  return fields.map((field) => {
    if (!field.options) return field;

    return {
      ...field,
      options: field.options.map((option) => option.trim()).filter(Boolean),
    };
  });
}
