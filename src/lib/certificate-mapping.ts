import type { AttendeeData, FormField, Template, TemplateElement } from "./types";

export function getTemplateSlots(template: Template): TemplateElement[] {
  return (template.elements ?? []).filter(
    (element) => element.source === "participant_slot" && !!element.slotId,
  );
}

function eligibleField(fields: FormField[], key: string | undefined) {
  const field = fields.find((candidate) => candidate.key === key);
  return field && field.certificateEligible && field.type !== "checkboxes" ? field : undefined;
}

export function getIncompleteSlotLabels(
  template: Template,
  fields: FormField[],
  mappings: Record<string, string>,
): string[] {
  return getTemplateSlots(template)
    .filter((slot) => !eligibleField(fields, mappings[slot.slotId ?? ""]))
    .map((slot) => slot.slotLabel?.trim() || "Maklumat peserta");
}

export function mappedSlotValues(
  template: Template,
  mappings: Record<string, string>,
  data: AttendeeData,
): Record<string, string> {
  return Object.fromEntries(
    getTemplateSlots(template).map((slot) => {
      const value = data[mappings[slot.slotId ?? ""]];
      return [slot.slotId ?? "", typeof value === "string" ? value : ""];
    }),
  );
}
