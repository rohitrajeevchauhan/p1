import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "../../../../components/auth/auth-shell.jsx";
import { RequestDetail } from "../../../../components/marketplace/request-detail.jsx";

export default async function RequestDetailPage({ params }) {
  const { locale, requestId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ServiceRequest");
  return <AuthShell locale={locale} title={t("detailTitle")} description={t("detailDescription")}><RequestDetail requestId={requestId} /></AuthShell>;
}
