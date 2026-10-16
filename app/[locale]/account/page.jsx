import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountPanel } from "../../../components/auth/account-panel.jsx";
import { AuthShell } from "../../../components/auth/auth-shell.jsx";

export default async function AccountPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const translations = await getTranslations("Account");

  return (
    <AuthShell
      locale={locale}
      title={translations("title")}
      description={translations("description")}
    >
      <AccountPanel />
    </AuthShell>
  );
}

