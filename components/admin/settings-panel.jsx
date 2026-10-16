"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { apiClient } from "../../lib/api-client.js";

const PASSWORD_KEY = "password_minimum_length";
const AUTO_APPROVAL_KEY = "organization_auto_approval";
const FINANCIAL_KEY = "financial_distribution_bps";

export function SettingsPanel() {
  const locale = useLocale();
  const translations = useTranslations("AdminSettings");
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [state, setState] = useState({
    type: "loading",
    message: translations("loading"),
  });
  const [saving, setSaving] = useState(false);
  const forbiddenMessage = translations("forbidden");
  const loadFailedMessage = translations("loadFailed");

  useEffect(() => {
    let active = true;
    apiClient
      .me()
      .then((payload) => {
        if (!payload.data.user.roles.includes("system_admin")) {
          if (active)
            setState({ type: "forbidden", message: forbiddenMessage });
          return null;
        }
        return apiClient.adminSettings();
      })
      .then((payload) => {
        if (!payload || !active) return;
        const values = Object.fromEntries(
          payload.data.settings.map((setting) => [setting.key, setting]),
        );
        setSettings(values);
        setDraft({
          [PASSWORD_KEY]: values[PASSWORD_KEY].value,
          [AUTO_APPROVAL_KEY]: values[AUTO_APPROVAL_KEY].value,
          [FINANCIAL_KEY]: { ...values[FINANCIAL_KEY].value },
        });
        setState({ type: "ready", message: "" });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          type: error.status === 403 ? "forbidden" : "error",
          message: error.status === 403 ? forbiddenMessage : loadFailedMessage,
        });
      });
    return () => {
      active = false;
    };
  }, [forbiddenMessage, loadFailedMessage]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setState({ type: "ready", message: "" });
    try {
      const changedKeys = [
        PASSWORD_KEY,
        AUTO_APPROVAL_KEY,
        FINANCIAL_KEY,
      ].filter(
        (key) =>
          JSON.stringify(draft[key]) !== JSON.stringify(settings[key].value),
      );
      const nextSettings = { ...settings };
      for (const key of changedKeys) {
        const payload = await apiClient.updateAdminSetting(key, {
          value: draft[key],
          version: nextSettings[key].version,
        });
        nextSettings[key] = payload.data.setting;
      }
      setSettings(nextSettings);
      setState({
        type: "success",
        message: translations(changedKeys.length ? "saved" : "unchanged"),
      });
    } catch (error) {
      const message =
        error.code === "SETTING_VERSION_CONFLICT"
          ? translations("conflict")
          : error.status === 403
            ? translations("forbidden")
            : error.status === 400
              ? translations("validation")
              : translations("saveFailed");
      setState({ type: error.status === 403 ? "forbidden" : "error", message });
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div
        className={state.type === "forbidden" ? "form-alert" : "field-hint"}
        role="status"
      >
        <p>{state.message}</p>
        {state.type === "forbidden" && (
          <Link href={`/${locale}/account`}>
            {translations("backToAccount")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <form className="auth-form admin-settings-form" onSubmit={save}>
      {state.message && (
        <div
          className={
            state.type === "success" ? "success-message" : "form-alert"
          }
          role={state.type === "success" ? "status" : "alert"}
        >
          {state.message}
        </div>
      )}
      <FormNumberSetting
        id="passwordMinimum"
        label={translations("passwordMinimum")}
        hint={translations("passwordMinimumHint")}
        value={draft[PASSWORD_KEY]}
        min={6}
        max={64}
        onChange={(value) =>
          setDraft((current) => ({ ...current, [PASSWORD_KEY]: value }))
        }
      />
      <label className="settings-toggle">
        <span>
          <strong>{translations("autoApproval")}</strong>
          <small>{translations("autoApprovalHint")}</small>
        </span>
        <input
          type="checkbox"
          checked={draft[AUTO_APPROVAL_KEY]}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              [AUTO_APPROVAL_KEY]: event.target.checked,
            }))
          }
        />
      </label>
      <fieldset className="settings-fieldset">
        <legend>{translations("financialDistribution")}</legend>
        <p className="field-hint">
          {translations("financialDistributionHint")}
        </p>
        <div className="form-grid distribution-settings">
          {[
            ["workerBps", "workerDistribution"],
            ["cooperativeBps", "cooperativeDistribution"],
            ["welfareBps", "welfareDistribution"],
          ].map(([key, label]) => (
            <FormNumberSetting
              key={key}
              id={key}
              label={translations(label)}
              hint={translations("basisPointsHint", {
                percentage: draft[FINANCIAL_KEY][key] / 100,
              })}
              value={draft[FINANCIAL_KEY][key]}
              min={0}
              max={10000}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  [FINANCIAL_KEY]: { ...current[FINANCIAL_KEY], [key]: value },
                }))
              }
            />
          ))}
        </div>
        <p
          className={
            Object.values(draft[FINANCIAL_KEY]).reduce(
              (sum, value) => sum + value,
              0,
            ) === 10000
              ? "field-hint"
              : "form-alert"
          }
          role="status"
        >
          {translations("basisPointTotal", {
            total: Object.values(draft[FINANCIAL_KEY]).reduce(
              (sum, value) => sum + value,
              0,
            ),
          })}
        </p>
      </fieldset>
      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? translations("saving") : translations("save")}
      </button>
    </form>
  );
}

function FormNumberSetting({ id, label, hint, value, min, max, onChange }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step="1"
        value={value}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(Number(event.target.value))}
        required
      />
      <span className="field-hint" id={`${id}-hint`}>
        {hint}
      </span>
    </div>
  );
}
