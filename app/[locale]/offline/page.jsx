import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() { return [{ locale: "en" }, { locale: "hi" }]; }

export default async function OfflinePage({ params }) {
  const { locale } = await params; setRequestLocale(locale); const t = await getTranslations("Pwa");
  return <main className="offline-page"><div className="auth-card"><p className="eyebrow">CoServe</p><h1>{t("offlineTitle")}</h1><p>{t("offlineDescription")}</p><p className="form-alert" role="status">{t("offlinePrivate")}</p><Link className="primary-button" href={`/${locale}`}>{t("offlineHome")}</Link></div></main>;
}
