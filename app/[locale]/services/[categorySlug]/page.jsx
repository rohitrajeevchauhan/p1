import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { LocalityDisclosure } from "../../../../components/marketplace/locality-disclosure.jsx";
import { DiscoveryResults } from "../../../../components/marketplace/discovery-results.jsx";
import { categories, localities } from "../../../../lib/catalog.js";
import { localizedAlternates } from "../../../../lib/seo.js";

export function generateStaticParams() {
  return categories.map((categorySlug) => ({ categorySlug }));
}

export async function generateMetadata({ params }) {
  const { locale, categorySlug } = await params;
  if (!categories.includes(categorySlug)) return {};
  const t = await getTranslations({ locale, namespace: "Marketplace" });
  return {
    title: t("meta.categoryTitle", {
      category: t(`categories.${categorySlug}.name`),
    }),
    description: t(`categories.${categorySlug}.summary`),
    alternates: localizedAlternates(locale, `services/${categorySlug}`),
  };
}

export default async function CategoryPage({ params }) {
  const { locale, categorySlug } = await params;
  if (!categories.includes(categorySlug)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Marketplace");
  const localityItems = localities.map((slug) => ({
    slug,
    name: t(`localityNames.${slug}`),
  }));
  return (
    <AuthShell
      locale={locale}
      title={t(`categories.${categorySlug}.name`)}
      description={t(`categories.${categorySlug}.summary`)}
    >
      <LocalityDisclosure
        locale={locale}
        categorySlug={categorySlug}
        items={localityItems}
        summary={t("availableLocalities", { count: localities.length })}
        title={t("viewLocalities")}
        closeLabel={t("closeLocalities")}
      />
      <DiscoveryResults categorySlug={categorySlug} />
    </AuthShell>
  );
}
