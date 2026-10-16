import { readFile } from "node:fs/promises";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright-core";

const base = process.env.COSERVE_TEST_URL || "http://127.0.0.1:3100";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const context = await browser.newContext({ serviceWorkers: "allow" });
const page = await context.newPage();
const publicContentRoutes = ["/en", "/hi", "/en/login", "/hi/register", "/en/organizations/register/cooperative", "/en/services", "/hi/services/plumbing/alpha-i", "/hi/offline"];
const authGateRoutes = ["/en/account", "/hi/workers/onboarding", "/en/services/request/000000000000000000000000", "/en/requests/000000000000000000000000", "/en/requests/000000000000000000000000/invoice", "/en/admin/settings", "/hi/federation/affiliations", "/en/notifications"];
const results = [];

async function stableVisit(route) {
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
  await page.locator("h1, [role='status'], [role='alert']").first().waitFor({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(350);
}

async function analyzeStable() {
  try { return await new AxeBuilder({ page }).analyze(); }
  catch (error) {
    if (!String(error?.message).includes("Execution context was destroyed")) throw error;
    await page.waitForLoadState("domcontentloaded");
    await page.locator("h1, [role='status'], [role='alert']").first().waitFor({ timeout: 10_000 }).catch(() => {});
    return new AxeBuilder({ page }).analyze();
  }
}

for (const [kind, routes] of [["public-content", publicContentRoutes], ["unauthenticated-gate", authGateRoutes]]) {
  for (const route of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await stableVisit(route);
    if (kind === "unauthenticated-gate") {
      await page.waitForURL((url) => url.pathname.endsWith("/login"), { timeout: 10_000 });
      await page.locator("h1").first().waitFor({ timeout: 10_000 });
    }
    const scan = await analyzeStable();
    results.push({ kind, route, finalPath: new URL(page.url()).pathname, violations: scan.violations.map((item) => item.id) });
  }
}

const responsive = [];
for (const width of [390, 768, 984, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ["/en", "/hi/services"]) {
    await stableVisit(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    responsive.push({ width, route, overflow });
  }
}
if (responsive.some((item) => item.overflow)) throw new Error(`Responsive overflow: ${JSON.stringify(responsive)}`);

await page.setViewportSize({ width: 390, height: 844 });
await stableVisit("/en");
await page.keyboard.press("Tab");
if (!(await page.locator(".skip-link").evaluate((element) => element === document.activeElement))) throw new Error("Skip link is not first keyboard target.");
await page.keyboard.press("Enter");
if (!(await page.locator("#page-main").evaluate((element) => element === document.activeElement))) throw new Error("Skip link did not move focus to main content.");
await page.emulateMedia({ reducedMotion: "reduce" });
const reducedMotion = await page.locator(".hero__content").evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration) <= 0.01);
if (!reducedMotion) throw new Error("Reduced-motion override failed.");
const cdp = await context.newCDPSession(page); await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) throw new Error("200% zoom caused horizontal overflow.");
await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });

const dialogSource = await readFile(new URL("../lib/text-dialog.js", import.meta.url), "utf8");
await page.addScriptTag({ content: `${dialogSource.replace("export function requestText", "function requestText")}\nwindow.__requestText = requestText;` });
async function beginDialog() {
  await page.evaluate(() => {
    let origin = document.querySelector("#dialog-origin");
    if (!origin) { origin = document.createElement("button"); origin.id = "dialog-origin"; origin.textContent = "Open"; document.body.append(origin); }
    origin.focus(); window.__dialogResult = window.__requestText({ label: "Reason", required: true });
  });
  await page.locator("dialog textarea").waitFor();
  if (!(await page.locator("dialog textarea").evaluate((element) => element === document.activeElement))) throw new Error("Text dialog did not focus its field.");
}
async function assertDialogFinished(expected) {
  const state = await page.evaluate(async () => ({ result: await window.__dialogResult, dialogs: document.querySelectorAll("dialog").length, returned: document.activeElement?.id === "dialog-origin" }));
  if (state.result !== expected || state.dialogs !== 0 || !state.returned) throw new Error(`Text dialog cleanup/focus failed: ${JSON.stringify(state)}`);
}
await beginDialog(); await page.keyboard.press("Escape"); await assertDialogFinished(null);
await beginDialog(); await page.getByRole("button", { name: "Cancel" }).click(); await assertDialogFinished(null);
await beginDialog(); await page.locator("dialog textarea").fill("Accessible reason"); await page.getByRole("button", { name: "Continue" }).click(); await assertDialogFinished("Accessible reason");

