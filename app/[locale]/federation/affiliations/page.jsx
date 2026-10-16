import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { FederationAffiliationsPanel } from "../../../../components/organizations/federation-affiliations-panel.jsx";

export default async function FederationAffiliationsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("FederationAffiliations");
  return <AuthShell locale={locale} title={t("title")} description={t("description")}><FederationAffiliationsPanel /></AuthShell>;
}
