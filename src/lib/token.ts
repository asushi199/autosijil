import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return process.env.SIJIL_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

/** Token HMAC ringkas supaya pautan muat turun sijil tidak boleh diteka. */
export function sijilToken(attendeeId: string): string {
  return createHmac("sha256", secret()).update(attendeeId).digest("hex").slice(0, 32);
}

export function verifySijilToken(attendeeId: string, token: string): boolean {
  const expected = sijilToken(attendeeId);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
