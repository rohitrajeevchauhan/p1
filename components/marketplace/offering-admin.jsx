"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";
import { requestText } from "../../lib/text-dialog.js";
import { FormField } from "../auth/form-field.jsx";

function OfferingForm({ catalog, item, t, onSave, onCancel }) {
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSave({
      categoryId: form.get("categoryId"),
      title: { en: form.get("titleEn"), hi: form.get("titleHi") },
      description: { en: form.get("descriptionEn"), hi: form.get("descriptionHi") },
      localityIds: form.getAll("localityIds"),
      estimateMin: Number(form.get("estimateMin")),
      estimateMax: Number(form.get("estimateMax")),
      durationMinutes: Number(form.get("durationMinutes")),
      leadTimeHours: Number(form.get("leadTimeHours")),
      acceptsEmergency: form.get("acceptsEmergency") === "on",
      ...(item ? { version: item.version } : {}),
    });
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="form-field"><span>{t("category")}</span><select name="categoryId" defaultValue={item?.category.id}>{catalog.categories.filter((category) => category.state === "active").map((category) => <option value={category.id} key={category.id}>{category.name.en} / {category.name.hi}</option>)}</select></label>
      <div className="form-grid"><FormField name="titleEn" id={`${item?.id || "new"}-title-en`} label={t("titleEn")} defaultValue={item?.title.en} required /><FormField name="titleHi" id={`${item?.id || "new"}-title-hi`} label={t("titleHi")} defaultValue={item?.title.hi} required /></div>
      <FormField name="descriptionEn" id={`${item?.id || "new"}-desc-en`} label={t("descriptionEn")} defaultValue={item?.description.en} multiline rows="3" required />
      <FormField name="descriptionHi" id={`${item?.id || "new"}-desc-hi`} label={t("descriptionHi")} defaultValue={item?.description.hi} multiline rows="3" required />
      <fieldset className="choice-grid"><legend>{t("coverage")}</legend>{catalog.localities.filter((locality) => locality.state === "active").map((locality) => <label className="check-field" key={locality.id}><input type="checkbox" name="localityIds" value={locality.id} defaultChecked={item?.localities.some((selected) => selected.id === locality.id)} /><span>{locality.name.en} / {locality.name.hi}</span></label>)}</fieldset>
      <div className="form-grid"><FormField name="estimateMin" id={`${item?.id || "new"}-estimate-min`} type="number" min="1" label={t("minimum")} defaultValue={item?.estimateMin} required /><FormField name="estimateMax" id={`${item?.id || "new"}-estimate-max`} type="number" min="1" label={t("maximum")} defaultValue={item?.estimateMax} required /><FormField name="durationMinutes" id={`${item?.id || "new"}-duration`} type="number" min="15" label={t("duration")} defaultValue={item?.durationMinutes} required /><FormField name="leadTimeHours" id={`${item?.id || "new"}-lead`} type="number" min="0" label={t("lead")} defaultValue={item?.leadTimeHours} required /></div>
      <label className="check-field"><input type="checkbox" name="acceptsEmergency" defaultChecked={item?.acceptsEmergency} /> {t("emergency")}</label>
      <p className="field-hint">{t("disclaimer")}</p>
      <div className="form-actions"><button className="primary-button">{item ? t("update") : t("create")}</button>{item && <button className="secondary-button" type="button" onClick={onCancel}>{t("cancelEdit")}</button>}</div>
    </form>
  );
}

export function OfferingAdmin() {
  const locale = useLocale();
  const t = useTranslations("OfferingAdmin");
  const [cooperatives, setCooperatives] = useState([]);
  const [cooperativeId, setCooperativeId] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState({ type: "", text: "" });

  async function loadItems(id = cooperativeId) {
    if (id) setItems((await apiClient.cooperativeOfferings(id)).data.offerings);
  }

  useEffect(() => {
    Promise.all([apiClient.myCooperatives(), apiClient.marketplaceCatalog()]).then(([assigned, catalogResult]) => {
      const next = assigned.data.cooperatives;
      setCooperatives(next);
      setCooperativeId(next[0]?.id || "");
      setCatalog(catalogResult.data);
      if (next[0]?.id) apiClient.cooperativeOfferings(next[0].id).then((result) => setItems(result.data.offerings));
    }).catch(() => setNotice({ type: "error", text: t("forbidden") }));
  }, [t]);

  async function save(input) {
    try {
      if (editing) await apiClient.updateOffering(cooperativeId, editing.id, input);
      else await apiClient.createOffering(cooperativeId, input);
      setEditing(null);
      setNotice({ type: "success", text: t("saved") });
      await loadItems();
    } catch (error) {
      setNotice({ type: "error", text: error?.status === 409 ? t("conflict") : t("failed") });
    }
  }

  async function archive(item) {
    const reason = await requestText({ label: t("reason"), required: true });
    if (!reason) return;
    try {
      await apiClient.archiveOffering(cooperativeId, item.id, item.version, reason);
      setNotice({ type: "success", text: t("saved") });
      await loadItems();
    } catch (error) {
      setNotice({ type: "error", text: error?.status === 409 ? t("conflict") : t("failed") });
    }
  }

  if (!catalog) return <p role="status">{notice.text || t("loading")}</p>;
  return (
    <div className="account-stack">
      {notice.text && <div role={notice.type === "error" ? "alert" : "status"} className={notice.type === "error" ? "form-alert" : "success-message"}>{notice.text}</div>}
      <label className="form-field"><span>{t("cooperative")}</span><select value={cooperativeId} onChange={(event) => { const id = event.target.value; setCooperativeId(id); setEditing(null); apiClient.cooperativeOfferings(id).then((result) => setItems(result.data.offerings)); }}>{cooperatives.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <OfferingForm key={editing?.id || "new"} catalog={catalog} item={editing} t={t} onSave={save} onCancel={() => setEditing(null)} />
      <section className="account-section"><h2>{t("offerings")}</h2>{items.map((item) => <article className="application-card" key={item.id}><strong>{item.title[locale]}</strong><span className="status-pill">{t(`status.${item.state}`)}</span>{item.state === "active" && <div className="form-actions"><button className="secondary-button" onClick={() => setEditing(item)}>{t("edit")}</button><button className="danger-button" onClick={() => archive(item)}>{t("archive")}</button></div>}</article>)}</section>
    </div>
  );
}
