import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../../components/auth/auth-shell.jsx";
import { OrganizationApplicationForm } from "../../../../../components/organizations/organization-application-form.jsx";

export default async function CooperativeRegistrationPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Organizations");
  return <AuthShell locale={locale} title={t("cooperativeTitle")} description={t("cooperativeDescription")}><OrganizationApplicationForm type="cooperative" /></AuthShell>;
}
