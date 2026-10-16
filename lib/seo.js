export function siteOrigin(environment = process.env) {
  try { const url = new URL(environment.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"); return url.origin; } catch { return "http://localhost:3000"; }
}

export function localizedAlternates(locale, path = "") {
  const suffix = path ? `/${path.replace(/^\//, "")}` : "";
  return { canonical: `/${locale}${suffix}`, languages: { en: `/en${suffix}`, hi: `/hi${suffix}`, "x-default": `/en${suffix}` } };
}
