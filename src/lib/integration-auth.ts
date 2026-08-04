import "server-only";

/** Semak Bearer token untuk panggilan integrasi eUSTP → Autosijil. */
export function assertEustpIntegrationAuth(req: Request): boolean {
  const secret = process.env.EUSTP_INTEGRATION_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token.length > 0 && token === secret;
}
