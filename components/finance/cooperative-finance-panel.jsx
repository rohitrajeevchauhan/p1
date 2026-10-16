"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
import { FormField } from "../auth/form-field.jsx";

const money = (paise, locale) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
  }).format((paise ?? 0) / 100);

const nextBenefitStatuses = {
  referred: ["enrolled", "closed"],
  enrolled: ["active", "closed"],
  active: ["closed"],
  closed: [],
};

export function CooperativeFinancePanel() {
  const locale = useLocale();
  const t = useTranslations("Finance");
  const [cooperatives, setCooperatives] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadScope = useCallback(async (organizationId) => {
    const [report, bookings, workers, complaints] = await Promise.all([
      apiClient.cooperativeFinance(organizationId),
      apiClient.cooperativeBookings(organizationId),
      apiClient.workerQueue(organizationId),
      apiClient.cooperativeComplaints(organizationId),
    ]);
    setData({
      report: report.data,
      bookings: bookings.data.bookings,
      workers: workers.data.memberships
        .filter((item) => item.status === "active")
        .map((item) => item.worker),
      complaints: complaints.data.complaints,
    });
  }, []);

  useEffect(() => {
    let active = true;
    apiClient
      .myCooperatives()
      .then(async (payload) => {
        if (!active) return;
        const items = payload.data.cooperatives.filter(
          (item) => item.status === "approved",
        );
        setCooperatives(items);
        if (items[0]) {
          setSelectedId(items[0].id);
          await loadScope(items[0].id);
        } else setData(false);
      })
      .catch(() => active && setError(t("loadFailed")));
    return () => {
      active = false;
    };
  }, [loadScope, t]);

  async function refresh() {
    setError("");
    await loadScope(selectedId);
  }

  async function choose(event) {
    const id = event.target.value;
    setSelectedId(id);
    setData(null);
    try {
      await loadScope(id);
    } catch {
      setError(t("loadFailed"));
    }
  }

  async function propose(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.proposeFinalPrice(selectedId, form.get("bookingId"), {
        amountRupees: Number(form.get("amountRupees")),
        lineItem: form.get("lineItem"),
      });
      event.currentTarget.reset();
      setMessage(t("priceProposed"));
      await refresh();
    } catch {
      setError(t("conflict"));
    } finally {
      setBusy(false);
    }
  }

  async function createBenefit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.createBenefit(selectedId, {
        workerId: form.get("workerId"),
        type: form.get("type"),
        status: "referred",
        programName: form.get("programName"),
        providerName: form.get("providerName"),
        ...(form.get("reference") ? { reference: form.get("reference") } : {}),
        ...(form.get("note") ? { note: form.get("note") } : {}),
      });
      event.currentTarget.reset();
      setMessage(t("benefitCreated"));
      await refresh();
    } catch {
      setError(t("conflict"));
    } finally {
      setBusy(false);
    }
  }

  async function changeBenefit(item, status) {
    const reason = await requestText({ label: t("reason"), required: true });
    if (!reason) return;
    try {
      await apiClient.updateBenefit(selectedId, item.id, {
        version: item.version,
        status,
        reason,
      });
      setMessage(t("benefitUpdated"));
      await refresh();
    } catch {
      setError(t("conflict"));
    }
  }

  async function complaintAction(item, action) {
    const reason = await requestText({ label: t("reason"), required: true });
    if (!reason) return;
    const resolution =
      action === "review"
        ? undefined
        : await requestText({ label: t("resolution"), required: true });
    if (action !== "review" && !resolution) return;
    try {
      await apiClient.cooperativeComplaintAction(selectedId, item.id, action, {
        version: item.version,
        reason,
        ...(resolution ? { resolution } : {}),
      });
      setMessage(t("complaintUpdated"));
      await refresh();
    } catch {
      setError(t("conflict"));
    }
  }

  if (!data)
    return (
      <p role="status">
        {error || (data === false ? t("noAssignedCooperative") : t("loading"))}
      </p>
    );
  const completed = data.bookings.filter((item) => item.status === "completed");
  const totals = data.report.totals;

  return (
    <div className="finance-stack">
      <label className="form-field" htmlFor="finance-cooperative">
        <span>{t("cooperative")}</span>
        <select id="finance-cooperative" value={selectedId} onChange={choose}>
          {cooperatives.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {(message || error) && (
        <p
          className={error ? "form-alert" : "success-message"}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </p>
      )}
      <section className="finance-summary" aria-label={t("financeTotals")}>
        <Summary
          label={t("totalRecorded")}
          value={money(totals.paidPaise, locale)}
        />
        <Summary
          label={t("workerShare")}
          value={money(totals.workerPaise, locale)}
        />
        <Summary
          label={t("cooperativeShare")}
          value={money(totals.cooperativePaise, locale)}
        />
        <Summary
          label={t("welfareShare")}
          value={money(totals.welfarePaise, locale)}
        />
      </section>
      <p className="field-hint">{data.report.policyNotice[locale]}</p>

      <section className="finance-card">
        <h2>{t("finalizePrice")}</h2>
        {completed.length ? (
          <form className="auth-form" onSubmit={propose}>
            <label className="form-field">
              <span>{t("booking")}</span>
              <select name="bookingId" required>
                {completed.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.snapshot.offeringTitle[locale]} · {item.id}
                  </option>
                ))}
              </select>
            </label>
            <FormField
              id="final-amount"
              name="amountRupees"
              type="number"
              min="1"
              step="1"
              label={t("amountRupees")}
              required
            />
            <FormField
              id="price-line-item"
              name="lineItem"
              label={t("lineItem")}
              minLength="5"
              maxLength="500"
              required
            />
            <button className="primary-button" disabled={busy}>
              {t("proposePrice")}
            </button>
          </form>
        ) : (
          <p className="empty-state">{t("noCompletedBookings")}</p>
        )}
      </section>

      <section className="finance-card">
        <h2>{t("recordBenefit")}</h2>
        {data.workers.length ? (
          <form className="auth-form" onSubmit={createBenefit}>
            <label className="form-field">
              <span>{t("worker")}</span>
              <select name="workerId" required>
                {data.workers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{t("benefitTypeLabel")}</span>
              <select name="type">
                {[
                  "welfare_support",
                  "insurance_referral",
                  "training_safety",
                ].map((value) => (
                  <option key={value} value={value}>
                    {t(`benefitType.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <FormField
              id="program-name"
              name="programName"
              label={t("programName")}
              required
            />
            <FormField
              id="provider-name"
              name="providerName"
              label={t("providerName")}
              required
            />
            <FormField
              id="benefit-reference"
              name="reference"
              label={t("referenceOptional")}
              maxLength="120"
            />
            <FormField
              id="benefit-note"
              name="note"
              label={t("noteOptional")}
              multiline
              maxLength="500"
            />
            <button className="primary-button" disabled={busy}>
              {t("createBenefit")}
            </button>
          </form>
        ) : (
          <p className="empty-state">{t("noActiveWorkers")}</p>
        )}
      </section>

      <section>
        <h2>{t("benefits")}</h2>
        {data.report.benefits.length ? (
          data.report.benefits.map((item) => (
            <article className="finance-card" key={item.id}>
              <h3>{item.programName}</h3>
              <p>
                {item.providerName} · {t(`benefitStatus.${item.status}`)}
              </p>
              <p className="field-hint">{item.notice}</p>
              <div className="form-actions">
                {nextBenefitStatuses[item.status].map((status) => (
                  <button
                    type="button"
                    className="secondary-button"
                    key={status}
                    onClick={() => changeBenefit(item, status)}
                  >
                    {t(`setBenefitStatus.${status}`)}
                  </button>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">{t("none")}</p>
        )}
      </section>

      <section>
        <h2>{t("complaints")}</h2>
        {data.complaints.length ? (
          data.complaints.map((item) => (
            <article className="finance-card" key={item.id}>
              <h3>{t(`categories.${item.category}`)}</h3>
              <p>
                <strong>{t(`complaintStatus.${item.status}`)}</strong>
              </p>
              <p>{item.description}</p>
              {item.desiredResolution && <p>{item.desiredResolution}</p>}
              <div className="form-actions">
                {item.status === "submitted" && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => complaintAction(item, "review")}
                  >
                    {t("startReview")}
                  </button>
                )}
                {item.status === "under_review" && (
                  <>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => complaintAction(item, "resolve")}
                    >
                      {t("resolve")}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => complaintAction(item, "dismiss")}
                    >
                      {t("dismiss")}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">{t("none")}</p>
        )}
      </section>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
