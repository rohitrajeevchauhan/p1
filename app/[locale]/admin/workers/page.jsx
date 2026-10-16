import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { CooperativeWorkerPanel } from "../../../../components/workers/cooperative-worker-panel.jsx";
export default async function CooperativeWorkersPage({ params }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations("WorkerAdmin"); return <AuthShell locale={locale} title={t("title")} description={t("description")}><CooperativeWorkerPanel /></AuthShell>; }
