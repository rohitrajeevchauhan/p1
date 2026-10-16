export function safeLocaleReturn(locale, value, fallback = `/${locale}/account`) {
  if (typeof value !== "string" || !value.startsWith(`/${locale}/`) || value.startsWith(`/${locale}//`)) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://coserve.local");
    if (parsed.origin !== "https://coserve.local" || !parsed.pathname.startsWith(`/${locale}/`)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
