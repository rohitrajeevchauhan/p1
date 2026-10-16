import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../../components/auth/auth-shell.jsx";
import { DiscoveryResults } from "../../../../../components/marketplace/discovery-results.jsx";
import { categories, localities } from "../../../../../lib/catalog.js";
import { localizedAlternates } from "../../../../../lib/seo.js";

export function generateStaticParams() { return categories.flatMap((categorySlug) => localities.map((localitySlug) => ({ categorySlug, localitySlug }))); }

export async function generateMetadata({ params }) {
  const { locale, categorySlug, localitySlug } = await params;
  if (!categories.includes(categorySlug) || !localities.includes(localitySlug)) return {};
  const t = await getTranslations({ locale, namespace: "Marketplace" });
  return { title: t("meta.locationTitle", { category: t(`categories.${categorySlug}.name`), locality: t(`localityNames.${localitySlug}`) }), description: t("meta.locationDescription", { category: t(`categories.${categorySlug}.name`), locality: t(`localityNames.${localitySlug}`) }), alternates: localizedAlternates(locale, `services/${categorySlug}/${localitySlug}`) };
}

export default async function LocationPage({ params }) {
  const { locale, categorySlug, localitySlug } = await params;
  if (!categories.includes(categorySlug) || !localities.includes(localitySlug)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Marketplace");
  return <AuthShell locale={locale} title={`${t(`categories.${categorySlug}.name`)} · ${t(`localityNames.${localitySlug}`)}`} description={t("locationDescription")}><DiscoveryResults categorySlug={categorySlug} localitySlug={localitySlug} /></AuthShell>;
}
