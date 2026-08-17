import { useCallback, useMemo } from 'react';
import { Chrome } from './components/layout/Chrome';
import { Hero } from './components/layout/Hero';
import { Tabs } from './components/layout/Tabs';
import { Footer } from './components/layout/Footer';
import { useHashTab } from './hooks/useHashTab';
import { DEFAULT_TAB, TABS } from './tabs';
import { OverviewPage } from './pages/Overview';
import { RuntimeTodayPage } from './pages/RuntimeToday';
import { BlueprintPage } from './pages/Blueprint';
import { ChecklistPage } from './pages/Checklist';
import { V3Page } from './pages/v3';

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
  const [active, setActive] = useHashTab(validIds, DEFAULT_TAB);

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
              <strong>Runtime today</strong>, <strong>the production blueprint</strong>,
              <strong> the ship checklist</strong>, and{' '}
              <strong>the V3 repo + Docker shape</strong> — grounded in{' '}
              <code>server.js</code> + <code>lib/</code>, aimed at the multi-cloud target in{' '}
              <code>architectureV2.html</code>.
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
          {active === 'overview'  && <OverviewPage />}
          {active === 'today'     && <RuntimeTodayPage />}
          {active === 'blueprint' && <BlueprintPage />}
          {active === 'checklist' && <ChecklistPage />}
          {active === 'v3'        && <V3Page />}
        </main>

        <Footer />
      </div>
    </>
  );
}
