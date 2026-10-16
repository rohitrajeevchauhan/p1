import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsPanel } from "../../../../components/admin/settings-panel.jsx";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";

export default async function AdminSettingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const translations = await getTranslations("AdminSettings");

  return (
    <AuthShell locale={locale} title={translations("title")} description={translations("description")}>
      <SettingsPanel />
    </AuthShell>
  );
}
