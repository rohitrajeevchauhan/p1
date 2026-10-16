"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient, ApiClientError } from "../../lib/api-client.js";

export function AdminOrganizationsPanel() {
  const t = useTranslations("OrganizationAdmin");
  const [applications, setApplications] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [filters, setFilters] = useState({ type: "", status: "" });
  const [reasons, setReasons] = useState({});
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
      const [applicationPayload, organizationPayload] = await Promise.all([
        apiClient.reviewApplications(query ? `?${query}` : ""),
        apiClient.adminOrganizations(),
      ]);
      setApplications(applicationPayload.data.applications);
      setOrganizations(organizationPayload.data.organizations);
      setState("ready");
    } catch (error) { setState([401, 403].includes(error.status) ? "forbidden" : "error"); }
  }, [filters]);

  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function transition(item, action) {
    setMessage("");
    try {
      if (action === "review") await apiClient.startApplicationReview(item.id, item.version);
      if (action === "approve") await apiClient.approveApplication(item.id, item.version, reasons[item.id] || "");
      if (action === "reject") await apiClient.rejectApplication(item.id, item.version, reasons[item.id] || "");
      setMessage(t("actionComplete"));
      await load();
    } catch (error) {
      setMessage(error instanceof ApiClientError && error.status === 409 ? t("conflict") : t("actionFailed"));
    }
  }

  async function organizationTransition(item, action) {
    setMessage("");
    try {
      const reason = reasons[`org-${item.id}`] || "";
      if (action === "suspend") await apiClient.suspendOrganization(item.id, reason);
      else await apiClient.restoreOrganization(item.id, reason);
      setMessage(t("actionComplete"));
      await load();
    } catch { setMessage(t("actionFailed")); }
  }

  if (state === "loading") return <p role="status">{t("loading")}</p>;
  if (state === "forbidden") return <div className="form-alert" role="alert">{t("forbidden")}</div>;
  if (state === "error") return <div className="form-alert" role="alert">{t("loadFailed")}</div>;

  return <div className="account-stack">
    {message && <div className={message === t("actionComplete") ? "success-message" : "form-alert"} role="status">{message}</div>}
    <section className="account-section"><h2>{t("applications")}</h2>
      <div className="form-grid filter-row">
        <div className="form-field"><label htmlFor="filter-type">{t("typeFilter")}</label><select id="filter-type" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">{t("all")}</option><option value="cooperative">{t("cooperative")}</option><option value="federation">{t("federation")}</option></select></div>
        <div className="form-field"><label htmlFor="filter-status">{t("statusFilter")}</label><select id="filter-status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">{t("all")}</option>{["draft", "submitted", "under_review", "approved", "rejected"].map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}</select></div>
      </div>
      <div className="application-list compact-list">{applications.length ? applications.map((item) => <article className="application-card" key={item.id}>
        <div className="card-heading"><div><p className="eyebrow">{t(item.type)}</p><h3>{item.proposedName}</h3></div><span className={`status-chip status-${item.status}`}>{t(`status.${item.status}`)}</span></div>
        <p>{item.applicant.displayName} · {item.applicant.email || item.applicant.phone}</p>
        <details><summary>{t("details")}</summary><dl className="detail-grid"><div><dt>{t("registrationIdentifier")}</dt><dd>{item.registrationIdentifier}</dd></div><div><dt>{t("location")}</dt><dd>{item.locality}, {item.district}, {item.state} {item.postalCode}</dd></div><div><dt>{t("contact")}</dt><dd>{item.contactEmail}<br />{item.contactPhone}</dd></div><div><dt>{t("descriptionLabel")}</dt><dd>{item.description}</dd></div></dl><ol className="history-list">{item.history.map((event, index) => <li key={`${event.occurredAt}-${index}`}>{t(`status.${event.to}`)}{event.reason ? ` — ${event.reason}` : ""}</li>)}</ol></details>
        {["submitted", "under_review"].includes(item.status) && <div className="review-actions">
          <label className="form-field"><span>{t("reason")}</span><input value={reasons[item.id] || ""} onChange={(event) => setReasons({ ...reasons, [item.id]: event.target.value })} /></label>
          {item.status === "submitted" && <button className="secondary-button" type="button" onClick={() => transition(item, "review")}>{t("startReview")}</button>}
          <button className="primary-button" type="button" onClick={() => transition(item, "approve")}>{t("approve")}</button>
          <button className="danger-button" type="button" onClick={() => transition(item, "reject")}>{t("reject")}</button>
        </div>}
      </article>) : <p>{t("noApplications")}</p>}</div>
    </section>
    <section className="account-section"><h2>{t("organizations")}</h2><div className="application-list compact-list">{organizations.length ? organizations.map((item) => <article className="application-card" key={item.id}>
      <div className="card-heading"><div><p className="eyebrow">{t(item.type)}</p><h3>{item.name}</h3></div><span className={`status-chip status-${item.status}`}>{t(`organizationStatus.${item.status}`)}</span></div>
      <p>{item.locality}, {item.district}</p>
      <label className="form-field"><span>{t("reasonRequired")}</span><input value={reasons[`org-${item.id}`] || ""} onChange={(event) => setReasons({ ...reasons, [`org-${item.id}`]: event.target.value })} /></label>
      <button className={item.status === "approved" ? "danger-button" : "secondary-button"} type="button" onClick={() => organizationTransition(item, item.status === "approved" ? "suspend" : "restore")}>{item.status === "approved" ? t("suspend") : t("restore")}</button>
    </article>) : <p>{t("noOrganizations")}</p>}</div></section>
  </div>;
}
