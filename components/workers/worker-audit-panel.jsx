"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
import { userError } from "../../lib/user-error.js";

function AuditCase({ item, t, busy, revoke }) {
  const key = `revoke-${item.id}`;
  return (
    <article className="application-card">
      <h3>{item.workerName}</h3>
      <p>
        {item.cooperativeName} · {t(`status.${item.status}`)}
      </p>
      {item.decisionReason && <p>{item.decisionReason}</p>}
      {item.current && (
        <button
          className={`danger-button ${busy === key ? "button-busy" : ""}`}
          disabled={Boolean(busy)}
          onClick={() => revoke(item)}
        >
          {busy === key ? t("revoking") : t("revoke")}
        </button>
      )}
    </article>
  );
}

export function WorkerAuditPanel() {
  const t = useTranslations("WorkerAudit");
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  async function load() {
    try {
      const result = await apiClient.workerAudits();
      setData(result.data);
      setError("");
    } catch (requestError) {
      setError(userError(requestError, t("forbidden")));
    }
  }
  useEffect(() => {
    let active = true;
    apiClient
      .workerAudits()
      .then((result) => active && setData(result.data))
      .catch(
        (requestError) =>
          active && setError(userError(requestError, t("forbidden"))),
      );
    return () => {
      active = false;
    };
  }, [t]);
  async function revoke(item) {
    const reason = await requestText({
      label: t("reasonPrompt"),
      required: true,
      minLength: 3,
      maxLength: 500,
    });
    if (!reason) return;
    const key = `revoke-${item.id}`;
    setError("");
    setNotice("");
    setBusy(key);
    try {
      await apiClient.revokeWorkerVerification(item.id, item.version, reason);
      setNotice(t("revoked"));
      await load();
    } catch (requestError) {
      setError(
        userError(requestError, t("failed"), {
          VALIDATION_ERROR: t("reasonInvalid"),
          status: {
            401: t("sessionExpired"),
            403: t("forbidden"),
            409: t("recordChanged"),
          },
          fields: { reason: t("reasonInvalid") },
        }),
      );
      await load();
    } finally {
      setBusy("");
    }
  }
  if (!data && !error) return <p role="status">{t("loading")}</p>;
  const active =
    data?.activeCases ?? data?.cases?.filter((item) => item.current) ?? [];
  const history =
    data?.historyCases ?? data?.cases?.filter((item) => !item.current) ?? [];
  return (
    <div className="account-stack">
      {(notice || error) && (
        <div
          className={error ? "form-alert" : "success-message"}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </div>
      )}
      <section
        className="account-section"
        aria-labelledby="active-worker-audits"
      >
        <h2 id="active-worker-audits">{t("activeTitle")}</h2>
        <p className="field-hint">{t("activeDescription")}</p>
        {active.length ? (
          active.map((item) => (
            <AuditCase
              key={item.id}
              item={item}
              t={t}
              busy={busy}
              revoke={revoke}
            />
          ))
        ) : (
          <p className="empty-state">{t("emptyActive")}</p>
        )}
      </section>
      <section
        className="account-section"
        aria-labelledby="worker-audit-history"
      >
        <h2 id="worker-audit-history">{t("historyTitle")}</h2>
        <p className="field-hint">{t("historyDescription")}</p>
        {history.length ? (
          history.map((item) => (
            <AuditCase
              key={item.id}
              item={item}
              t={t}
              busy={busy}
              revoke={revoke}
            />
          ))
        ) : (
          <p className="empty-state">{t("emptyHistory")}</p>
        )}
      </section>
    </div>
  );
}
