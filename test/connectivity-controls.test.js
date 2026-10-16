import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveConnectivity } from "../components/connectivity-controls.jsx";
describe("connectivity and install chrome", () => {
  it("trusts a successful CoServe health probe over stale browser offline state", () => { expect(resolveConnectivity({ healthOk: true, browserOnline: false })).toBe("online"); expect(resolveConnectivity({ healthOk: false, browserOnline: true })).toBe("unreachable"); expect(resolveConnectivity({ healthOk: false, browserOnline: false })).toBe("offline"); });
  it("supports recovery probes and header-contained install controls", () => { const source = readFileSync(new URL("../components/connectivity-controls.jsx", import.meta.url), "utf8"); const shell = readFileSync(new URL("../components/auth/app-shell-client.jsx", import.meta.url), "utf8"); expect(source).toContain('addEventListener("online", probe)'); expect(source).toContain('addEventListener("offline", probe)'); expect(source).toContain("beforeinstallprompt"); expect(source).toContain("dismissInstall"); expect(shell).toMatch(/<ShellUtilities\s*\/>/); expect(source).not.toContain("pwa-controls"); });
});
