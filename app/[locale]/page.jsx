import { setRequestLocale } from "next-intl/server";
import { LandingPage } from "../../components/landing-page.jsx";
import { getTranslations } from "next-intl/server";
import { localizedAlternates, siteOrigin } from "../../lib/seo.js";

export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: "Metadata" }); return { title: t("title"), description: t("description"), alternates: localizedAlternates(locale) }; }

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const origin = siteOrigin();
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", name: "CoServe", url: `${origin}/${locale}`, inLanguage: locale }, { "@type": "Organization", name: "CoServe", url: `${origin}/${locale}` }] };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} /><LandingPage /></>;
}
