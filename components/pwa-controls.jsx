"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function PwaControls() {
  const t = useTranslations("Pwa");
  const [installEvent, setInstallEvent] = useState(null), [installed, setInstalled] = useState(() => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches), [update, setUpdate] = useState(null), [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const onOnline = () => setOnline(true), onOffline = () => setOnline(false);
    const onInstall = (event) => { event.preventDefault(); setInstallEvent(event); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline); window.addEventListener("beforeinstallprompt", onInstall); window.addEventListener("appinstalled", onInstalled);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      navigator.serviceWorker.register("/sw.js", { type: "module" }).then((registration) => {
        if (registration.waiting) setUpdate(registration.waiting);
        registration.addEventListener("updatefound", () => registration.installing?.addEventListener("statechange", () => { if (registration.waiting && navigator.serviceWorker.controller) setUpdate(registration.waiting); }));
      }).catch(() => {});
      navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
    }
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); window.removeEventListener("beforeinstallprompt", onInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  async function install() { if (!installEvent) return; await installEvent.prompt(); await installEvent.userChoice; setInstallEvent(null); }
  function applyUpdate() { update?.postMessage({ type: "SKIP_WAITING" }); setUpdate(null); }
  if (online && !installEvent && !update) return null;
  return <aside className="pwa-controls" aria-label={t("controls")} aria-live="polite">{!online && <p>{t("offlineNotice")}</p>}{installEvent && !installed && <button type="button" className="secondary-button" onClick={install}>{t("install")}</button>}{update && <><span>{t("updateReady")}</span><button type="button" className="secondary-button" onClick={applyUpdate}>{t("refresh")}</button></>}</aside>;
}
