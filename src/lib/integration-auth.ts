import "server-only";
import { timingSafeEqual } from "crypto";

/** Semak Bearer token untuk panggilan integrasi eUSTP → Autosijil. */
export function assertEustpIntegrationAuth(req: Request): boolean {
  const secret = process.env.EUSTP_INTEGRATION_SECRET ?? "";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}
