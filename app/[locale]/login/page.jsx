import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { AuthShell } from "../../../components/auth/auth-shell.jsx";
import { LoginForm } from "../../../components/auth/login-form.jsx";
import {
  getDevelopmentPrefill,
  readServerEnvironment,
} from "../../../lib/development-prefill.js";
import { safeLocaleReturn } from "../../../lib/safe-return.js";

export const dynamic = "force-dynamic";

export default async function LoginPage({ params, searchParams }) {
  await connection();
  const { locale } = await params;
  const query = await searchParams;
  const returnTo = safeLocaleReturn(locale, query?.returnTo, `/${locale}/account`);
  setRequestLocale(locale);
  const translations = await getTranslations("Auth");
  const prefill = getDevelopmentPrefill({
    nodeEnv: readServerEnvironment("NODE_ENV"),
    enabled: readServerEnvironment("COSERVE_DEV_PREFILL_ENABLED"),
    email: readServerEnvironment("COSERVE_DEV_ADMIN_EMAIL"),
    password: readServerEnvironment("COSERVE_DEV_ADMIN_PASSWORD"),
  });

  return (
    <AuthShell
      locale={locale}
      title={translations("loginTitle")}
      description={translations("loginDescription")}
      alternate={{
        label: translations("newHere"),
        action: translations("createAccount"),
        href: `/${locale}/register?returnTo=${encodeURIComponent(returnTo)}`,
      }}
    >
      <LoginForm
        initialIdentifier={prefill.identifier}
        initialPassword={prefill.password}
        returnTo={returnTo}
      />
      <div className="organization-entry" aria-label={translations("organizationRegistrationOptions")}>
        <a className="primary-button" href={`/${locale}/organizations/register/cooperative`}>
          {translations("registerCooperative")}
        </a>
        <p>{translations("organizationAccountRequired")}</p>
        <a href={`/${locale}/organizations/register/federation`}>
          {translations("registerFederation")}
        </a>
        <a href={`/${locale}/workers/onboarding`}>{translations("joinWorker")}</a>
      </div>
    </AuthShell>
  );
}
