import { cookies } from "next/headers";

export const SESSION_COOKIE = "bx_admin";

/**
 * The cookie value IS the admin password (stored httpOnly so it is never
 * exposed to client JS). A request is authenticated when the cookie matches
 * the configured ADMIN_PASSWORD.
 */
export function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("Missing ADMIN_PASSWORD environment variable.");
  return pw;
}

export function isAuthenticated(): boolean {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return !!token && token === process.env.ADMIN_PASSWORD;
}
