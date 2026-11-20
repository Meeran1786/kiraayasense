/**
 * Customer / business mode. Like the light/dark theme, it is a per-browser
 * choice kept in a cookie, so the server renders the right header on the
 * first paint. It never changes what a user is allowed to do: owner pages
 * still check the verified claim on the server.
 */
export type AppMode = "customer" | "business";

export const MODE_COOKIE = "ks-mode";

export function isAppMode(v: unknown): v is AppMode {
  return v === "customer" || v === "business";
}

/** Pages that belong to business mode; opening one switches the header to it. */
export function isBusinessPath(pathname: string): boolean {
  return pathname === "/owner" || pathname.startsWith("/owner/") || pathname === "/for-businesses" || pathname === "/business/new";
}
