import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../components/auth/auth-shell.jsx";
import { NotificationCenter } from "../../../components/notifications/notification-center.jsx";

export function generateStaticParams() { return [{ locale: "en" }, { locale: "hi" }]; }
export default async function NotificationsPage({ params }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations("Notifications"); return <AuthShell locale={locale} title={t("title")} description={t("description")}><NotificationCenter /></AuthShell>; }
