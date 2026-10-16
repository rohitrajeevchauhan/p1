import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import dotenv from "dotenv";

const environment = dotenv.parse(await readFile(new URL("../../api/.env", import.meta.url), "utf8"));
const demoPassword = environment.DEMO_ROLE_PREVIEW_PASSWORD, adminPassword = environment.DEMO_ROLE_PREVIEW_PASSWORD, adminEmail = "sahil@admin.com";
if (!demoPassword || !adminPassword || !adminEmail) throw new Error("Ignored local demo and administrator credentials are required.");
const base = process.env.COSERVE_TEST_URL || "http://localhost:3000", api = process.env.COSERVE_API_URL || "http://localhost:8000/api/v1";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const journeys = [
  { kind: "customer", locale: "en", identifier: "sahil@user.com", password: demoPassword, target: "/en/requests" },
  { kind: "verified-worker", locale: "hi", identifier: "sahil@worker.com", password: demoPassword, target: "/hi/workers/jobs" },
  { kind: "pending-worker", locale: "en", identifier: "demo.pending-worker@coserve.local", password: environment.DEMO_ACCOUNT_PASSWORD, target: "/en/workers/onboarding" },
  { kind: "cooperative-admin", locale: "en", identifier: "sahil@org.com", password: demoPassword, target: "/en/admin/operations" },
  { kind: "federation-admin", locale: "hi", identifier: "sahil@fed.com", password: demoPassword, target: "/hi/admin/operations-oversight" },
  { kind: "system-admin", locale: "en", identifier: adminEmail, password: adminPassword, target: "/en/admin/settings" },
];
const results = [];
for (const journey of journeys) {
  const context = await browser.newContext({ viewport: { width: journey.kind === "cooperative-admin" ? 1440 : 390, height: 900 } }); const page = await context.newPage();
  await page.goto(`${base}/${journey.locale}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  let loginResponseStatus = null, loginFailure = null; page.on("response", (response) => { if (response.url().endsWith("/auth/login")) loginResponseStatus = response.status(); }); page.on("requestfailed", (request) => { if (request.url().endsWith("/auth/login")) loginFailure = request.failure()?.errorText ?? "failed"; });
  if (await page.locator('input[name="identifier"]').inputValue() || await page.locator('input[name="password"]').inputValue()) throw new Error("Production login fields must be empty before demo input.");
  await page.locator('input[name="identifier"]').fill(journey.identifier); await page.locator('input[name="password"]').fill(journey.password); await page.locator('button[type="submit"]').click();
  try { await page.waitForURL((url) => url.pathname === `/${journey.locale}/account`, { timeout: 10_000 }); } catch { const alert = await page.locator('[role="alert"]').allInnerTexts(); const fieldState = { identifierMatches: await page.locator('input[name="identifier"]').inputValue() === journey.identifier, passwordLength: (await page.locator('input[name="password"]').inputValue()).length, expectedPasswordLength: journey.password.length }; throw new Error(`${journey.kind} login did not reach account; path=${new URL(page.url()).pathname}; response=${loginResponseStatus}; failure=${loginFailure}; alerts=${JSON.stringify(alert)}; fields=${JSON.stringify(fieldState)}`); } await page.waitForLoadState("networkidle");
  await page.goto(`${base}${journey.target}`, { waitUntil: "networkidle" }); await page.waitForTimeout(250);
  if (new URL(page.url()).pathname.includes("/login") || await page.locator("h1").count() === 0) throw new Error(`${journey.kind} target did not render.`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) throw new Error(`${journey.kind} target overflows its viewport.`);
  const logoutStatus = await page.evaluate((url) => fetch(`${url}/auth/logout`, { method: "POST", credentials: "include" }).then((response) => response.status), api);
  if (logoutStatus !== 204) throw new Error(`${journey.kind} logout failed.`);
  results.push({ kind: journey.kind, locale: journey.locale, target: journey.target, viewport: journey.kind === "cooperative-admin" ? "desktop" : "mobile", loggedIn: true, targetRendered: true, logout: true });
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ journeys: results.length, results, productionPrefillEmpty: true, credentialsPrinted: false }));
