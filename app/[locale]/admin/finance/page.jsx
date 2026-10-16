import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { CooperativeFinancePanel } from "../../../../components/finance/cooperative-finance-panel.jsx";

export function generateStaticParams() { return [{ locale: "en" }, { locale: "hi" }]; }

export default async function CooperativeFinancePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Finance");
  return <AuthShell locale={locale} title={t("cooperativeFinanceTitle")} description={t("cooperativeFinanceDescription")}><CooperativeFinancePanel /></AuthShell>;
}
