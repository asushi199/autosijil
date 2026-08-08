/** Templat induk (boleh dikongsi) — tiada pemilik program. */
export function isLibraryTemplate(template: {
  owner_event_id?: string | null;
}): boolean {
  return template.owner_event_id == null;
}

/** Templat khas milik program yang diberi. */
export function isOwnedByEvent(
  template: { owner_event_id?: string | null },
  eventId: string,
): boolean {
  return template.owner_event_id === eventId;
}
