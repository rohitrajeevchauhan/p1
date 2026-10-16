"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "../../lib/api-client.js";

const PREFERENCE = "coserve-browser-notifications";

export function NotificationCenter() {
  const t = useTranslations("Notifications"), locale = useLocale();
  const [data, setData] = useState(null), [error, setError] = useState(""), [enabled, setEnabled] = useState(() => typeof window !== "undefined" && "Notification" in window && localStorage.getItem(PREFERENCE) === "enabled" && Notification.permission === "granted");
  useEffect(() => {
    apiClient.notifications().then((response) => setData(response.data)).catch(() => setError(t("failed")));
  }, [t]);
  useEffect(() => {
    if (!enabled || !data?.items.length || !("Notification" in window)) return;
    const urgent = data.items.find((entry) => entry.urgency === "high");
    if (urgent && !sessionStorage.getItem(`notified:${urgent.key}`)) { new Notification("CoServe", { body: t(`kind.${urgent.kind}`), tag: urgent.key }); sessionStorage.setItem(`notified:${urgent.key}`, "yes"); }
  }, [data, enabled, t]);
  async function enable() { if (!("Notification" in window)) return; const permission = await Notification.requestPermission(); const active = permission === "granted"; localStorage.setItem(PREFERENCE, active ? "enabled" : "disabled"); setEnabled(active); }
  function disable() { localStorage.setItem(PREFERENCE, "disabled"); setEnabled(false); }
  return <div className="account-stack"><section className="account-section"><h2>{t("browserTitle")}</h2><p>{t("browserLimitation")}</p>{enabled ? <button type="button" className="secondary-button" onClick={disable}>{t("disable")}</button> : <button type="button" className="secondary-button" onClick={enable}>{t("enable")}</button>}</section>{error ? <p role="alert" className="form-alert">{error}</p> : !data ? <p role="status">{t("loading")}</p> : <section className="account-section"><h2>{t("inAppTitle")}</h2>{data.items.length ? <ul className="notification-list">{data.items.map((entry) => <li key={entry.key}><div><strong>{t(`kind.${entry.kind}`)}</strong><small>{new Date(entry.occurredAt).toLocaleString(locale)}</small></div><Link className="secondary-button" href={`/${locale}${entry.route}`}>{t("open")}</Link></li>)}</ul> : <p className="empty-state">{t("empty")}</p>}</section>}</div>;
}
