import { hasLocale } from "next-intl";
import { routing } from "../../../i18n/routing.js";

export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }

export async function GET(_request, { params }) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  const hindi = locale === "hi";
  return Response.json({
    id: `/${locale}`,
    name: hindi ? "CoServe सहकारी सेवा बाज़ार" : "CoServe Cooperative Service Marketplace",
    short_name: "CoServe",
    description: hindi ? "सत्यापित सहकारी घरेलू और सामुदायिक सेवाएँ।" : "Verified cooperative household and community services.",
    start_url: `/${locale}`,
    scope: "/",
    display: "standalone",
    background_color: "#fffdf7",
    theme_color: "#082d25",
    lang: locale,
    icons: [
      { src: "/icons/coserve-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/coserve-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }, { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } });
}
