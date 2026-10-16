"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { operationsScopeQuery } from "../../lib/operations-query.js";
import { ForecastPanel } from "../forecasting/forecast-panel.jsx";

const periods = ["7d", "30d", "90d", "all"];
const money = (paise, locale) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "INR" }).format(
    (paise ?? 0) / 100,
  );
const periodDate = (value, locale) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
  }).format(new Date(value));
const localizedAuditActions = new Set([
  "worker_membership.approved",
  "worker_membership.rejected",
  "worker_verification.approved",
  "worker_verification.rejected",
  "worker_verification.revoked",
  "booking.allocation_retried",
  "booking.allocation_searched",
  "service_request.created",
  "booking.offer_accepted",
  "booking.offer_rejected",
  "booking.start_confirmed",
  "booking.completion_confirmed",
]);
const humanizeAuditAction = (value) =>
  value
    .split(/[._]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

function Metric({ label, value, detail }) {
  return (
    <div className="operations-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function Rate({ value, t }) {
  return value.value === null
    ? t("undefinedRate")
    : `${value.value}% (${t("rateDenominator", { numerator: value.numerator, denominator: value.denominator })})`;
}

function AlertLink({ item, oversight, locale, t }) {
  const target = oversight
    ? item.entityType === "complaint"
      ? `/${locale}/admin/finance-oversight`
      : item.entityType === "verification"
        ? `/${locale}/admin/worker-audits`
        : `/${locale}/admin/booking-oversight`
    : item.entityType === "complaint"
      ? `/${locale}/admin/finance`
      : item.entityType === "booking"
        ? `/${locale}/admin/bookings`
        : `/${locale}/admin/workers`;
  return (
    <article className={`operations-alert priority-${item.priority}`}>
      <div>
        <strong>{t(`alerts.${item.reasonCode}`)}</strong>
        <p>
          {t("alertAge", { minutes: item.ageMinutes })} ·{" "}
          {t(`priority.${item.priority}`)}
        </p>
        {item.serviceCategory?.[locale] && (
          <p>
            {item.serviceCategory[locale]} · {item.locality?.[locale]}
          </p>
        )}
      </div>
      <Link className="secondary-button" href={target}>
        {t("openQueue")}
      </Link>
    </article>
  );
}

function AuditActivity({ organizationId, federationId, oversight, period }) {
  const t = useTranslations("Operations");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const query = operationsScopeQuery({
      period,
      page,
      limit: 10,
      action,
      targetType,
      ...(oversight ? { organizationId, federationId } : {}),
    });
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    try {
      const result = oversight
        ? await apiClient.operationsAudit(query)
        : await apiClient.cooperativeAudit(organizationId, query);
      if (requestSequence.current === sequence) setData(result.data);
    } catch {
      if (requestSequence.current === sequence) setError(t("auditLoadFailed"));
    }
  }, [
    action,
    federationId,
    organizationId,
    oversight,
    page,
    period,
    t,
    targetType,
  ]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const beginChange = (callback) => {
    setData(null);
    setError("");
    callback();
  };
  return (
    <section
      className="operations-section"
      aria-labelledby="audit-heading"
      aria-busy={!data && !error}
    >
      <div className="operations-section-heading">
        <div>
          <h2 id="audit-heading">{t("auditTitle")}</h2>
          <p>{t("auditSafeHint")}</p>
          {data?.period && (
            <p className="field-hint">
              {data.period.start
                ? t("auditExactPeriod", {
                    start: periodDate(data.period.start, locale),
                    end: periodDate(data.period.end, locale),
                  })
                : t("auditAllTime", {
                    end: periodDate(data.period.end, locale),
                  })}
            </p>
          )}
        </div>
        <div className="audit-filters">
          <label>
            {t("actionFilter")}
            <input
              disabled={!data}
              value={action}
              onChange={(event) =>
                beginChange(() => {
                  setAction(event.target.value);
                  setPage(1);
                })
              }
            />
          </label>
          <label>
            {t("targetFilter")}
            <input
              disabled={!data}
              value={targetType}
              onChange={(event) =>
                beginChange(() => {
                  setTargetType(event.target.value);
                  setPage(1);
                })
              }
            />
          </label>
        </div>
      </div>
      {error ? (
        <p className="form-alert" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p role="status">{t("loading")}</p>
      ) : data.items.length ? (
        <div className="operations-table-wrap">
          <table className="operations-table">
            <thead>
              <tr>
                <th>{t("when")}</th>
                <th>{t("action")}</th>
                <th>{t("organization")}</th>
                <th>{t("actor")}</th>
                <th>{t("target")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.occurredAt).toLocaleString(locale)}</td>
                  <td>
                    {localizedAuditActions.has(item.action)
                      ? t(`auditActions.${item.action}`)
                      : t("auditActionUnknown", {
                          action: humanizeAuditAction(item.action),
                        })}
                  </td>
                  <td>{item.organization?.name ?? "—"}</td>
                  <td>{item.actorLabel ?? t("automatic")}</td>
                  <td>{item.targetType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">{t("noAudit")}</p>
      )}
      <div className="pagination">
        <button
          className="secondary-button"
          type="button"
          disabled={!data || page <= 1}
          onClick={() => beginChange(() => setPage((value) => value - 1))}
        >
          {t("previous")}
        </button>
        <span>
          {t("page", {
            page: data?.pagination.page ?? page,
            pages: data?.pagination.pages ?? 0,
          })}
        </span>
        <button
          className="secondary-button"
          type="button"
          disabled={!data || page >= data.pagination.pages}
          onClick={() => beginChange(() => setPage((value) => value + 1))}
        >
          {t("next")}
        </button>
      </div>
    </section>
  );
}

export function OperationsDashboard({ oversight = false }) {
  const locale = useLocale();
  const t = useTranslations("Operations");
  const bookingT = useTranslations("Booking");
  const financeT = useTranslations("Finance");
  const [period, setPeriod] = useState("30d");
  const [cooperatives, setCooperatives] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedFederation, setSelectedFederation] = useState("");
  const [selectedOversightCooperative, setSelectedOversightCooperative] =
    useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(
    async (
      nextPeriod = period,
      cooperativeId = oversight ? selectedOversightCooperative : selected,
      federationId = selectedFederation,
    ) => {
      setError("");
      setData(null);
      try {
        const result = oversight
          ? await apiClient.operationsOversight(
              operationsScopeQuery({
                period: nextPeriod,
                federationId,
                organizationId: cooperativeId,
              }),
            )
          : await apiClient.cooperativeOperations(cooperativeId, nextPeriod);
        setData(result.data);
      } catch {
        setError(t("loadFailed"));
      }
    },
    [
      oversight,
      period,
      selected,
      selectedFederation,
      selectedOversightCooperative,
      t,
    ],
  );

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(async () => {
        if (oversight) return apiClient.operationsOversight("period=30d");
        const result = await apiClient.myCooperatives();
        if (!active) return null;
        const values = result.data.cooperatives;
        setCooperatives(values);
        setSelected(values[0]?.id ?? "");
        if (!values[0]) return { data: { emptyScope: true } };
        return apiClient.cooperativeOperations(values[0].id, "30d");
      })
      .then((result) => {
        if (active && result) setData(result.data);
      })
      .catch(() => active && setError(t("loadFailed")));
    return () => {
      active = false;
    };
  }, [oversight, t]);

  function changePeriod(value) {
    setPeriod(value);
    load(value);
  }
  function changeCooperative(value) {
    setSelected(value);
    load(period, value, "");
  }
  function changeOversightFederation(value) {
    setSelectedFederation(value);
    setSelectedOversightCooperative("");
    load(period, "", value);
  }
  function changeOversightCooperative(value) {
    setSelectedOversightCooperative(value);
    load(period, value, selectedFederation);
  }
  function resetOversightScope() {
    setSelectedFederation("");
    setSelectedOversightCooperative("");
    load(period, "", "");
  }

  if (error)
    return (
      <p className="form-alert" role="alert">
        {error}
      </p>
    );
  if (!data) return <p role="status">{t("loading")}</p>;
  if (data.emptyScope) return <p className="empty-state">{t("noScope")}</p>;

  const current = data.current,
    activity = data.activity,
    finance = data.finance;
  return (
    <div className="operations-stack">
      <section className="operations-toolbar" aria-label={t("filters")}>
        <label>
          {t("period")}
          <select
            value={period}
            onChange={(event) => changePeriod(event.target.value)}
          >
            {periods.map((item) => (
              <option key={item} value={item}>
                {t(`periods.${item}`)}
              </option>
            ))}
          </select>
        </label>
        {!oversight && cooperatives.length > 1 && (
          <label>
            {t("cooperative")}
            <select
              value={selected}
              onChange={(event) => changeCooperative(event.target.value)}
            >
              {cooperatives.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {oversight && (
          <>
            <label>
              {t("federationFilter")}
              <select
                value={selectedFederation}
                onChange={(event) =>
                  changeOversightFederation(event.target.value)
                }
              >
                <option value="">{t("allAuthorizedFederations")}</option>
                {data.filters.federations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("cooperativeFilter")}
              <select
                value={selectedOversightCooperative}
                onChange={(event) =>
                  changeOversightCooperative(event.target.value)
                }
              >
                <option value="">{t("allAuthorizedCooperatives")}</option>
                {data.filters.cooperatives
                  .filter(
                    (item) =>
                      !selectedFederation ||
                      item.federationId === selectedFederation,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="secondary-button"
              type="button"
              disabled={!selectedFederation && !selectedOversightCooperative}
              onClick={resetOversightScope}
            >
              {t("resetScope")}
            </button>
          </>
        )}
        <p>
          {data.period.start
            ? t("exactPeriod", {
                start: periodDate(data.period.start, locale),
                end: periodDate(data.period.end, locale),
              })
            : t("allTimePeriod", { end: periodDate(data.period.end, locale) })}
        </p>
      </section>

      {oversight && <p className="operations-read-only">{t("readOnly")}</p>}
      <section className="operations-section">
        <h2>{t("currentQueues")}</h2>
        <div className="operations-metrics">
          <Metric
            label={t("cooperatives")}
            value={data.scope.cooperativeCount}
          />
          {oversight && (
            <Metric
              label={t("federations")}
              value={data.oversight.federationCount}
            />
          )}
          <Metric label={t("activeWorkers")} value={current.activeWorkers} />
          <Metric
            label={t("pendingMemberships")}
            value={
              current.pendingMembershipRequests +
              current.pendingMembershipInvitations
            }
            detail={`${current.pendingMembershipRequests} / ${current.pendingMembershipInvitations}`}
          />
          <Metric
            label={t("pendingVerifications")}
            value={current.pendingVerificationCases}
          />
          <Metric
            label={t("activeOfferings")}
            value={current.activeOfferings}
          />
          <Metric
            label={t("openComplaints")}
            value={current.openComplaints.total}
          />
        </div>
        <nav className="operations-links" aria-label={t("authorizedQueues")}>
          <Link
            href={`/${locale}/${oversight ? "admin/worker-audits" : "admin/workers"}`}
          >
            {t("workforceQueue")}
          </Link>
          <Link
            href={`/${locale}/${oversight ? "admin/booking-oversight" : "admin/bookings"}`}
          >
            {t("bookingQueue")}
          </Link>
          <Link
            href={`/${locale}/${oversight ? "admin/finance-oversight" : "admin/finance"}`}
          >
            {t("financeQueue")}
          </Link>
          {!oversight && (
            <Link href={`/${locale}/admin/offerings`}>
              {t("offeringQueue")}
            </Link>
          )}
        </nav>
      </section>
      <section className="operations-section">
        <h2>{t("periodActivity")}</h2>
        <div className="operations-metrics">
          <Metric
            label={t("requestsCreated")}
            value={activity.requestsCreated}
          />
          <Metric
            label={t("completedEvents")}
            value={activity.periodEvents.completed}
          />
          <Metric
            label={t("cancellationEvents")}
            value={activity.periodEvents.cancelled}
          />
          <Metric
            label={t("noShowEvents")}
            value={activity.periodEvents.cancelledNoShow}
          />
          <Metric
            label={t("completionRate")}
            value={
              <Rate
                value={activity.createdRequestCohort.completionRate}
                t={t}
              />
            }
          />
          <Metric
            label={t("cancellationRate")}
            value={
              <Rate
                value={activity.createdRequestCohort.cancellationRate}
                t={t}
              />
            }
          />
          <Metric
            label={t("reviews")}
            value={activity.reviews.count}
            detail={
              activity.reviews.average === null
                ? t("noAverage")
                : t("average", { value: activity.reviews.average })
            }
          />
        </div>
        <p className="field-hint">{t("eventCohortHint")}</p>
        <div className="operations-breakdowns">
          <article>
            <h3>{t("bookingFunnel")}</h3>
            <dl>
              {Object.entries(activity.requestCurrentStatusCounts).map(
                ([status, count]) => (
                  <div key={status}>
                    <dt>{bookingT(`status.${status}`)}</dt>
                    <dd>{count}</dd>
                  </div>
                ),
              )}
            </dl>
          </article>
          <article>
            <h3>{t("complaintBreakdown")}</h3>
            <dl>
              {Object.entries(current.openComplaints.byStatus).map(
                ([status, count]) => (
                  <div key={status}>
                    <dt>{financeT(`complaintStatus.${status}`)}</dt>
                    <dd>{count}</dd>
                  </div>
                ),
              )}
              {Object.entries(current.openComplaints.byCategory).map(
                ([category, count]) => (
                  <div key={category}>
                    <dt>{financeT(`categories.${category}`)}</dt>
                    <dd>{count}</dd>
                  </div>
                ),
              )}
            </dl>
          </article>
        </div>
      </section>
      <section className="operations-section">
        <h2>{t("finance")}</h2>
        <div className="operations-metrics">
          <Metric label={t("payments")} value={finance.simulatedPaymentCount} />
          <Metric
            label={t("paymentValue")}
            value={money(finance.simulatedPaymentValuePaise, locale)}
          />
          <Metric
            label={t("workerAllocation")}
            value={money(finance.workerAllocationPaise, locale)}
          />
          <Metric
            label={t("cooperativeAllocation")}
            value={money(finance.cooperativeAllocationPaise, locale)}
          />
          <Metric
            label={t("welfareAllocation")}
            value={money(finance.welfareAllocationPaise, locale)}
          />
          <Metric
            label={t("reconciliation")}
            value={t(`reconciliationStatus.${finance.reconciliation.status}`)}
            detail={t("reconciliationCounts", {
              checked: finance.reconciliation.checkedPaymentCount,
              mismatched: finance.reconciliation.mismatchedPaymentCount,
            })}
          />
        </div>
      </section>
      <section className="operations-section">
        <h2>{t("exceptions")}</h2>
        <p>{t("computedHint")}</p>
        <div className="operations-alerts">
          {data.exceptions.length ? (
            data.exceptions.map((item) => (
              <AlertLink
                key={`${item.reasonCode}-${item.entityId}`}
                item={item}
                oversight={oversight}
                locale={locale}
                t={t}
              />
            ))
          ) : (
            <p className="empty-state">{t("noExceptions")}</p>
          )}
        </div>
      </section>
      <ForecastPanel
        oversight={oversight}
        organizationId={oversight ? selectedOversightCooperative : selected}
        federationId={oversight ? selectedFederation : ""}
      />
      {oversight && (
        <section className="operations-section">
          <h2>{t("comparison")}</h2>
          <div className="operations-comparison">
            {data.comparisons.map((item) => (
              <article key={item.cooperative.id} className="finance-card">
                <h3>{item.cooperative.name}</h3>
                <p>
                  {t("workersAndRequests", {
                    workers: item.metrics.current.activeWorkers,
                    requests: item.metrics.activity.requestsCreated,
                  })}
                </p>
                <p>
                  {t("paymentsAndExceptions", {
                    payments: item.metrics.finance.simulatedPaymentCount,
                    exceptions: item.metrics.exceptions.length,
                  })}
                </p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    changeOversightCooperative(item.cooperative.id)
                  }
                >
                  {t("viewCooperative")}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <AuditActivity
        organizationId={oversight ? selectedOversightCooperative : selected}
        federationId={oversight ? selectedFederation : ""}
        oversight={oversight}
        period={period}
      />
    </div>
  );
}
