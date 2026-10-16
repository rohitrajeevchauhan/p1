import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import { LanguageSwitcher } from "./language-switcher.jsx";
import { Card } from "./ui/card.jsx";
import { ShellUtilities } from "./connectivity-controls.jsx";
import { HomeSessionActions } from "./home-session-actions.jsx";

function CooperativeMark() {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 40 40">
      <path d="M20 3 35 11v18l-15 8L5 29V11L20 3Z" fill="currentColor" opacity=".16" />
      <path d="M12 21.5 17.5 27 29 14.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

export function LandingPage() {
  const translations = useTranslations("HomePage");
  const locale = useLocale();

  return (
    <main className="landing-shell">
      <header className="site-header">
        <a className="brand" href="#main-content" aria-label="CoServe home">
          <CooperativeMark />
          <span>CoServe</span>
        </a>
        <nav className="home-nav" aria-label={translations("navigation")}><Link href={`/${locale}/services`}>{translations("browseServices")}</Link><Link href={`/${locale}/organizations/register/cooperative`}>{translations("forCooperatives")}</Link><ShellUtilities/><LanguageSwitcher /></nav>
      </header>

      <section className="hero" id="main-content">
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__content">
          <p className="eyebrow">{translations("eyebrow")}</p>
          <h1>{translations("title")}</h1>
          <p className="summary">{translations("summary")}</p>
          <p className="promise">{translations("promise")}</p>
          <div className="hero-actions">
            <Link className="primary-button" href={`/${locale}/services`}>
              {translations("browseServices")}
            </Link>
            <HomeSessionActions locale={locale} labels={{ register: translations("register"), signIn: translations("signIn"), openWorkspace: translations("openWorkspace") }} />
          </div>
        </div>

        <Card>
          <div className="foundation-card__mark">
            <CooperativeMark />
          </div>
          <ul className="foundation-list">
            <li>{translations("identityLabel")}</li>
            <li>{translations("locationLabel")}</li>
            <li>{translations("languageLabel")}</li>
          </ul>
        </Card>
      </section>
      <section className="home-services" aria-labelledby="home-services-title"><div><p className="eyebrow">{translations("servicesEyebrow")}</p><h2 id="home-services-title">{translations("servicesTitle")}</h2></div><div className="home-category-grid">{["plumbing","electrical","cleaning","carpentry"].map((key, index) => <Link href={`/${locale}/services`} className="home-category" key={key}><span>0{index + 1}</span><strong>{translations(`categories.${key}`)}</strong><small>{translations("viewCategory")}</small></Link>)}</div></section>
      <section className="home-process" aria-labelledby="home-process-title"><p className="eyebrow">{translations("processEyebrow")}</p><h2 id="home-process-title">{translations("processTitle")}</h2><ol>{["discover","request","coordinate"].map((key, index) => <li key={key}><span>{index + 1}</span><div><h3>{translations(`process.${key}.title`)}</h3><p>{translations(`process.${key}.body`)}</p></div></li>)}</ol></section>
      <section className="home-entry"><div><p className="eyebrow">{translations("participateEyebrow")}</p><h2>{translations("participateTitle")}</h2></div><div className="home-entry-grid"><article><h3>{translations("workerTitle")}</h3><p>{translations("workerBody")}</p><Link className="secondary-button" href={`/${locale}/workers/onboarding`}>{translations("workerAction")}</Link></article><article><h3>{translations("cooperativeTitle")}</h3><p>{translations("cooperativeBody")}</p><Link className="secondary-button" href={`/${locale}/organizations/register/cooperative`}>{translations("cooperativeAction")}</Link></article></div></section>
      <footer className="home-footer"><div className="brand"><CooperativeMark/><span>CoServe</span></div><p>{translations("footer")}</p><Link href={`/${locale}/login`}>{translations("signIn")}</Link></footer>
    </main>
  );
}
