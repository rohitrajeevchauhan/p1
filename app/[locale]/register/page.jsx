import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../components/auth/auth-shell.jsx";
import { RegisterForm } from "../../../components/auth/register-form.jsx";
import { safeLocaleReturn } from "../../../lib/safe-return.js";

export default async function RegisterPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  const returnTo = safeLocaleReturn(locale, query?.returnTo, `/${locale}/account`);
  setRequestLocale(locale);
  const translations = await getTranslations("Auth");

  return (
    <AuthShell
      locale={locale}
      title={translations("registerTitle")}
      description={translations("registerDescription")}
      alternate={{
        label: translations("alreadyRegistered"),
        action: translations("signIn"),
        href: `/${locale}/login?returnTo=${encodeURIComponent(returnTo)}`,
      }}
    >
      <RegisterForm returnTo={returnTo} />
    </AuthShell>
  );
}
