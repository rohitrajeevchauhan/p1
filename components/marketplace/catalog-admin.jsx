"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
import { FormField } from "../auth/form-field.jsx";

function CatalogItemForm({ kind, item, t, onSaved }) {
  const [notice, setNotice] = useState({ type: "", text: "" });

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      version: item.version,
      state: item.state,
      reason: form.get("reason"),
      name: { en: form.get("nameEn"), hi: form.get("nameHi") },
      displayOrder: Number(form.get("displayOrder")),
      ...(kind === "category" ? { summary: { en: form.get("summaryEn"), hi: form.get("summaryHi") } } : { postalCodeGuidance: form.get("postalCodeGuidance") }),
    };
    try {
      if (kind === "category") await apiClient.updateCategory(item.id, body);
      else await apiClient.updateLocality(item.id, body);
      await onSaved(t("saved"));
    } catch (error) {
      setNotice({ type: "error", text: error?.status === 409 ? t("conflict") : t("failed") });
    }
  }

  async function toggle() {
    const reason = await requestText({ label: t("reason"), required: true });
    if (!reason) return;
    try {
      const body = { version: item.version, state: item.state === "active" ? "archived" : "active", reason };
      if (kind === "category") await apiClient.updateCategory(item.id, body);
      else await apiClient.updateLocality(item.id, body);
      await onSaved();
    } catch (error) {
      setNotice({ type: "error", text: error?.status === 409 ? t("conflict") : t("failed") });
    }
  }

  return (
    <form className="application-card auth-form" onSubmit={save}>
      <div className="form-actions"><strong>{item.name.en} / {item.name.hi}</strong><span className="status-pill">{t(`status.${item.state}`)}</span></div>
      {notice.text && <div role={notice.type === "error" ? "alert" : "status"} className={notice.type === "error" ? "form-alert" : "success-message"}>{notice.text}</div>}
      <div className="form-grid"><FormField id={`${kind}-${item.id}-en`} name="nameEn" label={t("nameEn")} defaultValue={item.name.en} required /><FormField id={`${kind}-${item.id}-hi`} name="nameHi" label={t("nameHi")} defaultValue={item.name.hi} required /></div>
      {kind === "category" ? <div className="form-grid"><FormField id={`${kind}-${item.id}-summary-en`} name="summaryEn" label={t("summaryEn")} defaultValue={item.summary.en} multiline rows="3" required /><FormField id={`${kind}-${item.id}-summary-hi`} name="summaryHi" label={t("summaryHi")} defaultValue={item.summary.hi} multiline rows="3" required /></div> : <FormField id={`${kind}-${item.id}-postal`} name="postalCodeGuidance" label={t("postalGuidance")} defaultValue={item.postalCodeGuidance} required />}
      <div className="form-grid"><FormField id={`${kind}-${item.id}-order`} name="displayOrder" type="number" min="1" max="1000" label={t("displayOrder")} defaultValue={item.displayOrder} required /><FormField id={`${kind}-${item.id}-reason`} name="reason" label={t("changeReason")} required /></div>
      <div className="form-actions"><button className="primary-button">{t("saveContent")}</button><button className="secondary-button" type="button" onClick={toggle}>{item.state === "active" ? t("archive") : t("activate")}</button></div>
    </form>
  );
}

export function CatalogAdmin() {
  const locale = useLocale();
  const t = useTranslations("CatalogAdmin");
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState("");
  const load = useCallback((successMessage = "") => apiClient.adminCatalog().then((result) => { setData(result.data); if (successMessage) setNotice(successMessage); }).catch(() => setNotice(t("forbidden"))), [t]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <p role="status">{notice || t("loading")}</p>;
  const list = (kind, items) => <section className="account-section catalog-section"><h2>{t(kind === "category" ? "categories" : "localities")}</h2><p className="field-hint">{t("editingHint")}</p><div className="catalog-list">{items.map((item) => { const key = `${kind}-${item.id}`, open = editing === key; return <article className="catalog-row" key={`${item.id}-${item.version}`}><div><strong>{item.name.en}</strong><span>{item.name.hi}</span></div><span className="status-pill">{t(`status.${item.state}`)}</span><button className="secondary-button" type="button" aria-expanded={open} onClick={() => setEditing(open ? "" : key)}>{open ? t("closeEdit") : t("editItem")}</button>{open && <div className="catalog-editor"><CatalogItemForm kind={kind} item={item} locale={locale} t={t} onSaved={async () => { await load(t("saved")); setEditing(""); }} /></div>}</article>; })}</div></section>;
  return <div className="account-stack">{notice && <div className="success-message" role="status">{notice}</div>}{list("category", data.categories)}{list("locality", data.localities)}</div>;
}
