export const allowedDomains = ["machineryhunters.com", "yuriramirezu.com"] as const;

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1) return false;
  const domain = normalized.slice(at + 1);
  return (allowedDomains as readonly string[]).includes(domain);
}
