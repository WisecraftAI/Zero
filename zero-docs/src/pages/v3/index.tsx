import { useMemo } from 'react';
import { JumpNav } from '@/components/layout/JumpNav';
import { SubTabs, type SubTabDef } from '@/components/layout/SubTabs';
import { useHashTab } from '@/hooks/useHashTab';

import { Why } from './sections/Why';
import { Layout } from './sections/Layout';
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
  { id: 'v3-lld-web',   label: 'web',            tag: 'SPA' },
  { id: 'v3-lld-api',   label: 'api',            tag: 'intake' },
  { id: 'v3-lld-orch',  label: 'orchestrator',   tag: 'DAG' },
  { id: 'v3-lld-exec',  label: 'executor',       tag: 'Playwright' },
  { id: 'v3-lld-cloud', label: 'packages/cloud', tag: 'adapters' },
  { id: 'v3-lld-libs',  label: 'shared libs',    tag: 'domain · db · locators · builders · analyzer' },
] as const satisfies readonly SubTabDef[];

const JUMP = [
  { href: '#v3-why',     label: 'Why' },
  { href: '#v3-layout',  label: 'Layout' },
  { href: '#v3-map',     label: 'Move map' },
  { href: '#v3-lld',     label: 'LLD per project ▾', hot: true },
  { href: '#v3-connect', label: 'Connect AWS/GCP/Azure' },
  { href: '#v3-per-app', label: 'SAD per-app' },
  { href: '#v3-docker',  label: 'Docker' },
  { href: '#v3-order',   label: 'Migration order' },
  { href: '#v3-smell',   label: 'Quality gates' },
  { href: '#v3-tests',   label: 'Tests' },
  { href: '#v3-best',    label: 'Conventions' },
  { href: '#v3-cross',   label: 'Cross-cutting' },
  { href: '#v3-risks',   label: 'Risks' },
] as const;

export function V3Page() {
  const lldIds = useMemo(() => LLD_TABS.map((t) => t.id), []);
  const [lld, setLld] = useHashTab(lldIds, 'v3-lld-web');

  return (
    <>
      <JumpNav links={JUMP} ariaLabel="V3 quick jump" />

      <Why />
      <Layout />
      <MoveMap />

      <section className="section" id="v3-lld">
        <h2>Low-level design · per project</h2>
        <p className="sub">
          One tab per deployable / package. Each opens with an honesty split — what actually works in{' '}
          <code>server.js</code> today vs what V3 delivers.
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
