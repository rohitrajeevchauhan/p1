import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { WorkerOnboardingPanel } from "../../../../components/workers/worker-onboarding-panel.jsx";
export default async function WorkerPage({ params }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations("Worker"); return <AuthShell locale={locale} title={t("title")} description={t("description")}><WorkerOnboardingPanel /></AuthShell>; }