await stableVisit("/en");
await page.waitForFunction(() => navigator.serviceWorker?.controller || false, null, { timeout: 10_000 }).catch(async () => { await page.reload({ waitUntil: "networkidle" }); });
if (!await page.evaluate(() => Boolean(navigator.serviceWorker?.controller))) throw new Error("Service worker did not control the runtime page.");
const manifests = {};
for (const locale of ["en", "hi"]) {
  const manifest = await page.evaluate((value) => fetch(`/${value}/manifest.webmanifest`).then((response) => response.json()), locale);
  if (manifest.display !== "standalone" || manifest.icons.length !== 2 || manifest.lang !== locale || manifest.icons.some((icon) => !icon.purpose.split(" ").includes("maskable"))) throw new Error(`${locale} manifest verification failed.`);
  manifests[locale] = { display: manifest.display, icons: manifest.icons.length, lang: manifest.lang };
}
const iconDimensions = await page.evaluate(async () => Promise.all([["/icons/coserve-192.png", 192], ["/icons/coserve-512.png", 512]].map(([src, expected]) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => image.naturalWidth === expected && image.naturalHeight === expected ? resolve({ src, width: image.naturalWidth, height: image.naturalHeight }) : reject(new Error(`${src} dimensions are ${image.naturalWidth}x${image.naturalHeight}`)); image.onerror = reject; image.src = src; }))));

const cachedPublicRoute = "/en/services/plumbing/alpha-i";
await stableVisit(cachedPublicRoute);
for (const route of authGateRoutes) await stableVisit(route);
const cachedBeforeOffline = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).map((request) => new URL(request.url).pathname)))).flat());
if (authGateRoutes.some((route) => cachedBeforeOffline.includes(route))) throw new Error(`Private route entered cache: ${JSON.stringify(cachedBeforeOffline)}`);

await context.setOffline(true);
await page.goto(`${base}${cachedPublicRoute}`, { waitUntil: "domcontentloaded" });
const offlinePublicText = await page.locator("body").innerText();
if (!offlinePublicText.toLocaleLowerCase().includes("coserve")) throw new Error(`Cached public category/locality route unavailable offline: ${offlinePublicText.slice(0, 160)}`);
for (const route of authGateRoutes) {
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
  const expected = route.startsWith("/hi/") ? "ऑफ़लाइन" : "offline";
  if (!(await page.locator("body").innerText()).toLocaleLowerCase().includes(expected.toLocaleLowerCase())) throw new Error(`Private offline route did not fail closed: ${route}`);
}
await page.goto(`${base}/hi/account`, { waitUntil: "domcontentloaded" });
if (!(await page.locator("body").innerText()).includes("ऑफ़लाइन")) throw new Error("Hindi private offline route was not localized.");
await context.setOffline(false);
await browser.close();

const failures = results.filter((item) => item.violations.length);
console.log(JSON.stringify({ publicRenderedContentScans: publicContentRoutes.length, unauthenticatedGateScans: authGateRoutes.length, accessibilityViolations: failures, responsiveChecks: responsive.length, keyboardSkipLink: true, dialogKeyboardAndFocusReturn: true, zoom200: true, reducedMotion, manifests, iconDimensions, offlinePublicCategoryLocality: true, offlinePrivateFallbacks: authGateRoutes.length + 1, privateRoutesCached: false }));
if (failures.length) process.exitCode = 1;
