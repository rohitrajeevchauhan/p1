"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";

const money = (paise, locale) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
  }).format((paise ?? 0) / 100);

export function FinanceOversightPanel() {
  const locale = useLocale();
  const t = useTranslations("Finance");
  const [system, setSystem] = useState(false);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const me = await apiClient.me();
    const isSystem = me.data.user.roles.includes("system_admin");
    const [reports, complaints, reviews] = await Promise.all([
      apiClient.financeOversight(),
      apiClient.escalationComplaints(),
      isSystem
        ? apiClient.adminReviews()
        : Promise.resolve({ data: { reviews: [] } }),
    ]);
    setSystem(isSystem);
    setData({
      reports: reports.data.reports,
      complaints: complaints.data.complaints,
      reviews: reviews.data.reviews,
    });
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(load)
      .catch(() => active && setError(t("loadFailed")));
    return () => {
      active = false;
    };
  }, [load, t]);

  async function escalationAction(item, action) {
    const reason = await requestText({ label: t("reason"), required: true });
    if (!reason) return;
    const resolution =
      action === "review"
        ? undefined
        : await requestText({ label: t("resolution"), required: true });
    if (action !== "review" && !resolution) return;
    try {
      await apiClient.escalationAction(item.id, action, {
        version: item.version,
        reason,
        ...(resolution ? { resolution } : {}),
      });
      setMessage(t("complaintUpdated"));
      setError("");
      await load();
    } catch {
      setError(t("conflict"));
    }
  }

  async function takeover(item) {
    const reason = await requestText({ label: t("reason"), required: true });
    if (!reason) return;
    try {
      await apiClient.safetyTakeover(item.id, {
        version: item.version,
        reason,
      });
      setMessage(t("safetyTakenOver"));
      setError("");
      await load();
    } catch {
      setError(t("conflict"));
    }
  }

  async function moderate(item) {
    const reason = await requestText({
      label: t("moderationReason"),
      required: true,
    });
    if (!reason) return;
    try {
      await apiClient.moderateReview(item.id, {
        version: item.moderationVersion,
        visible: !item.visible,
        reason,
      });
      setMessage(t("reviewModerated"));
      setError("");
      await load();
    } catch {
      setError(t("conflict"));
    }
  }

  if (!data) return <p role="status">{error || t("loading")}</p>;
  const totals = data.reports.reduce(
    (sum, item) => ({
      paid: sum.paid + item.paidPaise,
      worker: sum.worker + item.workerPaise,
      cooperative: sum.cooperative + item.cooperativePaise,
      welfare: sum.welfare + item.welfarePaise,
    }),
    { paid: 0, worker: 0, cooperative: 0, welfare: 0 },
  );

  return (
    <div className="finance-stack">
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
          value={money(totals.paid, locale)}
        />
        <Summary
          label={t("workerShare")}
          value={money(totals.worker, locale)}
        />
        <Summary
          label={t("cooperativeShare")}
          value={money(totals.cooperative, locale)}
        />
        <Summary
          label={t("welfareShare")}
          value={money(totals.welfare, locale)}
        />
      </section>
      <p className="field-hint">{t("oversightReadOnly")}</p>

      <section>
        <h2>{t("cooperativeReports")}</h2>
        <div className="market-grid">
          {data.reports.length ? (
            data.reports.map((item) => (
              <article className="finance-card" key={item.cooperative.id}>
                <h3>{item.cooperative.name}</h3>
                <p>{t("paymentsCount", { count: item.paymentCount })}</p>
                <strong>{money(item.paidPaise, locale)}</strong>
                <dl className="distribution-grid">
                  <div>
                    <dt>{t("workerShare")}</dt>
                    <dd>{money(item.workerPaise, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t("cooperativeShare")}</dt>
                    <dd>{money(item.cooperativePaise, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t("welfareShare")}</dt>
                    <dd>{money(item.welfarePaise, locale)}</dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <p className="empty-state">{t("none")}</p>
          )}
        </div>
      </section>

      <section>
        <h2>{t("escalationQueue")}</h2>
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
                {system &&
                  item.category === "safety" &&
                  ["submitted", "under_review"].includes(item.status) && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => takeover(item)}
                    >
                      {t("safetyTakeover")}
                    </button>
                  )}
                {item.status === "escalated" && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => escalationAction(item, "review")}
                  >
                    {t("startReview")}
                  </button>
                )}
                {item.status === "under_escalated_review" && (
                  <>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => escalationAction(item, "resolve")}
                    >
                      {t("resolve")}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => escalationAction(item, "dismiss")}
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

      {system && (
        <section>
          <h2>{t("reviewModeration")}</h2>
          <p className="field-hint">{t("moderationReadOnly")}</p>
          {data.reviews.length ? (
            data.reviews.map((item) => (
              <article className="finance-card" key={item.id}>
                <p>
                  <strong>{t("ratingValue", { rating: item.rating })}</strong> ·{" "}
                  {item.visible ? t("visible") : t("hidden")}
                </p>
                {item.feedback && <p>{item.feedback}</p>}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => moderate(item)}
                >
                  {item.visible ? t("hideReview") : t("unhideReview")}
                </button>
              </article>
            ))
          ) : (
            <p className="empty-state">{t("none")}</p>
          )}
        </section>
      )}
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
