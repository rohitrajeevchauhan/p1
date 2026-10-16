import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { AdminOrganizationsPanel } from "../../../../components/organizations/admin-organizations-panel.jsx";

export default async function AdminOrganizationsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("OrganizationAdmin");
  return <AuthShell locale={locale} title={t("title")} description={t("description")}><AdminOrganizationsPanel /></AuthShell>;
}
