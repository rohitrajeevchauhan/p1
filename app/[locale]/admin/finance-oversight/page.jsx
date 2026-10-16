import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { FinanceOversightPanel } from "../../../../components/finance/finance-oversight-panel.jsx";

export function generateStaticParams() { return [{ locale: "en" }, { locale: "hi" }]; }

export default async function FinanceOversightPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Finance");
  return <AuthShell locale={locale} title={t("oversightTitle")} description={t("oversightDescription")}><FinanceOversightPanel /></AuthShell>;
}
