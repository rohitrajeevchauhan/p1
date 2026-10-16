import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { OperationsDashboard } from "../../../../components/operations/operations-dashboard.jsx";

export function generateStaticParams() { return [{ locale: "en" }, { locale: "hi" }]; }
export default async function OperationsPage({ params }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations("Operations"); return <AuthShell locale={locale} title={t("cooperativeTitle")} description={t("cooperativeDescription")}><OperationsDashboard /></AuthShell>; }
