"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/api-client.js";

export function ApplicationsDashboard() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("OrganizationDashboard");
  const [applications, setApplications] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    apiClient.applications().then((payload) => {
      setApplications(payload.data.applications);
      setState("ready");
    }).catch((error) => {
      if (error.status === 401) router.replace(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/organizations/applications`)}`);
      else setState("error");
    });
  }, [locale, router]);

  if (state === "loading") return <p role="status">{t("loading")}</p>;
  if (state === "error") return <div className="form-alert" role="alert">{t("loadFailed")}</div>;
  if (!applications.length) return <div className="empty-state"><p>{t("empty")}</p><Link className="primary-button" href={`/${locale}/organizations/register/cooperative`}>{t("register")}</Link></div>;

  return <div className="application-list">{applications.map((item) => (
    <article className="application-card" key={item.id}>
      <div className="card-heading"><div><p className="eyebrow">{t(item.type)}</p><h2>{item.proposedName}</h2></div><span className={`status-chip status-${item.status}`}>{t(`status.${item.status}`)}</span></div>
      <dl className="detail-grid">
        <div><dt>{t("submitted")}</dt><dd>{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString(locale) : t("notSubmitted")}</dd></div>
        <div><dt>{t("reviewed")}</dt><dd>{item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString(locale) : t("notReviewed")}</dd></div>
        <div><dt>{t("autoApproval")}</dt><dd>{item.autoApprovalApplied === null ? t("notApplied") : item.autoApprovalApplied ? t("yes") : t("no")}</dd></div>
        <div><dt>{t("affiliation")}</dt><dd>{item.affiliation ? t(`affiliationStatus.${item.affiliation.status}`) : t("independent")}</dd></div>
      </dl>
      {item.rejectionReason && <div className="form-alert"><strong>{t("rejectionReason")}</strong> {item.rejectionReason}</div>}
      {["draft", "rejected"].includes(item.status) && <Link className="primary-button" href={`/${locale}/organizations/register/${item.type}?id=${item.id}`}>{item.status === "draft" ? t("continueDraft") : t("correct")}</Link>}
      {item.resultingOrganizationId && <p className="success-message">{t("organizationCreated")}</p>}
      <details><summary>{t("history")}</summary><ol className="history-list">{item.history.map((event, index) => <li key={`${event.occurredAt}-${index}`}><strong>{t(`status.${event.to}`)}</strong> · {new Date(event.occurredAt).toLocaleString(locale)}{event.reason ? ` — ${event.reason}` : ""}</li>)}</ol></details>
    </article>
  ))}</div>;
}
