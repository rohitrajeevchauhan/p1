import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import en from "../messages/en.json";
import hi from "../messages/hi.json";
import { routing } from "../i18n/routing.js";
import { getDevelopmentPrefill } from "../lib/development-prefill.js";
import { safeLocaleReturn } from "../lib/safe-return.js";
import { operationsScopeQuery } from "../lib/operations-query.js";
import { forecastQuery } from "../lib/forecast-query.js";

function keys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "object" ? keys(child, path) : [path];
  });
}

describe("localization foundation", () => {
  it("supports exactly the approved foundation locales", () => {
    expect(routing.locales).toEqual(["en", "hi"]);
    expect(routing.defaultLocale).toBe("en");
  });

  it("keeps English and Hindi translation keys in sync", () => {
    expect(keys(hi).sort()).toEqual(keys(en).sort());
  });

  it("contains localized foundation-page copy", () => {
    expect(en.HomePage.summary).toContain("cooperative platform");
    expect(hi.HomePage.summary).toContain("सहकारी मंच");
    expect(en.HomePage.eyebrow).not.toContain("SIH26089");
    expect(JSON.stringify(en.HomePage)).not.toMatch(
      /project|foundation is ready/i,
    );
    expect(JSON.stringify(hi.HomePage)).not.toContain("परियोजना");
    expect(JSON.stringify(en)).not.toMatch(/project|foundation|phase/i);
    expect(JSON.stringify(hi)).not.toMatch(/परियोजना|नींव|चरण/);
  });

  it("contains matching English and Hindi authentication copy", () => {
    expect(en.Auth.loginTitle).toBeTruthy();
    expect(hi.Auth.loginTitle).toBeTruthy();
    expect(en.Account.logoutAll).toBeTruthy();
    expect(hi.Account.logoutAll).toBeTruthy();
    expect(en.AdminSettings.passwordMinimum).toBeTruthy();
    expect(hi.AdminSettings.passwordMinimum).toBeTruthy();
    expect(en.Auth.passwordRequirements).toContain("{minimum}");
    expect(hi.Auth.passwordRequirements).toContain("{minimum}");
  });

  it("provides localized organization registration, review, dashboard, and affiliation copy", () => {
    for (const messages of [en, hi]) {
      expect(messages.Auth.registerCooperative).toBeTruthy();
      expect(messages.Auth.registerFederation).toBeTruthy();
      expect(messages.Organizations.declaration).toBeTruthy();
      expect(messages.OrganizationDashboard.status.under_review).toBeTruthy();
      expect(messages.OrganizationAdmin.reasonRequired).toBeTruthy();
      expect(messages.FederationAffiliations.decisionSaved).toBeTruthy();
    }
  });

  it("provides matching localized worker onboarding and verification copy", () => {
    for (const messages of [en, hi]) {
      expect(messages.Auth.joinWorker).toBeTruthy();
      expect(messages.Worker.maskedAadhaar).toBeTruthy();
      expect(messages.Worker.status.active).toBeTruthy();
      expect(messages.WorkerAdmin.invitePrivacy).toBeTruthy();
      expect(messages.WorkerAudit.revoke).toBeTruthy();
    }
  });

  it("includes worker onboarding, cooperative review, and audit routes", () => {
    const onboarding = readFileSync(
      new URL(
        "../components/workers/worker-onboarding-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const cooperative = readFileSync(
      new URL(
        "../components/workers/cooperative-worker-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const audit = readFileSync(
      new URL("../components/workers/worker-audit-panel.jsx", import.meta.url),
      "utf8",
    );
    expect(onboarding).toContain("maskedAadhaar");
    expect(onboarding).toContain("cancelMembership");
    expect(cooperative).toContain("inviteWorker");
    expect(cooperative).toContain("decideWorkerVerification");
    expect(audit).toContain("revokeWorkerVerification");
    expect(audit).toContain("activeCases");
    expect(audit).toContain("historyCases");
  });

  it("provides bilingual marketplace, scheduling, catalog, and offering copy", () => {
    for (const messages of [en, hi]) {
      expect(messages.Marketplace.categories.plumbing.name).toBeTruthy();
      expect(messages.ServiceRequest.emergency).toBeTruthy();
      expect(messages.CatalogAdmin.archive).toBeTruthy();
      expect(messages.OfferingAdmin.disclaimer).toBeTruthy();
    }
  });

  it("keeps public discovery static and request/admin interactions isolated", () => {
    const discovery = readFileSync(
      new URL(
        "../components/marketplace/discovery-results.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const requestForm = readFileSync(
      new URL("../components/marketplace/request-form.jsx", import.meta.url),
      "utf8",
    );
    const catalog = readFileSync(
      new URL("../components/marketplace/catalog-admin.jsx", import.meta.url),
      "utf8",
    );
    expect(discovery).toContain("discoverOfferings");
    expect(discovery).toContain("requestSequence.current === sequence");
    expect(discovery).toContain("result-skeleton");
    expect(discovery).toContain("verified-worker-list");
    expect(discovery).not.toContain("disabled={Boolean(categorySlug)}");
    expect(requestForm).toContain("returnTo");
    expect(requestForm).toContain("requestType");
    expect(requestForm).toContain("inFlight.current");
    expect(requestForm).toContain(
      "disabled={submitting || created || ambiguous}",
    );
    expect(requestForm).toContain("idempotencyKey: submission.current.key");
    expect(requestForm).toContain("reviewRequests");
    expect(catalog).toContain("updateCategory");
    expect(catalog).toContain("summaryEn");
    const offering = readFileSync(
      new URL("../components/marketplace/offering-admin.jsx", import.meta.url),
      "utf8",
    );
    const detail = readFileSync(
      new URL("../components/marketplace/request-detail.jsx", import.meta.url),
      "utf8",
    );
    expect(offering).toContain("updateOffering");
    expect(detail).toContain("customerBooking(requestId)");
  });

  it("provides matching bilingual booking lifecycle copy and role surfaces", () => {
    for (const messages of [en, hi]) {
      expect(messages.Booking.availabilityTitle).toBeTruthy();
      expect(messages.Booking.status.searching).toBeTruthy();
      expect(messages.Booking.status.awaiting_completion).toBeTruthy();
      expect(messages.Booking.startCode).toBeTruthy();
      expect(messages.Booking.completionCode).toBeTruthy();
      expect(messages.Booking.oversightDescription).toBeTruthy();
    }
    const worker = readFileSync(
      new URL(
        "../components/bookings/worker-booking-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const customer = readFileSync(
      new URL("../components/marketplace/request-detail.jsx", import.meta.url),
      "utf8",
    );
    const administration = readFileSync(
      new URL(
        "../components/bookings/booking-admin-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(worker).toContain("saveBookingAvailability");
    expect(worker).toContain("respondBookingOffer");
    expect(customer).toContain("regenerateBookingCode");
    expect(administration).toContain("bookingOversight");
    expect(administration).toContain("readOnly={oversight}");
  });

  it("provides synchronized bilingual finance, welfare, review, and complaint copy", () => {
    for (const messages of [en, hi]) {
      expect(messages.Finance.workerFinanceTitle).toBeTruthy();
      expect(messages.Finance.cooperativeFinanceTitle).toBeTruthy();
      expect(messages.Finance.oversightTitle).toBeTruthy();
      expect(messages.Finance.invoiceTitle).toBeTruthy();
      expect(messages.Finance.categories.safety).toBeTruthy();
      expect(
        messages.Finance.complaintStatus.under_escalated_review,
      ).toBeTruthy();
      expect(messages.Finance.benefitStatus.active).toBeTruthy();
      expect(messages.AdminSettings.financialDistribution).toBeTruthy();
      expect(messages.Account.manageFinance).toBeTruthy();
    }
  });

  it("includes every role-appropriate Phase 4 surface and public review integration", () => {
    const customer = readFileSync(
      new URL(
        "../components/finance/customer-finance-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const worker = readFileSync(
      new URL(
        "../components/finance/worker-finance-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const cooperative = readFileSync(
      new URL(
        "../components/finance/cooperative-finance-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const oversight = readFileSync(
      new URL(
        "../components/finance/finance-oversight-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const publicWorker = readFileSync(
      new URL("../components/marketplace/worker-public.jsx", import.meta.url),
      "utf8",
    );
    const publicCooperative = readFileSync(
      new URL(
        "../components/marketplace/cooperative-public.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const settings = readFileSync(
      new URL("../components/admin/settings-panel.jsx", import.meta.url),
      "utf8",
    );
    expect(customer).toContain("makeDemoPayment");
    expect(customer).toContain("createReview");
    expect(worker).toContain("workerFinance");
    expect(cooperative).toContain("proposeFinalPrice");
    expect(cooperative).toContain("createBenefit");
    expect(cooperative).toContain("cooperativeComplaintAction");
    expect(oversight).toContain("escalationAction");
    expect(oversight).toContain("moderateReview");
    expect(publicWorker).toContain("publicWorkerReviews");
    expect(publicCooperative).toContain("publicCooperativeReviews");
    expect(settings).toContain("financial_distribution_bps");
  });

  it("keeps finance layouts responsive from phone through desktop widths", () => {
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    );
    expect(css).toMatch(
      /\.finance-summary\s*\{[^}]*grid-template-columns:\s*repeat\(4/s,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*984px\)[\s\S]*\.finance-summary\s*\{[^}]*repeat\(2/s,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*560px\)[\s\S]*\.finance-summary,\s*\.distribution-grid\s*\{[^}]*grid-template-columns:\s*1fr/s,
    );
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("keeps content-bearing entrance animations fully opaque", () => {
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    );
    for (const name of ["hero-in", "card-in"]) {
      const start = css.indexOf(`@keyframes ${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(css.slice(start, start + 220)).not.toContain("opacity");
    }
  });

  it("provides bilingual scoped operations dashboards, alerts, and audit activity", () => {
    for (const messages of [en, hi]) {
      expect(messages.Operations.cooperativeTitle).toBeTruthy();
      expect(messages.Operations.oversightTitle).toBeTruthy();
      expect(messages.Operations.periods["30d"]).toBeTruthy();
      expect(messages.Operations.alerts.unresolved_safety).toBeTruthy();
      expect(messages.Operations.reconciliationStatus.reconciled).toBeTruthy();
      expect(
        messages.Operations.auditActions.worker_membership.approved,
      ).toBeTruthy();
      expect(
        messages.Operations.auditActions.booking.allocation_retried,
      ).toBeTruthy();
      expect(messages.Account.cooperativeOperations).toBeTruthy();
      expect(messages.Account.operationsOversight).toBeTruthy();
    }
    const dashboard = readFileSync(
      new URL(
        "../components/operations/operations-dashboard.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const client = readFileSync(
      new URL("../lib/api-client.js", import.meta.url),
      "utf8",
    );
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    );
    expect(dashboard).toContain("cooperativeOperations");
    expect(dashboard).toContain("operationsOversight");
    expect(dashboard).toContain("AuditActivity");
    expect(dashboard).toContain('setSelectedOversightCooperative("")');
    expect(dashboard).toContain("changeOversightFederation");
    expect(dashboard).toContain("resetOversightScope");
    expect(dashboard).toContain("viewCooperative");
    expect(dashboard).toContain("auditActionUnknown");
    expect(client).toContain("/operations/oversight/dashboard");
    expect(css).toMatch(/\.operations-metrics\s*\{[^}]*repeat\(4/s);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*984px\)[\s\S]*\.operations-metrics\s*\{[^}]*repeat\(2/s,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*560px\)[\s\S]*\.operations-metrics,[^}]*grid-template-columns:\s*1fr/s,
    );
  });

  it("constructs oversight queries only from validated scope values", () => {
    const federationId = "64b7f0f0f0f0f0f0f0f0f0f1";
    const organizationId = "64b7f0f0f0f0f0f0f0f0f0f2";
    expect(
      operationsScopeQuery({
        period: "90d",
        federationId,
        organizationId,
        page: 2,
        limit: 10,
      }),
    ).toBe(
      `period=90d&federationId=${federationId}&organizationId=${organizationId}&page=2&limit=10`,
    );
    expect(
      operationsScopeQuery({
        period: "invalid",
        federationId: "not-an-id",
        organizationId: "//outside",
        page: -1,
        action: "bad value",
      }),
    ).toBe("period=30d");
  });

  it("provides bilingual forecasting, PWA, notifications, and accessible dialogs", () => {
    for (const messages of [en, hi]) {
      expect(messages.Forecast.syntheticWarning).toBeTruthy();
      expect(
        messages.Forecast.unavailable.insufficient_complete_weeks,
      ).toBeTruthy();
      expect(messages.Notifications.browserLimitation).toBeTruthy();
      expect(messages.Pwa.offlinePrivate).toBeTruthy();
    }
    expect(
      forecastQuery({
        mode: "synthetic_demo",
        category: "plumbing",
        locality: "alpha-i",
        organizationId: "bad",
      }),
    ).toBe("mode=synthetic_demo&category=plumbing&locality=alpha-i");
    const serviceWorker = readFileSync(
      new URL("../public/sw.js", import.meta.url),
      "utf8",
    );
    const dialog = readFileSync(
      new URL("../lib/text-dialog.js", import.meta.url),
      "utf8",
    );
    const components = [
      "../components/bookings/booking-admin-panel.jsx",
      "../components/bookings/worker-booking-panel.jsx",
      "../components/finance/customer-finance-panel.jsx",
      "../components/finance/cooperative-finance-panel.jsx",
      "../components/finance/finance-oversight-panel.jsx",
      "../components/finance/worker-finance-panel.jsx",
      "../components/workers/cooperative-worker-panel.jsx",
      "../components/workers/worker-audit-panel.jsx",
      "../components/marketplace/request-detail.jsx",
      "../components/marketplace/catalog-admin.jsx",
      "../components/marketplace/offering-admin.jsx",
    ]
      .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
      .join("\n");
    expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
    expect(serviceWorker).not.toContain('addEventListener("sync"');
    expect(serviceWorker).not.toContain("registration.sync");
    expect(serviceWorker).not.toContain("BackgroundSync");
    expect(dialog).toContain("showModal");
    expect(components).not.toContain("window.prompt");
  });

  it("keeps authentication continuation on the exact same-locale path", () => {
    expect(
      safeLocaleReturn("en", "/en/services/request/abc?source=register"),
    ).toBe("/en/services/request/abc?source=register");
    expect(
      safeLocaleReturn("en", "https://attacker.test/en/services/request/abc"),
    ).toBe("/en/account");
    expect(safeLocaleReturn("en", "/hi/services/request/abc")).toBe(
      "/en/account",
    );
    expect(safeLocaleReturn("en", "//attacker.test/path")).toBe("/en/account");
    const register = readFileSync(
      new URL("../app/[locale]/register/page.jsx", import.meta.url),
      "utf8",
    );
    expect(register).toContain("returnTo={returnTo}");
  });

  it("keeps cooperative registration public and separate from customer registration", () => {
    const loginPage = readFileSync(
      new URL("../app/[locale]/login/page.jsx", import.meta.url),
      "utf8",
    );
    expect(loginPage).toContain("organizations/register/cooperative");
    expect(loginPage).toContain("organizations/register/federation");
    expect(loginPage).toContain("registerCooperative");
    expect(loginPage).toContain("createAccount");
  });

  it("includes localized application, review, and federation administration routes", () => {
    const application = readFileSync(
      new URL(
        "../components/organizations/organization-application-form.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const dashboard = readFileSync(
      new URL(
        "../components/organizations/applications-dashboard.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const review = readFileSync(
      new URL(
        "../components/organizations/admin-organizations-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    const affiliation = readFileSync(
      new URL(
        "../components/organizations/federation-affiliations-panel.jsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(application).toContain("declarationAccepted");
    expect(application).toContain("requestedFederationId");
    expect(dashboard).toContain("rejectionReason");
    expect(review).toContain("approveApplication");
    expect(affiliation).toContain("decideAffiliation");
  });

  it("stacks registration identity fields until a genuinely wide layout", () => {
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    );
    expect(css).toMatch(/\.form-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    expect(css).toMatch(
      /@media\s*\(min-width:\s*1100px\)[\s\S]*@container auth-card \(min-width:\s*40rem\)[\s\S]*grid-template-columns:\s*1fr 1fr;/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*760px\)[\s\S]*\.detail-grid\s*\{[^}]*grid-template-columns:\s*1fr;/,
    );
    expect(css).toContain("min-width: 320px");
  });

  it("allows prefill only in explicitly enabled development", () => {
    const supplied = {
      enabled: "true",
      email: "local@example.test",
      password: "local-only-value",
    };
    expect(
      getDevelopmentPrefill({ nodeEnv: "development", ...supplied }),
    ).toEqual({
      identifier: supplied.email,
      password: supplied.password,
    });
    expect(
      getDevelopmentPrefill({ nodeEnv: "production", ...supplied }),
    ).toEqual({
      identifier: "",
      password: "",
    });
    expect(
      getDevelopmentPrefill({
        nodeEnv: "development",
        ...supplied,
        enabled: "false",
      }),
    ).toEqual({
      identifier: "",
      password: "",
    });
  });
});
