import { siteOrigin } from "../lib/seo.js";

export default function robots() {
  const indexable =
    process.env.COSERVE_PUBLIC_DEPLOYMENT === "true" &&
    siteOrigin().startsWith("https://");
  const privatePaths = [
    "/en/account",
    "/hi/account",
    "/en/admin",
    "/hi/admin",
    "/en/requests",
    "/hi/requests",
    "/en/login",
    "/hi/login",
    "/en/register",
    "/hi/register",
    "/en/notifications",
    "/hi/notifications",
    "/en/services/request",
    "/hi/services/request",
    "/en/workers/onboarding",
    "/hi/workers/onboarding",
    "/en/workers/jobs",
    "/hi/workers/jobs",
    "/en/workers/finance",
    "/hi/workers/finance",
    "/en/organizations",
    "/hi/organizations",
    "/en/federation",
    "/hi/federation",
  ];
  return {
    rules: {
      userAgent: "*",
      allow: indexable ? ["/en", "/hi"] : [],
      disallow: indexable ? privatePaths : "/",
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
