import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { ApplicationsDashboard } from "../../../../components/organizations/applications-dashboard.jsx";

export default async function ApplicationsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("OrganizationDashboard");
  return <AuthShell locale={locale} title={t("title")} description={t("description")}><ApplicationsDashboard /></AuthShell>;
}
