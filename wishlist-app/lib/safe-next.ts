/**
 * Sanitize a `next` redirect target that came from a URL.
 *
 * Only same-site absolute paths are allowed. Anything else — a full URL, a
 * protocol-relative `//host`, or a `@host` that would end up as userinfo when
 * concatenated onto an origin — is rejected, so `next` can't be used to bounce
 * a signed-in user to an attacker's site.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
