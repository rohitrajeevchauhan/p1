import { setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../components/auth/auth-shell.jsx";
import { DiscoveryResults } from "../../../components/marketplace/discovery-results.jsx";
import { localizedAlternates } from "../../../lib/seo.js";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    title: "Find services",
    description: "Find nearby available workers.",
    alternates: localizedAlternates(locale, "services"),
  };
}

export default async function ServicesPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthShell
      locale={locale}
      hideWorkspaceLabel
    >
      <DiscoveryResults />
    </AuthShell>
  );
}
