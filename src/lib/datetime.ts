export const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";

const malaysiaDateTimeFormat = new Intl.DateTimeFormat("ms-MY", {
  timeZone: MALAYSIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

// Always render timestamps in Malaysia time (GMT+8), regardless of the server's
// (UTC on Vercel) or the browser's timezone.
export function formatMalaysiaDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return malaysiaDateTimeFormat.format(date);
}
