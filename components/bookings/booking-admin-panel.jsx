"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
function BookingCard({ item, locale, t, onAction, readOnly }) {
  return (
    <article className="application-card">
      <div className="card-heading">
        <h2>{item.snapshot.offeringTitle[locale]}</h2>
        <span className="status-pill">{t(`status.${item.status}`)}</span>
      </div>
      <p>
        {item.snapshot.localityName[locale]} ·{" "}
        {item.requestType === "emergency"
          ? t("emergency")
          : new Date(item.preferredAt).toLocaleString(locale)}
      </p>
      {item.assignedWorker && (
        <p>
          {t("assignedWorker")}: {item.assignedWorker.name}
        </p>
      )}
      {item.allocation && (
        <details>
          <summary>{t("allocation")}</summary>
          {item.allocation.candidates.map((candidate, index) => (
            <p key={`${candidate.workerId}-${index}`}>
              {candidate.workerName || candidate.workerId}:{" "}
              {candidate.eligible
                ? `${candidate.factors.total}/100`
                : candidate.explanations
                    .map((value) => value[locale])
                    .join(" ")}
            </p>
          ))}
        </details>
      )}
      {!readOnly && (
        <div className="form-actions">
          {item.status === "searching" && (
            <button
              className="secondary-button"
              onClick={() => onAction(item, "retry")}
            >
              {t("retryAllocation")}
            </button>
          )}
          {item.status === "offered" && (
            <button
              className="secondary-button"
              onClick={() => onAction(item, "expire-next")}
            >
              {t("expireNext")}
            </button>
          )}
          {!["completed", "cancelled", "cancelled_no_show"].includes(
            item.status,
          ) && (
            <button
              className="danger-button"
              onClick={() => onAction(item, "cancel", true)}
            >
              {t("cancel")}
            </button>
          )}
          {item.requestType === "scheduled" &&
            ["offered", "assigned", "en_route"].includes(item.status) && (
              <button
                className="danger-button"
                onClick={() => onAction(item, "no-show", true)}
              >
                {t("noShow")}
              </button>
            )}
        </div>
      )}
    </article>
  );
}
export function BookingAdminPanel({ oversight = false }) {
  const locale = useLocale(),
    t = useTranslations("Booking"),
    [cooperatives, setCooperatives] = useState([]),
    [selected, setSelected] = useState(""),
    [items, setItems] = useState(null),
    [error, setError] = useState("");
  async function load(id = selected) {
    try {
      if (oversight)
        setItems((await apiClient.bookingOversight(id)).data.bookings);
      else if (id)
        setItems((await apiClient.cooperativeBookings(id)).data.bookings);
    } catch {
      setError(t("forbidden"));
    }
  }
  useEffect(() => {
    if (oversight)
      apiClient
        .bookingOversight()
        .then((result) => setItems(result.data.bookings))
        .catch(() => setError(t("forbidden")));
    else
      apiClient
        .myCooperatives()
        .then((result) => {
          const values = result.data.cooperatives;
          setCooperatives(values);
          setSelected(values[0]?.id || "");
          if (values[0])
            apiClient
              .cooperativeBookings(values[0].id)
              .then((queue) => setItems(queue.data.bookings));
        })
        .catch(() => setError(t("forbidden")));
  }, [oversight, t]);
  async function action(item, name, reasonRequired = false) {
    const reason = reasonRequired
      ? await requestText({ label: t("reason"), required: true })
      : undefined;
    if (reasonRequired && !reason) return;
    try {
      const result = await apiClient.cooperativeBookingAction(
        selected,
        item.id,
        name,
        { version: item.version, ...(reason ? { reason } : {}) },
      );
      if (result.data.bookings) setItems(result.data.bookings);
      else
        setItems((current) =>
          current.map((value) =>
            value.id === result.data.booking.id ? result.data.booking : value,
          ),
        );
    } catch (requestError) {
      setError(requestError.status === 409 ? t("conflict") : t("failed"));
    }
  }
  return (
    <div className="account-stack">
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {!oversight && (
        <label className="form-field">
          <span>{t("cooperative")}</span>
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              load(event.target.value);
            }}
          >
            {cooperatives.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {items === null ? (
        <p role="status">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="empty-state">{t("noBookings")}</p>
      ) : (
        <div className="admin-list">
          {items.map((item) => (
            <BookingCard
              key={item.id}
              item={item}
              locale={locale}
              t={t}
              onAction={action}
              readOnly={oversight}
            />
          ))}
        </div>
      )}
    </div>
  );
}
