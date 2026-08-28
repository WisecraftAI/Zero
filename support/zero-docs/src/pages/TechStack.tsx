import { useMemo } from 'react';
import { SubTabs, type SubTabDef } from '@/components/layout/SubTabs';
import { Note } from '@/components/ui/Note';
import { SchemaEr } from '@/components/ui/SchemaEr';
import { useHashTab } from '@/hooks/useHashTab';
import { GENERATED_LLD } from '@/data/generated';
import { REPOS } from '@/data/repos';
import { WorkspaceTech } from './tech/WorkspaceTech';

/**
 * Tab order: Schema · ER first, then the four deployables.
 * Shared @zero/* libraries live on the Packages tab only.
 */
const DEPLOYABLE_ORDER = ['web', 'api', 'orchestrator', 'executor'] as const;

const TECH_TABS = [
  { id: 'tech-schema', label: 'Schema · ER', tag: 'Postgres' },
  ...DEPLOYABLE_ORDER.map((id) => {
    const repo = REPOS.find((r) => r.id === id);
    return {
      id: `tech-${id}`,
      label: repo?.name ?? id,
      tag: repo?.pkg ?? '',
    };
  }),
] satisfies readonly SubTabDef[];

const DEFAULT_TAB = 'tech-schema';

export function TechStackPage() {
  const ids = useMemo(() => TECH_TABS.map((t) => t.id), []);
  const [tab, setTab] = useHashTab(ids, DEFAULT_TAB);
  const when = new Date(GENERATED_LLD.generatedAt).toLocaleString();

  return (
    <section className="section" id="tech-intro">
      <h2>Tech · every workspace, end to end</h2>
      <p className="sub">
        <strong>Schema · ER</strong> is the Postgres catalog (ten tables, one enforced FK) plus a
        start-run sequence. The other tabs cover the four deployables — Web UI, HTTP API,
        orchestrator, and executor. Each includes low-level design (module maps, sequences,
        works/stub honesty). Shared <code>@zero/*</code> libraries are on{' '}
        <a href="#packages">Packages</a>.
      </p>

      <Note tone="info">
        Curated architecture diagrams, LLD, design patterns, and contracts live here. Cloud provider
        wiring is on <a href="#deploy-cloud">Deployment → Cloud</a>. Shared packages (domain, db,
        locators, builders, analyzer, cloud) are documented on{' '}
        <a href="#packages">Packages</a> — generated from disk via{' '}
        <code>npm run packages-doc</code>. Deployable structure trees and roadmap: run{' '}
        <code>npm run docs</code> at the repo root. Last generated <strong>{when}</strong>.
        System-level tiers and Docker are on <a href="#architecture">Architecture</a>.
      </Note>

      <SubTabs tabs={TECH_TABS} active={tab} onSelect={setTab} ariaLabel="Workspace tech views" />

      <div id={`subpanel-${tab}`} role="tabpanel" aria-labelledby={`subtab-${tab}`}>
        {tab === 'tech-schema' ? (
          <SchemaEr />
        ) : (
          <WorkspaceTech id={tab.replace(/^tech-/, '')} />
        )}
      </div>
    </section>
  );
}
