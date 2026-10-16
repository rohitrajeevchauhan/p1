"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/api-client.js";
import { usePasswordPolicy } from "../../lib/use-password-policy.js";
import { FormField } from "./form-field.jsx";
import { safeLocaleReturn } from "../../lib/safe-return.js";

const encoded = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); });

export function RegisterForm({ returnTo = "" }) {
  const locale = useLocale();
  const router = useRouter();
  const translations = useTranslations("Auth");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { policy, policyUnavailable } = usePasswordPolicy();

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError(translations("passwordMismatch"));
      setSubmitting(false);
      return;
    }
    try {
      const photo = form.get("profilePhoto");
      await apiClient.register({
        displayName: form.get("displayName"),
        email: form.get("email") || undefined,
        phone: form.get("phone") || undefined,
        password: form.get("password"),
        preferredLocale: locale,
        ...(photo?.size ? { profilePhoto: { fileName: photo.name, mimeType: photo.type, contentBase64: await encoded(photo) } } : {}),
      });
      router.push(safeLocaleReturn(locale, returnTo));
      router.refresh();
    } catch (requestError) {
      setError(
        requestError.code === "ACCOUNT_ALREADY_EXISTS"
          ? translations("duplicateAccount")
          : requestError.code === "PASSWORD_POLICY_FAILED"
            ? translations("passwordRequirements")
            : translations("validationError"),
      );
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
        id="displayName"
        name="displayName"
        label={translations("displayName")}
        autoComplete="name"
        required
      />
      <div className="form-grid">
        <FormField
          id="email"
          name="email"
          type="email"
          label={translations("email")}
          autoComplete="email"
        />
        <FormField
          id="phone"
          name="phone"
          type="tel"
          label={translations("phone")}
          autoComplete="tel"
        />
      </div>
      <p className="field-hint">{translations("identityHint")}</p>
      <FormField id="profilePhoto" name="profilePhoto" type="file" accept="image/jpeg,image/png" label={translations("profilePhoto")} hint={translations("profilePhotoHint")} />
      <FormField
        id="password"
        name="password"
        type="password"
        label={translations("password")}
        hint={translations("passwordRequirements", {
          minimum: policy.minimumLength,
        })}
        autoComplete="new-password"
        minLength={policy.minimumLength}
        maxLength={128}
        required
      />
      <FormField
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label={translations("confirmPassword")}
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
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting
          ? translations("creatingAccount")
          : translations("createAccount")}
      </button>
    </form>
  );
}
