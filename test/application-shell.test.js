import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const shell = readFileSync(new URL("../components/auth/app-shell-client.jsx", import.meta.url), "utf8");
const account = readFileSync(new URL("../components/auth/account-panel.jsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../components/landing-page.jsx", import.meta.url), "utf8");
const homeSession = readFileSync(new URL("../components/home-session-actions.jsx", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../components/marketplace/catalog-admin.jsx", import.meta.url), "utf8");

describe("authenticated application shell", () => {
  it("builds navigation from roles and active organization assignments", () => {
    expect(shell).toContain('user.roles.includes("worker")');
    expect(shell).toContain("scope.cooperatives.length");
    expect(shell).toContain("scope.federations.length");
    expect(shell).toContain('user.roles.includes("system_admin")');
    expect(shell).toMatch(/apiClient\s*\.myCooperatives\(\)/);
    expect(shell).toMatch(/apiClient\s*\.myFederations\(\)/);
    expect(shell).toContain("shellSession = { user: data.user, scope: nextScope }");
    expect(shell).toContain("useState(!shellSession.user)");
  });

  it("marks active routes and provides an accessible dismissible mobile drawer", () => {
    expect(shell).toContain('aria-current={active ? "page" : undefined}');
    expect(shell).toContain('aria-expanded={open}');
    expect(shell).toContain('role="dialog"');
    expect(shell).toContain('aria-modal="true"');
    expect(shell).toContain('e.key === "Escape"');
    expect(shell).toContain("e.target === e.currentTarget");
    expect(shell).toContain("opener?.focus()");
  });

  it("keeps destination navigation out of the account body", () => {
    expect(account).not.toContain("<Link");
    expect(account).toContain('role="tablist"');
    expect(account).toContain("identity-card");
  });

  it("keeps the public home server-rendered while isolating session-aware actions", () => {
    expect(home).not.toContain('"use client"');
    expect(home).not.toContain("useEffect");
    expect(home).toContain("<HomeSessionActions");
    expect(homeSession).toContain('"use client"');
    expect(homeSession).toContain("apiClient.me()");
    expect(homeSession).toContain("labels.openWorkspace");
  });

  it("opens only one compact catalog editor at a time", () => {
    expect(catalog).toContain('const [editing, setEditing] = useState("")');
    expect(catalog).toContain("open = editing === key");
    expect(catalog).toContain("open && <div className=\"catalog-editor\"");
  });
});
