"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/api-client.js";
import { usePasswordPolicy } from "../../lib/use-password-policy.js";
import { FormField } from "./form-field.jsx";
import { clearShellSession } from "./app-shell-client.jsx";

export function AccountPanel() {
  const locale = useLocale();
  const router = useRouter();
  const translations = useTranslations("Account");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  const { policy, policyUnavailable } = usePasswordPolicy();

  useEffect(() => {
    apiClient
      .me()
      .then((payload) => setUser(payload.data.user))
      .catch(() => router.replace(`/${locale}/login`))
      .finally(() => setLoading(false));
  }, [locale, router]);

  async function updateProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const payload = await apiClient.updateProfile({
        displayName: form.get("displayName"),
        preferredLocale: form.get("preferredLocale"),
      });
      setUser(payload.data.user);
      setMessage(translations("profileSaved"));
    } catch {
      setError(translations("requestFailed"));
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.changePassword({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      });
      event.currentTarget.reset();
      setMessage(translations("passwordChanged"));
    } catch {
      setError(translations("passwordChangeFailed"));
    }
  }

  async function logout(allDevices) {
    setError("");
    try {
      await (allDevices ? apiClient.logoutAll() : apiClient.logout());
      clearShellSession();
      router.replace(`/${locale}/login`);
      router.refresh();
    } catch {
      setError(translations("requestFailed"));
    }
  }

  if (loading) return <p role="status">{translations("loading")}</p>;
  if (!user) return null;

  const roleLabels = user.roles.map((role) => translations(`role_${role}`));
  return (
    <div className="account-stack account-overview">
      {(message || error) && (
        <div
          className={error ? "form-alert" : "success-message"}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}
      <section
        className="identity-card"
        aria-labelledby="account-overview-heading"
      >
        <div className="identity-avatar" aria-hidden="true">
          {user.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">{translations("activeAccount")}</p>
          <h2 id="account-overview-heading">{user.displayName}</h2>
          <p className="safe-identity">{user.email || user.phone}</p>
          <div className="chip-list" aria-label={translations("rolesLabel")}>
            {roleLabels.map((role) => (
              <span className="status-pill" key={role}>
                {role}
              </span>
            ))}
          </div>
        </div>
      </section>
      <div
        className="account-tabs"
        role="tablist"
        aria-label={translations("overviewLabel")}
      >
        {["profile", "security", "sessions"].map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            type="button"
            onClick={() => setTab(name)}
          >
            {translations(`${name}Tab`)}
          </button>
        ))}
      </div>
      {tab === "profile" && (
        <section className="account-section" aria-labelledby="profile-heading">
          <h2 id="profile-heading">{translations("profile")}</h2>
          <p className="safe-identity">{user.email || user.phone}</p>
          <form className="auth-form" onSubmit={updateProfile}>
            <FormField
              id="displayName"
              name="displayName"
              label={translations("displayName")}
              defaultValue={user.displayName}
              required
            />
            <div className="form-field">
              <label htmlFor="preferredLocale">
                {translations("preferredLanguage")}
              </label>
              <select
                id="preferredLocale"
                name="preferredLocale"
                defaultValue={user.preferredLocale}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>
            <button className="secondary-button" type="submit">
              {translations("saveProfile")}
            </button>
          </form>
        </section>
      )}
      {tab === "security" && (
        <section className="account-section" aria-labelledby="security-heading">
          <h2 id="security-heading">{translations("security")}</h2>
          <form className="auth-form" onSubmit={changePassword}>
            <FormField
              id="currentPassword"
              name="currentPassword"
              type="password"
              label={translations("currentPassword")}
              autoComplete="current-password"
              required
            />
            <FormField
              id="newPassword"
              name="newPassword"
              type="password"
              label={translations("newPassword")}
              hint={translations("passwordRequirements", {
                minimum: policy.minimumLength,
              })}
              autoComplete="new-password"
              minLength={policy.minimumLength}
              maxLength={128}
              required
            />
            {policyUnavailable && (
              <p className="field-hint" role="status">
                {translations("policyUnavailable")}
              </p>
            )}
            <button className="secondary-button" type="submit">
              {translations("changePassword")}
            </button>
          </form>
        </section>
      )}
      {tab === "sessions" && (
        <section
          className="account-section logout-actions"
          aria-labelledby="sessions-heading"
        >
          <h2 id="sessions-heading">{translations("sessions")}</h2>
          <button
            className="secondary-button"
            type="button"
            onClick={() => logout(false)}
          >
            {translations("logout")}
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={() => logout(true)}
          >
            {translations("logoutAll")}
          </button>
        </section>
      )}
    </div>
  );
}
