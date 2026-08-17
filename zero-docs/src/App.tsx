import { useCallback, useMemo } from 'react';
import { Chrome } from './components/layout/Chrome';
import { Hero } from './components/layout/Hero';
import { Tabs } from './components/layout/Tabs';
import { Footer } from './components/layout/Footer';
import { useHashTab } from './hooks/useHashTab';
import { DEFAULT_TAB, TAB_ALIASES, TABS } from './tabs';
import { OverviewPage } from './pages/Overview';
import { ArchitecturePage } from './pages/Architecture';
import { MakeRealPage } from './pages/MakeReal';
import { ChecklistPage } from './pages/Checklist';

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
        <Tabs tabs={TABS} active={active} onSelect={onSelect} ariaLabel="ZER0 architecture views" />
      </Chrome>

      <div className="wrap">
        <Hero
          lede={
            <>
              <strong>Target architecture</strong> to implement, scored{' '}
              <strong>done / not done</strong> against the live tree. One Architecture tab
              (tiers, sequence, repos, Docker), plus <strong>agent-workflow</strong> and the
              ship checklist — grounded in <code>apps/</code> + <code>packages/</code> +{' '}
              <code>web/</code>.
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
          {active === 'overview'     && <OverviewPage />}
          {active === 'architecture' && <ArchitecturePage />}
          {active === 'make-real'    && <MakeRealPage />}
          {active === 'checklist'    && <ChecklistPage />}
        </main>

        <Footer />
      </div>
    </>
  );
}
