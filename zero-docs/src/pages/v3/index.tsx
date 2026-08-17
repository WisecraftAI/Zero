import { useMemo } from 'react';
import { SubTabs, type SubTabDef } from '@/components/layout/SubTabs';
import { useHashTab } from '@/hooks/useHashTab';

import { Why } from './sections/Why';
import { Layout } from './sections/Layout';
import { Repos } from './sections/Repos';
import { Sequence } from './sections/Sequence';
import { MoveMap } from './sections/Map';
import { Docker } from './sections/Docker';
import { Order } from './sections/Order';
import { Connect } from './sections/Connect';
import { PerApp } from './sections/PerApp';
import { Smell } from './sections/Smell';
import { Tests } from './sections/Tests';
import { Best } from './sections/Best';
import { CrossCutting } from './sections/CrossCutting';
import { Risks } from './sections/Risks';

import { LldWeb } from './lld/Web';
import { LldApi } from './lld/Api';
import { LldOrchestrator } from './lld/Orchestrator';
import { LldExecutor } from './lld/Executor';
import { LldCloud } from './lld/Cloud';
import { LldLibs } from './lld/Libs';

const LLD_TABS = [
  { id: 'v3-lld-web',   label: 'Web UI',                 tag: '@zero/web' },
  { id: 'v3-lld-api',   label: 'HTTP API',               tag: '@zero/api' },
  { id: 'v3-lld-orch',  label: 'Orchestrator worker',    tag: '@zero/orchestrator' },
  { id: 'v3-lld-exec',  label: 'Playwright executor',    tag: '@zero/executor' },
  { id: 'v3-lld-cloud', label: 'Cloud adapters',         tag: '@zero/cloud' },
  { id: 'v3-lld-libs',  label: 'Shared packages',        tag: 'domain · db · locators · builders · analyzer' },
] as const satisfies readonly SubTabDef[];

export function V3Page() {
  const lldIds = useMemo(() => LLD_TABS.map((t) => t.id), []);
  const [lld, setLld] = useHashTab(lldIds, 'v3-lld-web');

  return (
    <>
      <Why />
      <Layout />
      <Repos />
      <Sequence />
      <MoveMap />

      <section className="section" id="v3-lld">
        <h2>Low-level design · per project</h2>
        <p className="sub">
          One tab per workspace. Each row names the folder, npm package, and Cursor skill, then
          splits what works on disk now from what S5–S6 still owe.
        </p>

        <SubTabs tabs={LLD_TABS} active={lld} onSelect={setLld} ariaLabel="V3 project LLDs" />

        <div id={`subpanel-${lld}`} role="tabpanel" aria-labelledby={`subtab-${lld}`}>
          {lld === 'v3-lld-web'   && <LldWeb />}
          {lld === 'v3-lld-api'   && <LldApi />}
          {lld === 'v3-lld-orch'  && <LldOrchestrator />}
          {lld === 'v3-lld-exec'  && <LldExecutor />}
          {lld === 'v3-lld-cloud' && <LldCloud />}
          {lld === 'v3-lld-libs'  && <LldLibs />}
        </div>
      </section>

      <Connect />
      <PerApp />
      <Docker />
      <Order />
      <Smell />
      <Tests />
      <Best />
      <CrossCutting />
      <Risks />
    </>
  );
}
