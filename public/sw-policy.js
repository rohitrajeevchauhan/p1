const LOCALES = new Set(["en", "hi"]);

export function isVersionedStaticPath(pathname) { return pathname.startsWith("/_next/static/"); }
export function isIconPath(pathname) { return /^\/icons\/[^/]+\.(?:png|svg|webp)$/.test(pathname); }

export function isPublicCachePath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (!LOCALES.has(parts[0])) return isVersionedStaticPath(pathname) || isIconPath(pathname);
  if (parts.length === 1) return true;
  if (parts.length === 2 && (parts[1] === "offline" || parts[1] === "manifest.webmanifest")) return true;
  if (parts[1] === "services") return parts.length === 2 || (parts.length === 3 && parts[2] !== "request") || (parts.length === 4 && parts[2] !== "request");
  if (parts[1] === "cooperatives" && parts.length === 3) return true;
  if (parts[1] === "workers" && parts.length === 3) return !new Set(["onboarding", "jobs", "finance"]).has(parts[2]);
  return false;
}

export function isSafeCacheResponse(response) {
  if (!response?.ok || response.redirected || response.headers.has("set-cookie") || !response.url) return false;
  return isPublicCachePath(new URL(response.url).pathname);
}
