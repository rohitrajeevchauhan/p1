import { mkdir, readFile } from "node:fs/promises";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright-core";
import dotenv from "dotenv";

const env = dotenv.parse(await readFile(new URL("../../api/.env", import.meta.url), "utf8"));
if (!env.DEMO_ROLE_PREVIEW_PASSWORD) throw new Error("Ignored local review credentials are unavailable.");
const base = process.env.COSERVE_TEST_URL || "http://localhost:3000", api = process.env.COSERVE_API_URL || "http://localhost:8000/api/v1", output = process.env.COSERVE_UI_OUTPUT || "/tmp/coserve-ui-review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const roles = [
  { name: "customer", email: "sahil@user.com", password: env.DEMO_ROLE_PREVIEW_PASSWORD, pages: [["en/account",390],["en/requests",768]] },
  { name: "worker", email: "sahil@worker.com", password: env.DEMO_ROLE_PREVIEW_PASSWORD, pages: [["hi/workers/jobs",390],["hi/workers/onboarding",768],["hi/workers/finance",984]] },
  { name: "cooperative", email: "sahil@org.com", password: env.DEMO_ROLE_PREVIEW_PASSWORD, pages: [["en/admin/operations",1440],["en/admin/workers",984],["en/admin/bookings",768],["en/admin/finance",1440]] },
  { name: "federation", email: "sahil@fed.com", password: env.DEMO_ROLE_PREVIEW_PASSWORD, pages: [["hi/admin/operations-oversight",1440],["hi/admin/finance-oversight",984]] },
  { name: "system", email: "sahil@admin.com", password: env.DEMO_ROLE_PREVIEW_PASSWORD, pages: [["en/admin/settings",1440],["en/admin/organizations",984],["en/admin/catalog",768]] },
];
const results = [];
for (const role of roles.filter((item) => !process.env.COSERVE_UI_ROLE || item.name === process.env.COSERVE_UI_ROLE)) {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: "block" }); const page = await context.newPage();
  await page.goto(`${base}/en/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="identifier"]').fill(role.email); await page.locator('input[name="password"]').fill(role.password); await page.locator('button[type="submit"]').click(); await page.waitForURL(/\/en\/account/, { timeout: 12_000 });
  if (["customer", "system"].includes(role.name)) { await page.setViewportSize({ width: 1440, height: 900 }); await page.locator(".app-sidebar .shell-brand").click(); await page.waitForURL(/\/en$/); await page.getByRole("link", { name: /workspace/i }).waitFor(); const meStatus = await page.evaluate((url) => fetch(`${url}/auth/me`, { credentials: "include" }).then((response) => response.status), api); if (meStatus !== 200) throw new Error(`${role.name} session was lost after brand navigation.`); await page.goto(`${base}/en/account`, { waitUntil: "domcontentloaded" }); await page.locator(".application-shell").waitFor(); }
  for (const [path, width] of role.pages) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(`${base}/${path}`, { waitUntil: "domcontentloaded" }); await page.locator("h1").first().waitFor({ timeout: 12_000 }); await page.waitForTimeout(500);
    await page.screenshot({ path: `${output}/${role.name}-${path.replaceAll("/", "-")}-${width}-before.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (overflow) throw new Error(`${role.name} ${path} overflows at ${width}px.`);
    const desktop = width > 820; if (await page.locator(".desktop-sidebar").isVisible() !== desktop) throw new Error(`${role.name} shell breakpoint failed at ${width}px.`);
    let drawer = false; if (!desktop) { const trigger = page.locator(".menu-trigger"); if (!await trigger.count()) throw new Error(`${role.name} ${path} missing mobile trigger at ${new URL(page.url()).pathname}`); await trigger.click(); await page.locator('.mobile-drawer[role="dialog"]').waitFor(); drawer = true; await page.screenshot({ path: `${output}/${role.name}-${width}-drawer.png`, fullPage: true }); await page.keyboard.press("Escape"); if (!await trigger.evaluate((node) => node === document.activeElement)) throw new Error("Drawer did not return focus."); }
    const leakedStatusKey = await page.locator("body").innerText().then((text) => /ServiceRequest\.status\./.test(text)); if (leakedStatusKey) throw new Error(`${role.name} ${path} exposed a translation key.`);
    const violations = (await new AxeBuilder({ page }).analyze()).violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) })); if (violations.length) throw new Error(`${role.name} ${path} accessibility: ${JSON.stringify(violations)}`);
    await page.screenshot({ path: `${output}/${role.name}-${path.replaceAll("/", "-")}-${width}.png`, fullPage: true }); results.push({ role: role.name, path: `/${path}`, width, drawer, overflow: false, violations: 0 });
  }
  await page.evaluate((url) => fetch(`${url}/auth/logout`, { method: "POST", credentials: "include" }), api); await context.close();
}
const connectivityResults = [];
for (const width of [390, 768, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("**/api/v1/health", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"status":"unavailable"}' }));
  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
  await page.getByText("CoServe is temporarily unreachable").waitFor();
  await page.evaluate(() => { const event = new Event("beforeinstallprompt"); event.prompt = async () => {}; event.userChoice = Promise.resolve({ outcome: "dismissed" }); dispatchEvent(event); });
  const install = page.getByRole("button", { name: "Install CoServe" }); await install.waitFor();
  if (!await install.evaluate((node) => Boolean(node.closest("header")))) throw new Error(`Install control escaped shell chrome at ${width}px.`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`Connectivity chrome overflows at ${width}px.`);
  await page.unroute("**/api/v1/health"); await page.evaluate(() => dispatchEvent(new Event("online")));
  await page.getByText("CoServe is temporarily unreachable").waitFor({ state: "hidden" });
  await context.setOffline(true); await page.evaluate(() => dispatchEvent(new Event("offline")));
  await page.getByText("Device is offline").waitFor();
  connectivityResults.push({ width, unreachable: true, recovered: true, offline: true, installInHeader: true });
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ authenticatedViews: results.length, authenticatedAxeScans: results.length, mobileTabletDrawers: results.filter((item) => item.drawer).length, viewports: [...new Set(results.map((item) => item.width))], connectivityStates: connectivityResults.length, output, credentialsPrinted: false }));
