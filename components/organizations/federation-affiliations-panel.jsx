"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";

export function FederationAffiliationsPanel() {
  const t = useTranslations("FederationAffiliations");
  const [federations, setFederations] = useState([]);
  const [selected, setSelected] = useState("");
  const [items, setItems] = useState([]);
  const [reasons, setReasons] = useState({});
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiClient.myFederations().then((payload) => {
      const available = payload.data.federations;
      setFederations(available);
      setSelected(available[0]?.id || "");
      if (!available.length) setState("empty");
    }).catch(() => setState("forbidden"));
  }, []);

  useEffect(() => {
    if (!selected) return;
    apiClient.federationAffiliations(selected).then((payload) => { setItems(payload.data.affiliations); setState("ready"); }).catch(() => setState("error"));
  }, [selected]);

  async function decide(item, action) {
    try {
      await apiClient.decideAffiliation(selected, item.id, action, item.version, reasons[item.id] || "");
      setMessage(t("decisionSaved"));
      const payload = await apiClient.federationAffiliations(selected);
      setItems(payload.data.affiliations);
    } catch { setMessage(t("decisionFailed")); }
  }

  if (state === "loading") return <p role="status">{t("loading")}</p>;
  if (state === "forbidden") return <div className="form-alert" role="alert">{t("forbidden")}</div>;
  if (state === "empty") return <p>{t("noFederations")}</p>;
  if (state === "error") return <div className="form-alert" role="alert">{t("loadFailed")}</div>;
  return <div className="account-stack">
    {message && <div className={message === t("decisionSaved") ? "success-message" : "form-alert"} role="status">{message}</div>}
    {federations.length > 1 && <div className="form-field"><label htmlFor="federation-select">{t("federation")}</label><select id="federation-select" value={selected} onChange={(event) => setSelected(event.target.value)}>{federations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
    <div className="application-list">{items.length ? items.map((item) => <article className="application-card" key={item.id}><div className="card-heading"><h2>{item.cooperative.name}</h2><span className={`status-chip status-${item.status}`}>{t(`status.${item.status}`)}</span></div>{item.status === "pending" && <div className="review-actions"><label className="form-field"><span>{t("reason")}</span><input value={reasons[item.id] || ""} onChange={(event) => setReasons({ ...reasons, [item.id]: event.target.value })} required /></label><button className="primary-button" type="button" onClick={() => decide(item, "accept")}>{t("accept")}</button><button className="danger-button" type="button" onClick={() => decide(item, "reject")}>{t("reject")}</button></div>}{item.decisionReason && <p>{item.decisionReason}</p>}</article>) : <p>{t("empty")}</p>}</div>
  </div>;
}
