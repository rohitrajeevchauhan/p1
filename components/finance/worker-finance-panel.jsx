"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
import { FormField } from "../auth/form-field.jsx";
const money = (paise, locale) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "INR" }).format(
    (paise ?? 0) / 100,
  );
export function WorkerFinancePanel() {
  const locale = useLocale(),
    t = useTranslations("Finance"),
    [data, setData] = useState(null),
    [bookings, setBookings] = useState([]),
    [complaints, setComplaints] = useState([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function load() {
    try {
      const [finance, jobs, cases] = await Promise.all([
        apiClient.workerFinance(),
        apiClient.workerBookings(),
        apiClient.complaints(),
      ]);
      setData(finance.data);
      setBookings([
        ...new Set([
          ...finance.data.earnings.map((item) => item.bookingId),
          ...jobs.data.jobs.map((item) => item.id),
        ]),
      ]);
      setComplaints(cases.data.complaints);
    } catch {
      setError(t("loadFailed"));
    }
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.workerFinance(),
      apiClient.workerBookings(),
      apiClient.complaints(),
    ])
      .then(([finance, jobs, cases]) => {
        if (active) {
          setData(finance.data);
          setBookings([
            ...new Set([
              ...finance.data.earnings.map((item) => item.bookingId),
              ...jobs.data.jobs.map((item) => item.id),
            ]),
          ]);
          setComplaints(cases.data.complaints);
        }
      })
      .catch(() => {
        if (active) setError(t("loadFailed"));
      });
    return () => {
      active = false;
    };
  }, [t]);
  async function complaint(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.createComplaint({
        bookingId: form.get("bookingId"),
        category: form.get("category"),
        description: form.get("description"),
        ...(form.get("desiredResolution")
          ? { desiredResolution: form.get("desiredResolution") }
          : {}),
      });
      event.currentTarget.reset();
      setMessage(t("complaintSaved"));
      await load();
    } catch {
      setError(t("conflict"));
    }
  }
  async function escalate(item) {
    const reason = await requestText({ label: t("reason"), required: true });
    if (!reason) return;
    try {
      await apiClient.escalateComplaint(item.id, {
        version: item.version,
        reason,
      });
      await load();
    } catch {
      setError(t("conflict"));
    }
  }
  if (!data) return <p role="status">{error || t("loading")}</p>;
  return (
    <div className="finance-stack">
      {(message || error) && (
        <p className={error ? "form-alert" : "success-message"}>
          {error || message}
        </p>
      )}
      <section className="finance-summary">
        <div>
          <span>{t("earnings")}</span>
          <strong>{money(data.totals.earningPaise, locale)}</strong>
        </div>
        <div>
          <span>{t("welfare")}</span>
          <strong>{money(data.totals.welfarePaise, locale)}</strong>
        </div>
      </section>
      <section>
        <h2>{t("earningHistory")}</h2>
        {data.earnings.length ? (
          data.earnings.map((item) => (
            <article className="finance-card" key={item.id}>
              <strong>{money(item.amountPaise, locale)}</strong>
              <p>{t(`earningStatus.${item.status}`)}</p>
            </article>
          ))
        ) : (
          <p className="empty-state">{t("none")}</p>
        )}
      </section>
      <section>
        <h2>{t("welfareHistory")}</h2>
        {data.welfare.map((item) => (
          <article className="finance-card" key={item.id}>
            <strong>{money(item.amountPaise, locale)}</strong>
            <p>{item.notice[locale]}</p>
          </article>
        ))}
      </section>
      <section>
        <h2>{t("benefits")}</h2>
        {data.benefits.map((item) => (
          <article className="finance-card" key={item.id}>
            <strong>{item.programName}</strong>
            <p>
              {item.providerName} · {t(`benefitStatus.${item.status}`)}
            </p>
            <p className="field-hint">{item.notice}</p>
          </article>
        ))}
      </section>
      {bookings.length > 0 && (
        <form className="auth-form finance-card" onSubmit={complaint}>
          <h2>{t("complaintTitle")}</h2>
          <label className="form-field">
            <span>{t("booking")}</span>
            <select name="bookingId">
              {bookings.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>{t("category")}</span>
            <select name="category">
              {[
                "quality",
                "conduct",
                "safety",
                "pricing_payment",
                "no_show",
                "other",
              ].map((value) => (
                <option key={value} value={value}>
                  {t(`categories.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <FormField
            id="worker-complaint"
            name="description"
            label={t("description")}
            multiline
            minLength="10"
            maxLength="2000"
            required
          />
          <FormField
            id="worker-resolution"
            name="desiredResolution"
            label={t("desiredResolution")}
            multiline
            maxLength="1000"
          />
          <button className="secondary-button">{t("submitComplaint")}</button>
        </form>
      )}
      <section>
        <h2>{t("complaints")}</h2>
        {complaints.map((item) => (
          <article className="finance-card" key={item.id}>
            <strong>{t(`complaintStatus.${item.status}`)}</strong>
            <p>{item.description}</p>
            {["resolved", "dismissed"].includes(item.status) &&
              !item.escalatedOnce && (
                <button
                  className="secondary-button"
                  onClick={() => escalate(item)}
                >
                  {t("escalate")}
                </button>
              )}
          </article>
        ))}
      </section>
    </div>
  );
}
