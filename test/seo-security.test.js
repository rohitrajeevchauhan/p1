import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import sitemap from "../app/sitemap.js";
import robots from "../app/robots.js";
import { localizedAlternates } from "../lib/seo.js";
import { webSecurityHeaders } from "../lib/security-headers.js";

const previousDeployment = process.env.COSERVE_PUBLIC_DEPLOYMENT;
const previousSite = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => { if (previousDeployment === undefined) delete process.env.COSERVE_PUBLIC_DEPLOYMENT; else process.env.COSERVE_PUBLIC_DEPLOYMENT = previousDeployment; if (previousSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = previousSite; });

describe("SEO and browser security foundation", () => {
  it("lists only localized public discovery routes with language alternates", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(164);
    expect(entries.some((item) => /login|register|account|admin|request|notification/.test(item.url))).toBe(false);
    expect(entries.every((item) => item.alternates.languages.en && item.alternates.languages.hi)).toBe(true);
    expect(localizedAlternates("hi", "services/plumbing")).toEqual({ canonical: "/hi/services/plumbing", languages: { en: "/en/services/plumbing", hi: "/hi/services/plumbing", "x-default": "/en/services/plumbing" } });
  });

  it("defaults to no indexing until an HTTPS public deployment is explicitly enabled", () => {
    delete process.env.COSERVE_PUBLIC_DEPLOYMENT;
    expect(robots().rules.disallow).toBe("/");
    process.env.COSERVE_PUBLIC_DEPLOYMENT = "true";
    expect(robots().rules.disallow).toBe("/");
    process.env.NEXT_PUBLIC_SITE_URL = "https://coserve.example";
    const publicRules = robots().rules;
    expect(publicRules.allow).toEqual(["/en", "/hi"]); expect(publicRules.disallow).toContain("/en/services/request"); expect(publicRules.disallow).toContain("/hi/admin");
  });

  it("provides CSP and only accurate minimal structured-data types", () => {
    const headers = Object.fromEntries(webSecurityHeaders({ NODE_ENV: "production", COSERVE_PUBLIC_DEPLOYMENT: "true", NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1" }).map((item) => [item.key, item.value]));
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("connect-src 'self' https://api.example.test");
    expect(headers["Content-Security-Policy"]).not.toContain("'unsafe-eval'");
    expect(headers["Strict-Transport-Security"]).toBeTruthy();
    const home = readFileSync(new URL("../app/[locale]/page.jsx", import.meta.url), "utf8");
    expect(home).toContain('"@type": "WebSite"'); expect(home).toContain('"@type": "Organization"');
    expect(home).not.toMatch(/AggregateRating|PostalAddress|GovernmentOrganization/);
  });

  it("permits React debugging evaluation only in development", () => {
    const development = Object.fromEntries(webSecurityHeaders({ NODE_ENV: "development" }).map((item) => [item.key, item.value]));
    const nonPublicProduction = Object.fromEntries(webSecurityHeaders({ NODE_ENV: "production", COSERVE_PUBLIC_DEPLOYMENT: "false" }).map((item) => [item.key, item.value]));
    expect(development["Content-Security-Policy"]).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(nonPublicProduction["Content-Security-Policy"]).not.toContain("'unsafe-eval'");
  });
});
