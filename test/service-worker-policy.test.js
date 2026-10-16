import { describe, expect, it } from "vitest";
import { isPublicCachePath, isSafeCacheResponse } from "../public/sw-policy.js";

describe("service-worker public cache policy", () => {
  it("allows only the explicit public route shapes", () => {
    for (const path of ["/en", "/hi/", "/en/services", "/en/services/plumbing", "/hi/services/plumbing/alpha-i", "/en/cooperatives/approved-coop", "/hi/workers/public-worker", "/en/offline", "/hi/manifest.webmanifest", "/icons/coserve-192.png", "/_next/static/chunks/app.js"]) expect(isPublicCachePath(path)).toBe(true);
  });

  it("denies request creation, authenticated, auth, malformed and over-deep routes", () => {
    for (const path of ["/en/services/request/abc", "/en/services/request", "/en/account", "/hi/admin", "/en/requests/abc", "/en/notifications", "/en/login", "/hi/register", "/en/organizations/register/cooperative", "/hi/workers/onboarding", "/en/workers/jobs", "/hi/workers/finance", "/en/services/plumbing/alpha-i/extra", "/api/v1/catalog", "/unknown"]) expect(isPublicCachePath(path)).toBe(false);
  });

  it("rejects non-OK, redirected, cookie-setting and privately resolved responses", () => {
    const response = (overrides = {}) => ({ ok: true, redirected: false, url: "https://example.test/en/services/plumbing", headers: new Headers(), ...overrides });
    expect(isSafeCacheResponse(response())).toBe(true);
    expect(isSafeCacheResponse(response({ ok: false }))).toBe(false);
    expect(isSafeCacheResponse(response({ redirected: true }))).toBe(false);
    expect(isSafeCacheResponse(response({ headers: new Headers({ "set-cookie": "session=private" }) }))).toBe(false);
    expect(isSafeCacheResponse(response({ url: "https://example.test/en/account" }))).toBe(false);
  });
});
