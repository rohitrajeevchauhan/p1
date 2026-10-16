"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
import { FormField } from "../auth/form-field.jsx";
const money = (paise, locale) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "INR" }).format(
    (paise ?? 0) / 100,
  );
export function CustomerFinancePanel({ bookingId, bookingStatus }) {
  const locale = useLocale(),
    t = useTranslations("Finance"),
    [data, setData] = useState(null),
    [complaints, setComplaints] = useState([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const paymentKey = useRef(null);
  async function load() {
    try {
      const [finance, cases] = await Promise.all([
        apiClient.customerFinance(bookingId),
        apiClient.complaints(),
      ]);
      setData(finance.data);
      setComplaints(
        cases.data.complaints.filter((item) => item.bookingId === bookingId),
      );
    } catch {
      setError(t("loadFailed"));
    }
  }
  useEffect(() => {
    let active = true;
    Promise.all([apiClient.customerFinance(bookingId), apiClient.complaints()])
      .then(([finance, cases]) => {
        if (active) {
          setData(finance.data);
          setComplaints(
            cases.data.complaints.filter(
              (item) => item.bookingId === bookingId,
            ),
          );
        }
      })
      .catch(() => {
        if (active) setError(t("loadFailed"));
      });
    return () => {
      active = false;
    };
  }, [bookingId, t]);
  async function accept() {
    try {
      await apiClient.acceptFinalPrice(bookingId, data.price.version);
      setMessage(t("priceAccepted"));
      await load();
    } catch {
      setError(t("conflict"));
    }
  }
  async function pay() {
    try {
      paymentKey.current ??= globalThis.crypto.randomUUID();
      await apiClient.makeDemoPayment(bookingId, {
        idempotencyKey: paymentKey.current,
        method: "simulated_digital_payment",
      });
      setMessage(t("paymentRecorded"));
      await load();
    } catch {
      setError(t("conflict"));
    }
  }
  async function review(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.createReview(bookingId, {
        rating: Number(form.get("rating")),
        ...(form.get("feedback") ? { feedback: form.get("feedback") } : {}),
      });
      event.currentTarget.reset();
      setMessage(t("reviewSaved"));
      await load();
    } catch {
      setError(t("conflict"));
    }
  }
  async function complaint(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.createComplaint({
        bookingId,
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
      setMessage(t("escalated"));
      await load();
    } catch {
      setError(t("conflict"));
    }
  }
  if (data === null) return <p role="status">{error || t("loading")}</p>;
  return (
    <div className="finance-stack">
      <h3>{t("customerTitle")}</h3>
      {(message || error) && (
        <p
          className={error ? "form-alert" : "success-message"}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </p>
      )}
      <p className="field-hint">{data.policyNotice[locale]}</p>
      {data.price ? (
        <section className="finance-card">
          <h4>{t("finalPrice")}</h4>
          <strong className="money-value">
            {money(data.price.amountPaise, locale)}
          </strong>
          <p>{data.price.lineItem}</p>
          <Distribution value={data.price.distribution} locale={locale} t={t} />
          {data.price.status === "proposed" && (
            <button className="primary-button" onClick={accept}>
              {t("acceptPrice")}
            </button>
          )}
          {data.price.status === "accepted" && !data.payment && (
            <button className="primary-button" onClick={pay}>
              {t("simulatePayment")}
            </button>
          )}
        </section>
      ) : bookingStatus === "completed" ? (
        <p className="empty-state">{t("awaitingPrice")}</p>
      ) : null}
      {data.payment && (
        <section className="finance-card">
          <h4>{t("receipt")}</h4>
          <p>
            <strong>{money(data.payment.amountPaise, locale)}</strong> ·{" "}
            {data.payment.reference}
          </p>
          <p className="field-hint">{data.payment.notice[locale]}</p>
          <Link
            className="secondary-button"
            href={`/${locale}/requests/${bookingId}/invoice`}
          >
            {t("viewInvoice")}
          </Link>
        </section>
      )}
      {data.payment && !data.review && (
        <form className="auth-form finance-card" onSubmit={review}>
          <h4>{t("reviewTitle")}</h4>
          <label className="form-field">
            <span>{t("rating")}</span>
            <select name="rating" required defaultValue="5">
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <FormField
            id={`feedback-${bookingId}`}
            name="feedback"
            label={t("feedback")}
            multiline
            minLength="10"
            maxLength="1000"
          />
          <button className="primary-button">{t("submitReview")}</button>
        </form>
      )}
      <form className="auth-form finance-card" onSubmit={complaint}>
        <h4>{t("complaintTitle")}</h4>
        <label className="form-field">
          <span>{t("category")}</span>
          <select name="category" required>
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
          id={`complaint-${bookingId}`}
          name="description"
          label={t("description")}
          multiline
          minLength="10"
          maxLength="2000"
          required
        />
        <FormField
          id={`resolution-${bookingId}`}
          name="desiredResolution"
          label={t("desiredResolution")}
          multiline
          maxLength="1000"
        />
        <button className="secondary-button">{t("submitComplaint")}</button>
      </form>
      {complaints.map((item) => (
        <article className="finance-card" key={item.id}>
          <strong>{t(`complaintStatus.${item.status}`)}</strong>
          <p>{item.description}</p>
          {item.resolution && <p>{item.resolution}</p>}
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
    </div>
  );
}
function Distribution({ value, locale, t }) {
  return (
    <dl className="distribution-grid">
      <div>
        <dt>{t("workerShare")}</dt>
        <dd>
          {money(value.workerPaise, locale)} ({value.workerBps / 100}%)
        </dd>
      </div>
      <div>
        <dt>{t("cooperativeShare")}</dt>
        <dd>
          {money(value.cooperativePaise, locale)} ({value.cooperativeBps / 100}
          %)
        </dd>
      </div>
      <div>
        <dt>{t("welfareShare")}</dt>
        <dd>
          {money(value.welfarePaise, locale)} ({value.welfareBps / 100}%)
        </dd>
      </div>
    </dl>
  );
}
