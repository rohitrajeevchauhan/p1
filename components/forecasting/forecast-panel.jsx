"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { categories, localities } from "../../lib/catalog.js";
import { forecastQuery } from "../../lib/forecast-query.js";

const date = (value, locale) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
  }).format(new Date(value));

export function ForecastPanel({ oversight, organizationId, federationId }) {
  const t = useTranslations("Forecast"),
    marketplace = useTranslations("Marketplace"),
    locale = useLocale();
  const [mode, setMode] = useState("live"),
    [category, setCategory] = useState(""),
    [locality, setLocality] = useState("");
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const query = forecastQuery({
        mode,
        category,
        locality,
        organizationId: oversight ? organizationId : "",
        federationId: oversight ? federationId : "",
      });
      const response = oversight
        ? await apiClient.oversightForecast(query)
        : await apiClient.cooperativeForecast(organizationId, query);
      setData(response.data);
    } catch {
      setError(t("failed"));
    }
  }, [category, federationId, locality, mode, organizationId, oversight, t]);
  useEffect(() => {
    if (organizationId || oversight) Promise.resolve().then(load);
  }, [load, organizationId, oversight]);

  return (
    <section
      className="operations-section forecast-panel"
      aria-labelledby="forecast-heading"
    >
      <div className="operations-section-heading">
        <div>
          <h2 id="forecast-heading">{t("title")}</h2>
          <p>{t("description")}</p>
        </div>
        <div className="forecast-filters">
          <label>
            {t("source")}
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="live">{t("live")}</option>
              <option value="synthetic_demo">{t("synthetic")}</option>
            </select>
          </label>
          <label>
            {t("category")}
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">{t("allCategories")}</option>
              {categories.map((item) => (
                <option value={item} key={item}>
                  {marketplace(`categories.${item}.name`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("locality")}
            <select
              value={locality}
              onChange={(event) => setLocality(event.target.value)}
            >
              <option value="">{t("allLocalities")}</option>
              {localities.map((item) => (
                <option value={item} key={item}>
                  {item.replaceAll("-", " ")}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={load}>
            {t("apply")}
          </button>
        </div>
      </div>
      {error ? (
        <p className="form-alert" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p role="status">{t("loading")}</p>
      ) : (
        <>
          <p
            className={
              data.source === "synthetic_demo"
                ? "forecast-demo-label"
                : "field-hint"
            }
          >
            {data.source === "synthetic_demo"
              ? t("syntheticWarning")
              : t("liveWarning")}
          </p>
          <p className="field-hint">
            {t("generated", { date: date(data.generatedAt, locale) })}
          </p>
          <div className="forecast-grid">
            {data.series.map((series) => (
              <article className="finance-card" key={series.key}>
                <h3>
                  {series.label?.[locale] ?? t("aggregate")}
                  {series.localityLabel
                    ? ` · ${series.localityLabel[locale]}`
                    : ""}
                </h3>
                {!series.available ? (
                  <>
                    <p>{t(`unavailable.${series.reason}`)}</p>
                    <p>
                      {t("history", {
                        weeks: series.history.completeWeeks,
                        requests: series.history.requestCount,
                      })}
                    </p>
                    {data.source === "actual" && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setMode("synthetic_demo")}
                      >
                        {t("viewDemo")}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p>{t(`method.${series.selectedMethod}`)}</p>
                    <p>
                      {t("metrics", {
                        mae: series.validation.mae,
                        wape: series.validation.wape ?? "—",
                        points: series.validation.points,
                      })}
                    </p>
                    <div className="operations-table-wrap">
                      <table className="operations-table">
                        <thead>
                          <tr>
                            <th>{t("week")}</th>
                            <th>{t("prediction")}</th>
                            <th>{t("range")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {series.predictions.map((prediction) => (
                            <tr key={prediction.weekStart}>
                              <td>{date(prediction.weekStart, locale)}</td>
                              <td>{prediction.value}</td>
                              <td>
                                {prediction.lower}–{prediction.upper}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
