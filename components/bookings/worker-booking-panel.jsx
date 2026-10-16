"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
import { FormField } from "../auth/form-field.jsx";
import { userError } from "../../lib/user-error.js";
export function WorkerBookingPanel() {
  const locale = useLocale(),
    t = useTranslations("Booking");
  const [availability, setAvailability] = useState(null),
    [catalog, setCatalog] = useState(null),
    [inbox, setInbox] = useState(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    try {
      const [a, c, i] = await Promise.all([
        apiClient.bookingAvailability(),
        apiClient.marketplaceCatalog(),
        apiClient.workerBookings(),
      ]);
      setAvailability(a.data.availability);
      setCatalog(c.data);
      setInbox(i.data);
    } catch {
      setError(t("loadFailed"));
    }
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.bookingAvailability(),
      apiClient.marketplaceCatalog(),
      apiClient.workerBookings(),
    ])
      .then(([a, c, i]) => {
        if (active) {
          setAvailability(a.data.availability);
          setCatalog(c.data);
          setInbox(i.data);
        }
      })
      .catch(() => {
        if (active) setError(t("loadFailed"));
      });
    return () => {
      active = false;
    };
  }, [t]);
  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    setBusy("availability");
    try {
      const result = await apiClient.saveBookingAvailability({
        acceptingRequests: form.get("acceptingRequests") === "on",
        primaryLocalityId: form.get("primaryLocalityId"),
        serviceLocalityIds: form.getAll("serviceLocalityIds"),
        workingDays: form.getAll("workingDays").map(Number),
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
        emergencyOptIn: form.get("emergencyOptIn") === "on",
        version: availability.version,
      });
      setAvailability(result.data.availability);
      setNotice(t("availabilitySaved"));
    } catch (requestError) {
      setError(
        userError(requestError, t("networkFailed"), {
          BOOKING_CONFLICT: t("conflict"),
          VALIDATION_ERROR: t("availabilityInvalid"),
          status: { 401: t("sessionExpired"), 429: t("rateLimited") },
        }),
      );
    } finally {
      setBusy("");
    }
  }
  async function offer(id, action, version) {
    const reason =
      action === "reject"
        ? (await requestText({ label: t("optionalReason") })) || undefined
        : undefined;
    const key = `offer-${id}-${action}`;
    setError("");
    setNotice("");
    setBusy(key);
    try {
      await apiClient.respondBookingOffer(id, action, {
        version,
        ...(reason ? { reason } : {}),
      });
      setNotice(t(action === "accept" ? "accepted" : "rejected"));
      await load();
    } catch (requestError) {
      setError(
        userError(requestError, t("networkFailed"), {
          BOOKING_CONFLICT: t("conflict"),
          VALIDATION_ERROR: t("validationFailed"),
          status: { 401: t("sessionExpired"), 429: t("rateLimited") },
        }),
      );
    } finally {
      setBusy("");
    }
  }
  async function action(item, name, reasonRequired = false) {
    const reason = reasonRequired
      ? await requestText({ label: t("reason"), required: true })
      : undefined;
    if (reasonRequired && !reason) return;
    const key = `${name}-${item.id}`;
    setError("");
    setNotice("");
    setBusy(key);
    try {
      await apiClient.workerBookingAction(item.id, name, {
        version: item.version,
        ...(reason ? { reason } : {}),
      });
      setNotice(t("updated"));
      await load();
    } catch (requestError) {
      setError(
        userError(requestError, t("networkFailed"), {
          CODE_LOCKED: t("locked"),
          BOOKING_CONFLICT: t("conflict"),
          VALIDATION_ERROR: t("validationFailed"),
          status: { 401: t("sessionExpired"), 429: t("rateLimited") },
        }),
      );
    } finally {
      setBusy("");
    }
  }
  async function code(event, item, name) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("code");
    setError("");
    setNotice("");
    setBusy(`${name}-${item.id}`);
    try {
      await apiClient.workerBookingAction(item.id, name, {
        version: item.version,
        code: value,
      });
      event.currentTarget.reset();
      setNotice(t("updated"));
      await load();
    } catch (requestError) {
      setError(
        userError(requestError, t("failed"), {
          CODE_LOCKED: t("locked"),
          CODE_INVALID: t("invalidCode"),
          BOOKING_CONFLICT: t("conflict"),
          fields: { code: t("invalidCode") },
          status: { 401: t("sessionExpired"), 429: t("rateLimited") },
        }),
      );
    } finally {
      setBusy("");
    }
  }
  if (!availability || !catalog || !inbox)
    return <p role="status">{error || t("loading")}</p>;
  return (
    <div className="account-stack">
      {(notice || error) && (
        <div
          role={error ? "alert" : "status"}
          className={error ? "form-alert" : "success-message"}
        >
          {error || notice}
        </div>
      )}
      <section className="account-section">
        <h2>{t("availabilityTitle")}</h2>
        <p className="field-hint">{t("timeZone")}</p>
        <form className="auth-form" onSubmit={save}>
          <label className="check-field">
            <input
              type="checkbox"
              name="acceptingRequests"
              defaultChecked={availability.acceptingRequests}
            />
            {t("acceptingRequests")}
          </label>
          <label className="form-field">
            <span>{t("primaryLocality")}</span>
            <select
              name="primaryLocalityId"
              defaultValue={availability.primaryLocalityId || ""}
              required
            >
              <option value="">{t("choose")}</option>
              {catalog.localities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name[locale]}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="choice-grid">
            <legend>{t("serviceLocalities")}</legend>
            {catalog.localities.map((item) => (
              <label className="check-field" key={item.id}>
                <input
                  type="checkbox"
                  name="serviceLocalityIds"
                  value={item.id}
                  defaultChecked={availability.serviceLocalityIds.includes(
                    item.id,
                  )}
                />
                {item.name[locale]}
              </label>
            ))}
          </fieldset>
          <fieldset className="choice-grid">
            <legend>{t("workingDays")}</legend>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <label className="check-field" key={day}>
                <input
                  type="checkbox"
                  name="workingDays"
                  value={day}
                  defaultChecked={availability.workingDays.includes(day)}
                />
                {t(`days.${day}`)}
              </label>
            ))}
          </fieldset>
          <div className="form-grid">
            <FormField
              type="time"
              name="startTime"
              id="booking-start-time"
              label={t("startTime")}
              defaultValue={availability.startTime}
              required
            />
            <FormField
              type="time"
              name="endTime"
              id="booking-end-time"
              label={t("endTime")}
              defaultValue={availability.endTime}
              required
            />
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              name="emergencyOptIn"
              defaultChecked={availability.emergencyOptIn}
            />
            {t("emergencyOptIn")}
          </label>
          <button
            disabled={Boolean(busy)}
            className={`primary-button ${busy === "availability" ? "button-busy" : ""}`}
          >
            {busy === "availability"
              ? t("savingAvailability")
              : t("saveAvailability")}
          </button>
        </form>
      </section>
      <section className="account-section">
        <h2>{t("offers")}</h2>
        {inbox.offers.length === 0 ? (
          <p className="empty-state">{t("noOffers")}</p>
        ) : (
          inbox.offers.map((item) => (
            <article className="application-card" key={item.id}>
              <h3>{item.request.snapshot.offeringTitle[locale]}</h3>
              <p>
                {item.request.snapshot.localityName[locale]} ·{" "}
                {item.request.requestType === "emergency"
                  ? t("emergency")
                  : new Date(item.request.preferredAt).toLocaleString(locale)}
              </p>
              <p>
                {t("expires")}:{" "}
                {new Date(item.expiresAt).toLocaleString(locale)}
              </p>
              <div className="form-actions">
                <button
                  disabled={Boolean(busy)}
                  className={`primary-button ${busy === `offer-${item.id}-accept` ? "button-busy" : ""}`}
                  onClick={() => offer(item.id, "accept", item.version)}
                >
                  {busy === `offer-${item.id}-accept`
                    ? t("accepting")
                    : t("accept")}
                </button>
                <button
                  disabled={Boolean(busy)}
                  className={`danger-button ${busy === `offer-${item.id}-reject` ? "button-busy" : ""}`}
                  onClick={() => offer(item.id, "reject", item.version)}
                >
                  {busy === `offer-${item.id}-reject`
                    ? t("rejecting")
                    : t("reject")}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
      <section className="account-section">
        <h2>{t("jobs")}</h2>
        {inbox.jobs.length === 0 ? (
          <p className="empty-state">{t("noJobs")}</p>
        ) : (
          inbox.jobs.map((item) => (
            <article className="application-card" key={item.id}>
              <h3>{item.snapshot.offeringTitle[locale]}</h3>
              <p>
                {t(`status.${item.status}`)} · {item.snapshot.addressLine},{" "}
                {item.snapshot.postalCode}
              </p>
              <p>{item.snapshot.problemDescription}</p>
              <div className="form-actions">
                {item.status === "assigned" && (
                  <button
                    disabled={Boolean(busy)}
                    className={`secondary-button ${busy === `en-route-${item.id}` ? "button-busy" : ""}`}
                    onClick={() => action(item, "en-route")}
                  >
                    {busy === `en-route-${item.id}`
                      ? t("markingEnRoute")
                      : t("markEnRoute")}
                  </button>
                )}
                {["assigned", "en_route"].includes(item.status) && (
                  <form
                    onSubmit={(event) => code(event, item, "start")}
                    className="form-actions"
                  >
                    <FormField
                      name="code"
                      id={`start-${item.id}`}
                      pattern="[0-9]{6}"
                      maxLength="6"
                      label={t("startCode")}
                      required
                    />
                    <button
                      disabled={Boolean(busy)}
                      className={`primary-button ${busy === `start-${item.id}` ? "button-busy" : ""}`}
                    >
                      {busy === `start-${item.id}`
                        ? t("startingWork")
                        : t("startWork")}
                    </button>
                  </form>
                )}
                {item.status === "in_progress" && (
                  <button
                    disabled={Boolean(busy)}
                    className={`primary-button ${busy === `finish-${item.id}` ? "button-busy" : ""}`}
                    onClick={() => action(item, "finish")}
                  >
                    {busy === `finish-${item.id}`
                      ? t("finishingWork")
                      : t("finishWork")}
                  </button>
                )}
                {item.status === "awaiting_completion" && (
                  <form
                    onSubmit={(event) => code(event, item, "complete")}
                    className="form-actions"
                  >
                    <FormField
                      name="code"
                      id={`complete-${item.id}`}
                      pattern="[0-9]{6}"
                      maxLength="6"
                      label={t("completionCode")}
                      required
                    />
                    <button
                      disabled={Boolean(busy)}
                      className={`primary-button ${busy === `complete-${item.id}` ? "button-busy" : ""}`}
                    >
                      {busy === `complete-${item.id}`
                        ? t("completingWork")
                        : t("completeWork")}
                    </button>
                  </form>
                )}
                {["assigned", "en_route"].includes(item.status) && (
                  <button
                    disabled={Boolean(busy)}
                    className={`danger-button ${busy === `withdraw-${item.id}` ? "button-busy" : ""}`}
                    onClick={() => action(item, "withdraw", true)}
                  >
                    {busy === `withdraw-${item.id}`
                      ? t("withdrawing")
                      : t("withdraw")}
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
