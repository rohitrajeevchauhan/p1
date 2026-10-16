"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../../lib/api-client.js";
import { LanguageSwitcher } from "../language-switcher.jsx";
import { Icon } from "../ui/icon.jsx";
import { ShellUtilities } from "../connectivity-controls.jsx";

const emptyScope = { cooperatives: [], federations: [] };
let shellSession = { user: null, scope: emptyScope };

export function clearShellSession() {
  shellSession = { user: null, scope: emptyScope };
}

const isPublic = (path) =>
  /\/services(?:$|\/(?!request))/.test(path) ||
  /\/cooperatives\//.test(path) ||
  /\/workers\/(?!jobs$|finance$|onboarding$)[^/]+$/.test(path);
function Brand({ locale }) {
  return (
    <Link className="shell-brand" href={`/${locale}`} aria-label="CoServe">
      <span className="shell-brand__mark">✓</span>
      <span>
        <strong>CoServe</strong>
      </span>
    </Link>
  );
}

function PublicShell({ children, locale, title, description, navigation: n }) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header__inner">
          <Brand locale={locale} />
          <nav aria-label={n.primary}>
            <Link href={`/${locale}/services`}>{n.services}</Link>
            <Link href={`/${locale}/organizations/register/cooperative`}>
              {n.forCooperatives}
            </Link>
            <Link href={`/${locale}/workers/onboarding`}>{n.forWorkers}</Link>
          </nav>
          <div className="public-header__actions">
            <ShellUtilities />
            <LanguageSwitcher />
            <Link className="button button--quiet" href={`/${locale}/login`}>
              {n.signIn}
            </Link>
          </div>
        </div>
      </header>
      {title && (
        <section
          className="public-page-heading"
          aria-labelledby="public-page-title"
        >
          <p className="eyebrow">{n.marketplace}</p>
          <h1 id="public-page-title">{title}</h1>
          <p>{description}</p>
        </section>
      )}
      <main className="public-content">{children}</main>
      <footer className="public-footer">
        <Brand locale={locale} />
        <p>{n.footer}</p>
        <nav>
          <Link href={`/${locale}/services`}>{n.services}</Link>
          <Link href={`/${locale}/login`}>{n.signIn}</Link>
        </nav>
      </footer>
    </div>
  );
}
function FocusedShell({
  children,
  locale,
  title,
  description,
  alternate,
  navigation: n,
}) {
  return (
    <main className="focused-shell">
      <header>
        <Brand locale={locale} />
        <div className="public-header__actions">
          <ShellUtilities />
          <LanguageSwitcher />
        </div>
      </header>
      <div className="focused-layout">
        <section className="focused-intro">
          <p className="eyebrow">{n.marketplace}</p>
          <h1 id="public-page-title">{title}</h1>
          <p>{description}</p>
          <div className="focused-trust">
            <span>✓ {n.local}</span>
            <span>✓ {n.bilingual}</span>
            <span>✓ {n.cooperative}</span>
          </div>
        </section>
        <section className="focused-card">
          {children}
          {alternate && (
            <p className="auth-alternate">
              {alternate.label}{" "}
              <Link href={alternate.href}>{alternate.action}</Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function SessionAwarePublicShell(props) {
  const [authenticated, setAuthenticated] = useState(Boolean(shellSession.user));

  useEffect(() => {
    let active = true;
    apiClient
      .me()
      .then(() => active && setAuthenticated(true))
      .catch(() => active && setAuthenticated(false));
    return () => {
      active = false;
    };
  }, []);

  return authenticated ? (
    <AuthenticatedShell {...props} />
  ) : (
    <PublicShell {...props} />
  );
}
function groupsFor(user, scope, locale, n) {
  const link = (label, path, icon) => ({
    label: n[label],
    href: `/${locale}${path}`,
    icon,
  });
  const groups = [
    {
      label: n.overviewGroup,
      items: [
        link("overview", "/account", "home"),
        link("notifications", "/notifications", "bell"),
      ],
    },
    {
      label: n.customerGroup,
      items: [
        link("services", "/services", "search"),
        link("requests", "/requests", "clipboard"),
      ],
    },
  ];
  if (user.roles.includes("worker"))
    groups.push({
      label: n.workerGroup,
      items: [
        link("workerProfile", "/workers/onboarding", "user"),
        link("workerJobs", "/workers/jobs", "briefcase"),
        link("workerFinance", "/workers/finance", "wallet"),
      ],
    });
  if (scope.cooperatives.length)
    groups.push({
      label: n.cooperativeGroup,
      items: [
        link("operations", "/admin/operations", "grid"),
        link("workers", "/admin/workers", "users"),
        link("offerings", "/admin/offerings", "briefcase"),
        link("bookings", "/admin/bookings", "clipboard"),
        link("finance", "/admin/finance", "wallet"),
      ],
    });
  if (user.roles.includes("system_admin") || scope.federations.length)
    groups.push({
      label: n.oversightGroup,
      items: [
        link("oversight", "/admin/operations-oversight", "grid"),
        link("workerAudit", "/admin/worker-audits", "shield"),
        link("bookingOversight", "/admin/booking-oversight", "clipboard"),
        link("financeOversight", "/admin/finance-oversight", "wallet"),
        ...(scope.federations.length
          ? [link("affiliations", "/federation/affiliations", "building")]
          : []),
      ],
    });
  if (user.roles.includes("system_admin"))
    groups.push({
      label: n.systemGroup,
      items: [
        link("organizations", "/admin/organizations", "building"),
        link("catalog", "/admin/catalog", "grid"),
        link("settings", "/admin/settings", "settings"),
      ],
    });
  return groups;
}
function Sidebar({ groups, path, onNavigate, locale, n }) {
  return (
    <aside className="app-sidebar">
      <Brand locale={locale} />
      <nav aria-label={n.workspaceNav}>
        {groups.map((group) => (
          <section className="sidebar-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.items.map((item) => {
              const active =
                path === item.href ||
                (item.href !== `/${locale}/account` &&
                  path.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </section>
        ))}
      </nav>
      <p className="sidebar-foot">{n.footer}</p>
    </aside>
  );
}

function AuthenticatedShell({
  children,
  locale,
  title,
  description,
  navigation: n,
  hideWorkspaceLabel = false,
}) {
  const path = usePathname(),
    router = useRouter(),
    trigger = useRef(null),
    drawer = useRef(null);
  const [user, setUser] = useState(shellSession.user),
    [scope, setScope] = useState(shellSession.scope),
    [open, setOpen] = useState(false),
    [loading, setLoading] = useState(!shellSession.user);
  useEffect(() => {
    let active = true;
    apiClient
      .me()
      .then(async ({ data }) => {
        if (!active) return;
        setUser(data.user);
        const [cooperatives, federations] = await Promise.all([
          data.user.roles.includes("cooperative_admin")
            ? apiClient
                .myCooperatives()
                .then((x) => x.data.cooperatives)
                .catch(() => [])
            : [],
          data.user.roles.includes("federation_admin")
            ? apiClient
                .myFederations()
                .then((x) => x.data.federations)
                .catch(() => [])
            : [],
        ]);
        if (active) {
          const nextScope = { cooperatives, federations };
          shellSession = { user: data.user, scope: nextScope };
          setScope(nextScope);
        }
      })
      .catch(() => {
        clearShellSession();
        router.replace(`/${locale}/login?returnTo=${encodeURIComponent(path)}`);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [locale, path, router]);
  useEffect(() => {
    if (!open) return;
    const opener = trigger.current,
      panel = drawer.current;
    panel?.querySelector("a")?.focus();
    const keyboard = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll("a, button:not([disabled])")];
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      opener?.focus();
    };
  }, [open]);
  const groups = useMemo(
    () => (user ? groupsFor(user, scope, locale, n) : []),
    [user, scope, locale, n],
  );
  if (loading || !user)
    return (
      <main className="shell-loading" role="status">
        {n.loading}
      </main>
    );
  return (
    <div className="application-shell">
      <div className="desktop-sidebar">
        <Sidebar groups={groups} path={path} locale={locale} n={n} />
      </div>
      {open && (
        <div
          className="drawer-layer"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            ref={drawer}
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={n.workspaceNav}
          >
            <button
              className="icon-button drawer-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label={n.closeMenu}
            >
              <Icon name="close" />
            </button>
            <Sidebar
              groups={groups}
              path={path}
              locale={locale}
              n={n}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
      <div className="app-main">
        <header className="app-topbar">
          <button
            ref={trigger}
            className="icon-button menu-trigger"
            type="button"
            aria-label={n.openMenu}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="topbar-title">
            {!hideWorkspaceLabel && <span>{n.workspace}</span>}
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <ShellUtilities />
            <Link
              className="icon-button"
              aria-label={n.notifications}
              href={`/${locale}/notifications`}
            >
              <Icon name="bell" />
            </Link>
            <LanguageSwitcher />
            <Link className="profile-chip" href={`/${locale}/account`}>
              <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
              <strong>{user.displayName}</strong>
            </Link>
          </div>
        </header>
        <main className="app-content">
          <header className="app-page-heading">
            {!hideWorkspaceLabel && <p className="eyebrow">{n.workspace}</p>}
            <h1 id="public-page-title">{title}</h1>
            <p>{description}</p>
          </header>
          <div className="app-surface">{children}</div>
        </main>
      </div>
    </div>
  );
}
export function ShellClient(props) {
  const path = usePathname();
  if (props.focused || path.includes("/organizations/register/"))
    return <FocusedShell {...props} />;
  if (isPublic(path)) return <SessionAwarePublicShell {...props} />;
  return <AuthenticatedShell {...props} />;
}
