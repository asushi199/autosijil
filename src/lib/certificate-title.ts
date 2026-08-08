/** Teks nama program yang dicetak pada sijil (boleh mengandungi baris baharu). */
export function certificateEventName(event: {
  title: string;
  certificate_title?: string | null;
}): string {
  const custom = event.certificate_title;
  if (custom != null && custom.trim() !== "") return custom;
  return event.title;
}
