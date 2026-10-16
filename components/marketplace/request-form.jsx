"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import {
  createRequestSubmission,
  prepareRequestSubmission,
  recordRequestFailure,
} from "../../lib/request-idempotency.js";
import { userError } from "../../lib/user-error.js";
import { FormField } from "../auth/form-field.jsx";

function requestPayload(form, offeringId, requestType) {
  return {
    offeringId,
    localityId: form.get("localityId"),
    requestType,
    ...(requestType === "scheduled"
      ? { preferredAt: new Date(form.get("preferredAt")).toISOString() }
      : {}),
    addressLine: form.get("addressLine"),
    postalCode: form.get("postalCode"),
    landmark: form.get("landmark") || undefined,
    problemDescription: form.get("problemDescription"),
  };
}

export function ServiceRequestForm({ offeringId }) {
  const locale = useLocale();
  const t = useTranslations("ServiceRequest");
  const [offering, setOffering] = useState(null);
  const [user, setUser] = useState(undefined);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("scheduled");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const [loadError, setLoadError] = useState("");
  const inFlight = useRef(false);
  const submission = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.discoverOfferings(),
      apiClient
        .me()
        .catch((error) =>
          error?.status === 401 ? null : Promise.reject(error),
        ),
    ])
      .then(([items, me]) => {
        if (!active) return;
        setOffering(
          items.data.offerings.find((item) => item.id === offeringId) ?? false,
        );
        setUser(me?.data.user ?? null);
      })
      .catch(() => {
        if (active) setLoadError(t("loadFailed"));
      });
    return () => {
      active = false;
    };
  }, [offeringId, t]);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || created) return;
    const payload = requestPayload(
      new FormData(event.currentTarget),
      offeringId,
      type,
    );
    const fingerprint = JSON.stringify(payload);
    if (!submission.current)
      submission.current = createRequestSubmission(() => crypto.randomUUID());
    const prepared = prepareRequestSubmission(
      submission.current,
      fingerprint,
      () => crypto.randomUUID(),
    );
    submission.current = prepared.state;
    if (!prepared.ready) {
      setAmbiguous(true);
      setMessage(t("ambiguous"));
      return;
    }
    inFlight.current = true;
    setAmbiguous(false);
    setSubmitting(true);
    setMessage("");
    try {
      const result = await apiClient.createServiceRequest({
        ...payload,
        idempotencyKey: submission.current.key,
      });
      setCreated(true);
      setMessage(`${t("created")} ${result.data.request.id}`);
    } catch (error) {
      submission.current = recordRequestFailure(submission.current, error);
      const uncertain = submission.current.outcome === "ambiguous";
      setAmbiguous(uncertain);
      setMessage(
        uncertain
          ? t("ambiguous")
          : userError(error, t("networkFailed"), {
              INVALID_SCHEDULE: t("invalidSchedule"),
              OFFERING_UNAVAILABLE: t("offeringUnavailable"),
              AUTHENTICATION_FAILED: t("sessionExpired"),
              TOO_MANY_REQUESTS: t("rateLimited"),
              VALIDATION_ERROR: t("validationFailed"),
              status: { 401: t("sessionExpired"), 429: t("rateLimited") },
              fields: {
                localityId: t("fieldLocality"),
                preferredAt: t("fieldSchedule"),
                addressLine: t("fieldAddress"),
                postalCode: t("fieldPostalCode"),
                landmark: t("fieldLandmark"),
                problemDescription: t("fieldProblem"),
                requestType: t("fieldType"),
              },
            }),
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (loadError)
    return (
      <p className="form-alert" role="alert">
        {loadError}
      </p>
    );
  if (offering === null || user === undefined)
    return <p role="status">{t("loading")}</p>;
  if (!offering) return <p>{t("unavailable")}</p>;
  if (!user) {
    const returnTo = `/${locale}/services/request/${offeringId}`;
    return (
      <div className="empty-state">
        <p>{t("signInRequired")}</p>
        <Link
          className="primary-button"
          href={`/${locale}/login?returnTo=${encodeURIComponent(returnTo)}`}
        >
          {t("signIn")}
        </Link>
        <Link
          href={`/${locale}/register?returnTo=${encodeURIComponent(returnTo)}`}
        >
          {t("createAccount")}
        </Link>
      </div>
    );
  }
  const controlsDisabled = created || submitting;

  function startAnother() {
    submission.current = createRequestSubmission(() => crypto.randomUUID());
    setCreated(false);
    setAmbiguous(false);
    setMessage("");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {message && (
        <div
          className={created ? "success-message" : "form-alert"}
          role={created ? "status" : "alert"}
        >
          {message}
        </div>
      )}
      {ambiguous && (
        <Link href={`/${locale}/requests`}>{t("reviewRequests")}</Link>
      )}
      <p>
        {offering.title[locale]} · ₹{offering.estimateMin}–₹
        {offering.estimateMax}
      </p>
      <p className="field-hint">{offering.disclaimer[locale]}</p>
      <fieldset className="request-type-options">
        <legend>{t("type")}</legend>
        <label className="request-type-option">
          <input
            type="radio"
            value="scheduled"
            checked={type === "scheduled"}
            onChange={() => {
              setMessage("");
              setAmbiguous(false);
              setType("scheduled");
            }}
            disabled={created || submitting}
          />{" "}
          <span>{t("scheduled")}</span>
        </label>
        <label className="request-type-option">
          <input
            type="radio"
            value="emergency"
            checked={type === "emergency"}
            onChange={() => {
              setMessage("");
              setAmbiguous(false);
              setType("emergency");
            }}
            disabled={created || submitting}
          />{" "}
          <span>{t("emergency")}</span>
        </label>
      </fieldset>
      {type === "emergency" && (
        <p className="field-hint">{t("emergencyHint")}</p>
      )}
      <label className="form-field">
        <span>{t("locality")}</span>
        <select name="localityId" required disabled={controlsDisabled}>
          {offering.localities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name[locale]}
            </option>
          ))}
        </select>
      </label>
      <FormField
        name="addressLine"
        id="request-address"
        label={t("address")}
        required
        disabled={controlsDisabled}
      />
      <FormField
        name="postalCode"
        id="request-postal"
        label={t("postalCode")}
        pattern="[0-9]{6}"
        required
        disabled={controlsDisabled}
      />
      <FormField
        name="landmark"
        id="request-landmark"
        label={t("landmark")}
        disabled={controlsDisabled}
      />
      {type === "scheduled" && (
        <FormField
          name="preferredAt"
          id="request-time"
          type="datetime-local"
          label={t("preferredAt")}
          required
          disabled={controlsDisabled}
        />
      )}
      <FormField
        name="problemDescription"
        id="request-problem"
        multiline
        rows="5"
        label={t("problem")}
        required
        disabled={controlsDisabled}
      />
      <button
        className={`primary-button ${submitting ? "button-busy" : ""}`}
        disabled={submitting || created || ambiguous}
      >
        {submitting
          ? t("submitting")
          : created
            ? t("submitted")
            : type === "emergency"
              ? t("requestEarliest")
              : t("submit")}
      </button>
      {(created || ambiguous) && (
        <button
          className="secondary-button"
          type="button"
          onClick={startAnother}
        >
          {t("startAnother")}
        </button>
      )}
    </form>
  );
}
