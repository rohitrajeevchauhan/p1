"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
import { userError } from "../../lib/user-error.js";

export function CooperativeWorkerPanel() {
  const t = useTranslations("WorkerAdmin");
  const [cooperatives, setCooperatives] = useState([]);
  const [selected, setSelected] = useState("");
  const [queue, setQueue] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState("");
  async function load(id = selected) {
    if (!id) return;
    try {
      const result = await apiClient.workerQueue(id);
      setQueue(result.data);
      setError("");
    } catch {
      setError(t("loadFailed"));
    }
  }
  useEffect(() => {
    apiClient
      .myCooperatives()
      .then((result) => {
        setCooperatives(result.data.cooperatives);
        if (result.data.cooperatives[0])
          setSelected(result.data.cooperatives[0].id);
      })
      .catch(() => {
        setDenied(true);
        setError(t("forbidden"));
      });
  }, [t]);
  useEffect(() => {
    if (selected)
      apiClient
        .workerQueue(selected)
        .then((result) => setQueue(result.data))
        .catch(() => setError(t("loadFailed")));
  }, [selected, t]);
  async function invite(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy("invite");
    try {
      await apiClient.inviteWorker(
        selected,
        new FormData(event.currentTarget).get("identifier"),
      );
      event.currentTarget.reset();
      setMessage(t("inviteAccepted"));
    } catch (requestError) {
      setError(
        userError(requestError, t("actionFailed"), {
          fields: { identifier: t("identifierInvalid") },
          status: { 401: t("sessionExpired"), 429: t("rateLimited") },
        }),
      );
    } finally {
      setBusy("");
    }
  }
  async function decide(kind, id, action, version) {
    const reason = await requestText({
      label: t("reasonPrompt"),
      required: true,
      minLength: 3,
      maxLength: 500,
    });
    if (!reason) return;
    const key = `${kind}-${id}-${action}`;
    setError("");
    setMessage("");
    setBusy(key);
    try {
      if (kind === "membership")
        await apiClient.decideMembership(selected, id, action, version, reason);
      else
        await apiClient.decideWorkerVerification(
          selected,
          id,
          action,
          version,
          reason,
        );
      setMessage(t("decisionSaved"));
      await load();
    } catch (requestError) {
      setError(
        userError(requestError, t("actionFailed"), {
          BOOKING_CONFLICT: t("recordChanged"),
          MARKETPLACE_CONFLICT: t("recordChanged"),
          VALIDATION_ERROR: t("reasonInvalid"),
          status: { 409: t("recordChanged") },
          fields: { reason: t("reasonInvalid") },
        }),
      );
      await load();
    } finally {
      setBusy("");
    }
  }
  async function viewDocument(kind, id) {
    const key = `document-${kind}-${id}`;
    setError("");
    setMessage("");
    setBusy(key);
    try {
      const result = await apiClient.accessWorkerDocument(kind, id);
      window.open(result.data.access.url, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      setError(
        userError(requestError, t("documentFailed"), {
          DOCUMENT_SCAN_PENDING: t("documentFailed"),
        }),
      );
    } finally {
      setBusy("");
    }
  }
  if (denied)
    return (
      <div className="form-alert" role="alert">
        {error}
      </div>
    );
  return (
    <div className="account-stack">
      {(message || error) && (
        <div
          className={error ? "form-alert" : "success-message"}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}
      <label className="form-field" htmlFor="worker-cooperative">
        <span>{t("cooperative")}</span>
        <select
          disabled={Boolean(busy)}
          id="worker-cooperative"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">{t("choose")}</option>
          {cooperatives.map((item) => (
            <option
              key={item.id}
              value={item.id}
              disabled={item.status !== "approved"}
            >
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <section className="account-section">
        <h2>{t("invite")}</h2>
        <p>{t("invitePrivacy")}</p>
        <form className="form-actions" onSubmit={invite}>
          <label className="form-field" htmlFor="worker-identifier">
            <span>{t("identifier")}</span>
            <input
              id="worker-identifier"
              name="identifier"
              required
              disabled={Boolean(busy)}
            />
          </label>
          <button
            className={`primary-button ${busy === "invite" ? "button-busy" : ""}`}
            disabled={!selected || Boolean(busy)}
          >
            {busy === "invite" ? t("sendingInvite") : t("sendInvite")}
          </button>
        </form>
      </section>
      <section className="account-section">
        <h2>{t("requests")}</h2>
        {queue?.memberships
          .filter(
            (item) => item.kind === "request" && item.status === "pending",
          )
          .map((item) => (
            <article className="application-card" key={item.id}>
              <strong>{item.worker.displayName}</strong>
              <p>{item.worker.email || item.worker.phone}</p>
              <div className="form-actions">
                <button
                  disabled={Boolean(busy)}
                  className={`primary-button ${busy === `membership-${item.id}-approve` ? "button-busy" : ""}`}
                  onClick={() =>
                    decide("membership", item.id, "approve", item.version)
                  }
                >
                  {busy === `membership-${item.id}-approve`
                    ? t("approving")
                    : t("approve")}
                </button>
                <button
                  disabled={Boolean(busy)}
                  className={`danger-button ${busy === `membership-${item.id}-reject` ? "button-busy" : ""}`}
                  onClick={() =>
                    decide("membership", item.id, "reject", item.version)
                  }
                >
                  {busy === `membership-${item.id}-reject`
                    ? t("rejecting")
                    : t("reject")}
                </button>
              </div>
            </article>
          ))}
        {queue &&
          !queue.memberships.some(
            (item) => item.kind === "request" && item.status === "pending",
          ) && <p>{t("emptyRequests")}</p>}
      </section>
      <section className="account-section">
        <h2>{t("verificationQueue")}</h2>
        {queue?.verifications
          .filter((item) => item.status === "submitted")
          .map((item) => (
            <article className="application-card" key={item.id}>
              <strong>{item.worker.displayName}</strong>
              {item.worker.profile && (
                <p>
                  {item.worker.profile.locality} ·{" "}
                  {item.worker.profile.yearsExperience} {t("years")}
                </p>
              )}
              <p>{item.worker.skills.join(", ")}</p>
              {item.worker.identityDocument && (
                <button
                  disabled={Boolean(busy)}
                  className={`secondary-button ${busy === `document-identity-${item.worker.identityDocument.id}` ? "button-busy" : ""}`}
                  onClick={() =>
                    viewDocument("identity", item.worker.identityDocument.id)
                  }
                >
                  {busy ===
                  `document-identity-${item.worker.identityDocument.id}`
                    ? t("openingDocument")
                    : `${t("viewIdentity")} · ${item.worker.identityDocument.lastFour}`}
                </button>
              )}
              {item.worker.certificates.map((certificate) => (
                <button
                  disabled={Boolean(busy)}
                  className={`secondary-button ${busy === `document-certificate-${certificate.id}` ? "button-busy" : ""}`}
                  key={certificate.id}
                  onClick={() => viewDocument("certificate", certificate.id)}
                >
                  {busy === `document-certificate-${certificate.id}`
                    ? t("openingDocument")
                    : `${t("viewCertificate")} · ${certificate.issuer}`}
                </button>
              ))}
              <div className="form-actions">
                <button
                  disabled={Boolean(busy)}
                  className={`primary-button ${busy === `verification-${item.id}-approve` ? "button-busy" : ""}`}
                  onClick={() =>
                    decide("verification", item.id, "approve", item.version)
                  }
                >
                  {busy === `verification-${item.id}-approve`
                    ? t("approving")
                    : t("approve")}
                </button>
                <button
                  disabled={Boolean(busy)}
                  className={`danger-button ${busy === `verification-${item.id}-reject` ? "button-busy" : ""}`}
                  onClick={() =>
                    decide("verification", item.id, "reject", item.version)
                  }
                >
                  {busy === `verification-${item.id}-reject`
                    ? t("rejecting")
                    : t("reject")}
                </button>
              </div>
            </article>
          ))}
        {queue &&
          !queue.verifications.some((item) => item.status === "submitted") && (
            <p>{t("emptyVerifications")}</p>
          )}
      </section>
    </div>
  );
}
