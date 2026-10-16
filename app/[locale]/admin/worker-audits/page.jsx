import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { WorkerAuditPanel } from "../../../../components/workers/worker-audit-panel.jsx";
export default async function WorkerAuditsPage({ params }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations("WorkerAudit"); return <AuthShell locale={locale} title={t("title")} description={t("description")}><WorkerAuditPanel /></AuthShell>; }
