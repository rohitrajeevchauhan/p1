import { getTranslations } from "next-intl/server";
import { ShellClient } from "./app-shell-client.jsx";

export async function AuthShell({
  children,
  locale,
  title,
  description,
  alternate,
  hideWorkspaceLabel = false,
}) {
  const t = await getTranslations({ locale, namespace: "Navigation" });
  const keys = [
    "primary",
    "services",
    "requests",
    "notifications",
    "workspace",
    "footer",
    "forCooperatives",
    "forWorkers",
    "signIn",
    "marketplace",
    "local",
    "bilingual",
    "cooperative",
    "workspaceNav",
    "overviewGroup",
    "overview",
    "customerGroup",
    "workerGroup",
    "workerProfile",
    "workerJobs",
    "workerFinance",
    "cooperativeGroup",
    "operations",
    "workers",
    "offerings",
    "bookings",
    "finance",
    "oversightGroup",
    "oversight",
    "workerAudit",
    "bookingOversight",
    "financeOversight",
    "affiliations",
    "systemGroup",
    "organizations",
    "catalog",
    "settings",
    "openMenu",
    "closeMenu",
    "loading",
  ];
  const navigation = Object.fromEntries(keys.map((key) => [key, t(key)]));
  return (
    <ShellClient
      locale={locale}
      title={title}
      description={description}
      alternate={alternate}
      hideWorkspaceLabel={hideWorkspaceLabel}
      focused={Boolean(alternate)}
      navigation={navigation}
    >
      {children}
    </ShellClient>
  );
}
