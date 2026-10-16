"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "../../lib/api-client.js";
import { usePasswordPolicy } from "../../lib/use-password-policy.js";
import { FormField } from "../auth/form-field.jsx";

function bodyFrom(form, type) {
  return {
    type,
    proposedName: form.get("proposedName"),
    proposedSlug: form.get("proposedSlug"),
    registrationIdentifier: form.get("registrationIdentifier"),
    registeredAddress: form.get("registeredAddress"),
    locality: form.get("locality"),
    district: form.get("district"),
    state: form.get("state"),
    postalCode: form.get("postalCode"),
    contactEmail: form.get("contactEmail"),
    contactPhone: form.get("contactPhone"),
    description: form.get("description"),
    requestedFederationId: type === "cooperative" ? form.get("requestedFederationId") || null : null,
    declarationAccepted: form.get("declarationAccepted") === "on",
  };
}

export function OrganizationApplicationForm({ type }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("Organizations");
  const auth = useTranslations("Auth");
  const { policy } = usePasswordPolicy();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [federations, setFederations] = useState([]);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [existingAccount, setExistingAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.me().then((payload) => setUser(payload.data.user)).catch(() => null),
      apiClient.federations().then((payload) => setFederations(payload.data.federations)).catch(() => setFederations([])),
    ]).finally(async () => {
      const id = new URLSearchParams(window.location.search).get("id");
      if (id) {
        try { setDraft((await apiClient.application(id)).data.application); }
        catch { setError(t("loadFailed")); }
      }
      setChecking(false);
    });
  }, [t]);

  async function createApplicant(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setExistingAccount(false);
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError(auth("passwordMismatch"));
      setBusy(false);
      return;
    }
    try {
      const payload = await apiClient.register({
        displayName: form.get("displayName"),
        email: form.get("email") || undefined,
        phone: form.get("phone") || undefined,
        password: form.get("password"),
        preferredLocale: locale,
      });
      setUser(payload.data.user);
      setMessage(t("accountCreated"));
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === "ACCOUNT_ALREADY_EXISTS") {
        setExistingAccount(true);
        setError(t("existingAccount"));
      } else {
        setError(t("accountFailed"));
      }
    } finally { setBusy(false); }
  }

  async function saveApplication(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const action = event.nativeEvent.submitter?.value;
    try {
      const body = bodyFrom(new FormData(event.currentTarget), type);
      const payload = draft
        ? await apiClient.updateApplication(draft.id, body)
        : await apiClient.createApplication(body);
      const saved = payload.data.application;
      setDraft(saved);
      if (action === "submit") {
        await apiClient.submitApplication(saved.id, saved.version);
        router.push(`/${locale}/organizations/applications`);
        router.refresh();
      } else {
        setMessage(t("draftSaved"));
      }
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) setError(t("conflict"));
      else if (caught instanceof ApiClientError && caught.status === 400) setError(t("validationError"));
      else setError(t("saveFailed"));
    } finally { setBusy(false); }
  }

  if (checking) return <p role="status">{t("loading")}</p>;

  if (!user) {
    const returnTo = `/${locale}/organizations/register/${type}`;
    return (
      <div className="account-stack">
        <p>{t("accountRequired")}</p>
        {error && <div className="form-alert" role="alert">{error}</div>}
        {existingAccount && <Link className="secondary-button" href={`/${locale}/login?returnTo=${encodeURIComponent(returnTo)}`}>{t("signInContinue")}</Link>}
        <form className="auth-form" onSubmit={createApplicant} noValidate>
          <FormField id="displayName" name="displayName" label={auth("displayName")} autoComplete="name" required />
          <div className="form-grid">
            <FormField id="email" name="email" type="email" label={auth("email")} autoComplete="email" />
            <FormField id="phone" name="phone" type="tel" label={auth("phone")} autoComplete="tel" />
          </div>
          <FormField id="password" name="password" type="password" label={auth("password")} hint={auth("passwordRequirements", { minimum: policy.minimumLength })} minLength={policy.minimumLength} maxLength={128} autoComplete="new-password" required />
          <FormField id="confirmPassword" name="confirmPassword" type="password" label={auth("confirmPassword")} autoComplete="new-password" required />
          <button className="primary-button" disabled={busy} type="submit">{busy ? auth("creatingAccount") : t("createApplicant")}</button>
        </form>
      </div>
    );
  }

  const editable = !draft || ["draft", "rejected"].includes(draft.status);
  return (
    <div className="account-stack">
      <div className="safe-identity"><strong>{t("applicant")}</strong><br />{user.displayName} · {user.email || user.phone}</div>
      {(message || error) && <div className={error ? "form-alert" : "success-message"} role={error ? "alert" : "status"}>{error || message}</div>}
      {!editable ? (
        <div className="success-panel"><p>{t("notEditable")}</p><Link href={`/${locale}/organizations/applications`}>{t("viewApplications")}</Link></div>
      ) : (
        <form key={`${draft?.id || "new"}-${draft?.version || 0}`} className="auth-form organization-form" onSubmit={saveApplication} noValidate>
          <div className="form-field"><label>{t("organizationType")}</label><p className="read-only-value">{t(type)}</p></div>
          <div className="form-grid">
            <FormField id="proposedName" name="proposedName" label={t("proposedName")} defaultValue={draft?.proposedName} required />
            <FormField id="proposedSlug" name="proposedSlug" label={t("slug")} hint={t("slugHint")} defaultValue={draft?.proposedSlug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
          </div>
          <FormField id="registrationIdentifier" name="registrationIdentifier" label={t("registrationIdentifier")} defaultValue={draft?.registrationIdentifier} required />
          <FormField id="registeredAddress" name="registeredAddress" label={t("registeredAddress")} defaultValue={draft?.registeredAddress} required />
          <div className="form-grid">
            <FormField id="locality" name="locality" label={t("locality")} defaultValue={draft?.locality} required />
            <FormField id="district" name="district" label={t("district")} defaultValue={draft?.district} required />
            <FormField id="state" name="state" label={t("state")} defaultValue={draft?.state} required />
            <FormField id="postalCode" name="postalCode" inputMode="numeric" label={t("postalCode")} defaultValue={draft?.postalCode} pattern="[1-9][0-9]{5}" required />
          </div>
          <div className="form-grid">
            <FormField id="contactEmail" name="contactEmail" type="email" label={t("contactEmail")} defaultValue={draft?.contactEmail} required />
            <FormField id="contactPhone" name="contactPhone" type="tel" label={t("contactPhone")} defaultValue={draft?.contactPhone} required />
          </div>
          <FormField id="description" name="description" multiline rows="5" label={t("description")} defaultValue={draft?.description} required />
          {type === "cooperative" && (
            <div className="form-field">
              <label htmlFor="requestedFederationId">{t("federation")}</label>
              <select id="requestedFederationId" name="requestedFederationId" defaultValue={draft?.requestedFederationId || ""}>
                <option value="">{t("independent")}</option>
                {federations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
              <span className="field-hint">{t("federationHint")}</span>
            </div>
          )}
          <label className="check-field"><input name="declarationAccepted" type="checkbox" defaultChecked={draft?.declarationAccepted} required /><span>{t("declaration")}</span></label>
          <div className="form-actions">
            <button className="secondary-button" type="submit" value="save" disabled={busy}>{t("saveDraft")}</button>
            <button className="primary-button" type="submit" value="submit" disabled={busy}>{busy ? t("saving") : t("submit")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
