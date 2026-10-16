import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../i18n/routing.js";
import "../globals.css";
import { ConnectivityProvider } from "../../components/connectivity-controls.jsx";
import { siteOrigin } from "../../lib/seo.js";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport = { themeColor: "#082d25", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const translations = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(siteOrigin()),
    title: translations("title"),
    description: translations("description"),
    manifest: `/${locale}/manifest.webmanifest`,
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const pwa = await getTranslations({ locale, namespace: "Pwa" });

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider><ConnectivityProvider><a className="skip-link" href="#page-main">{pwa("skipToMain")}</a><div id="page-main" tabIndex="-1">{children}</div></ConnectivityProvider></NextIntlClientProvider>
      </body>
    </html>
  );
}
