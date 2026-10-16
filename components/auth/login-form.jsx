"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/api-client.js";
import { FormField } from "./form-field.jsx";
import { safeLocaleReturn } from "../../lib/safe-return.js";

export function LoginForm({
  initialIdentifier = "",
  initialPassword = "",
  returnTo = "",
}) {
  const locale = useLocale();
  const router = useRouter();
  const translations = useTranslations("Auth");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiClient.login({
        identifier: form.get("identifier"),
        password: form.get("password"),
        keepLoggedIn: form.get("keepLoggedIn") === "on",
      });
      router.push(safeLocaleReturn(locale, returnTo));
      router.refresh();
    } catch {
      setError(translations("genericAuthError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <FormField
        id="identifier"
        name="identifier"
        label={translations("identifier")}
        autoComplete="username"
        defaultValue={initialIdentifier}
        required
      />
      <FormField
        id="password"
        name="password"
        type="password"
        label={translations("password")}
        autoComplete="current-password"
        defaultValue={initialPassword}
        required
      />
      <label className="check-field">
        <input name="keepLoggedIn" type="checkbox" />
        <span>{translations("keepLoggedIn")}</span>
      </label>
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? translations("signingIn") : translations("signIn")}
      </button>
    </form>
  );
}
