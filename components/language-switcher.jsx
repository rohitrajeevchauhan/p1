"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { routing } from "../i18n/routing.js";

function localizedPath(pathname, locale) {
  const segments = pathname.split("/");
  if (routing.locales.includes(segments[1])) {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const translations = useTranslations("Navigation");

  return (
    <nav className="language-switcher" aria-label={translations("language")}>
      {routing.locales.map((nextLocale) => (
        <Link
          className="language-switcher__link"
          data-active={locale === nextLocale}
          href={localizedPath(pathname, nextLocale)}
          hrefLang={nextLocale}
          key={nextLocale}
          lang={nextLocale}
          aria-current={locale === nextLocale ? "page" : undefined}
        >
          {translations(nextLocale === "en" ? "english" : "hindi")}
        </Link>
      ))}
    </nav>
  );
}

