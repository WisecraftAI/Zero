import { useCallback, useMemo } from 'react';
import { Chrome } from './components/layout/Chrome';
import { Hero } from './components/layout/Hero';
import { Tabs } from './components/layout/Tabs';
import { Footer } from './components/layout/Footer';
import { useHashTab } from './hooks/useHashTab';
import { DEFAULT_TAB, TAB_ALIASES, TABS } from './tabs';
import { OverviewPage } from './pages/Overview';
import { ArchitecturePage } from './pages/Architecture';
import { TechStackPage } from './pages/TechStack';
import { PackagesPage } from './pages/Packages';
import { DeploymentPage } from './pages/Deployment';
import { MakeRealPage } from './pages/MakeReal';
import { ChecklistPage } from './pages/Checklist';
import { NextMilestonePage } from './pages/NextMilestone';

function pinChrome() {
  const chrome = document.getElementById('docs-chrome');
  if (!chrome) return;
  const top = chrome.offsetTop;
  if (window.scrollY > top + 4) {
    window.scrollTo({ top, behavior: 'auto' });
  }
}

export function App() {
  const validIds = useMemo(() => TABS.map((t) => t.id), []);
  const [active, setActive] = useHashTab(validIds, DEFAULT_TAB, TAB_ALIASES);

  const onSelect = useCallback(
    (id: string) => {
      setActive(id);
      requestAnimationFrame(pinChrome);
    },
    [setActive],
  );

  return (
    <>
      <Chrome>
        <Tabs
          tabs={TABS}
          active={active}
          onSelect={onSelect}
          ariaLabel="ZER0 documentation views"
        />
      </Chrome>

      <div className="wrap">
        <Hero
          lede={
            <>
              <strong>AI-first QA orchestration.</strong> Give ZER0 an OTT URL — a chain of
              specialized agents (Web Analyzer → BA → Manual QA → Automation QA → Manager) calls{' '}
              <strong>OpenAI, Claude, or Gemini</strong> when you add a provider key, then runs
              Playwright execution and ships requirements, test cases, scripts, and executive
              reports in one pass. <strong>Overview</strong> is the product story;{' '}
              <strong>Architecture</strong> and <strong>Tech Stack</strong> cover how it is built.
            </>
          }
        />

        <main
          className="panel"
          key={active}
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
        >
          {active === 'overview' && <OverviewPage />}
          {active === 'architecture' && <ArchitecturePage />}
          {active === 'tech-stack' && <TechStackPage />}
          {active === 'packages' && <PackagesPage />}
          {active === 'deployment' && <DeploymentPage />}
          {active === 'make-real' && <MakeRealPage />}
          {active === 'checklist' && <ChecklistPage />}
          {active === 'next-milestone' && <NextMilestonePage />}
        </main>

        <Footer />
      </div>
    </>
  );
}
