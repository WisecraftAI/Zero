import { ArchDiagram } from '@/components/ui/ArchDiagram';
import { Card, CardGrid } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';
import { SchemaEr } from '@/components/ui/SchemaEr';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GENERATED_WORKFLOW, type GeneratedTask } from '@/data/generated';
import { REPOS } from '@/data/repos';
import { TECH_DETAILS, type ContractItem, type ContractKind } from '@/data/techDetails';
import { ModuleFacts } from './ModuleFacts';
import { WorkspaceLld } from './WorkspaceLld';
import styles from './WorkspaceTech.module.scss';

const KIND_LABEL: Record<ContractKind, string> = {
  http: 'HTTP',
  sse: 'SSE',
  queue: 'queue',
  event: 'event',
  db: 'SQL',
  blob: 'blob',
  call: 'call',
  fn: 'fn',
  data: 'data',
};

function ContractList({ items, empty }: { items: readonly ContractItem[]; empty: string }) {
  if (items.length === 0) return <p className={styles.none}>{empty}</p>;
  return (
    <ul className={styles.contractItems}>
      {items.map((it) => (
        <li key={it.label}>
          <span className={styles.kind} data-kind={it.kind}>
            {KIND_LABEL[it.kind]}
          </span>
          <code className={styles.wire}>{it.label}</code>
          <span className={styles.detail}>{it.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function tasksFor(id: string): GeneratedTask[] {
  const ids = GENERATED_WORKFLOW.byWorkspace[id] ?? [];
  return ids
    .map((tid) => GENERATED_WORKFLOW.tasks.find((t) => t.id === tid))
    .filter((t): t is GeneratedTask => t !== undefined);
}

function Roadmap({ id }: { id: string }) {
  const tasks = tasksFor(id);
  if (tasks.length === 0) {
    return (
      <Note tone="info">
        No milestone maps directly to this workspace. Follow the general loop:{' '}
        <code>npm run workflow:status</code> → implement the earliest unfinished milestone →{' '}
        <code>npm run workflow:verify</code>.
      </Note>
    );
  }
  return (
    <ol className={styles.roadmap}>
      {tasks.map((t) => (
        <li key={t.id} className={styles.task}>
          <div className={styles.taskHead}>
            <code className={styles.taskId}>{t.id}</code>
            <strong>{t.name}</strong>
            <StatusBadge status={t.status} />
            <span className={styles.track}>{t.track}</span>
          </div>
          <p className={styles.taskSummary}>{t.summary}</p>
          {t.dependsOn.length > 0 && (
            <p className={styles.deps}>
              runs after {t.dependsOn.join(' · ')}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * One workspace, end to end: what it is, how it is built, how it communicates,
 * what is on disk, and how a human or an agent should change it. Curated intent +
 * diagram + contract from TECH_DETAILS; disk facts + roadmap from `npm run docs`.
 */
export function WorkspaceTech({ id }: { id: string }) {
  const repo = REPOS.find((r) => r.id === id);
  const detail = TECH_DETAILS[id];
  if (repo === undefined || detail === undefined) {
    return (
      <p className={styles.none}>
        No detail for <code>{id}</code>.
      </p>
    );
  }

  return (
    <article className={styles.ws}>
      <header className={styles.head}>
        <h3 className={styles.title}>
          {repo.name} <StatusBadge status={repo.status} />
        </h3>
        <p className={styles.identity}>
          <code>{repo.path}</code> · npm <code>{repo.pkg}</code> · skill <code>{repo.skill}</code>
        </p>
        <p className={styles.mission}>{detail.mission}</p>
      </header>

      <h4 className={styles.h4}>Architecture</h4>
      <ArchDiagram spec={detail.diagram} />

      {id === 'db' && (
        <>
          <h4 className={styles.h4}>Schema · ER</h4>
          <p className={styles.sub}>
            What <code>initAllTables</code> creates. Markdown twin:{' '}
            <code>support/zero-docs/docs/v1/DATABASE.md</code>.
          </p>
          <SchemaEr />
        </>
      )}

      <h4 className={styles.h4}>Design pattern</h4>
      <ul className={styles.tags}>
        {repo.patterns.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <ul className={styles.design}>
        {detail.design.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <h4 className={styles.h4}>API &amp; communication contract</h4>
      <div className={styles.contract}>
        <div className={styles.contractCol}>
          <h5 className={styles.h5}>Consumes · inbound</h5>
          <ContractList
            items={detail.inbound}
            empty="Entry point — this workspace initiates calls rather than receiving them."
          />
        </div>
        <div className={styles.contractCol}>
          <h5 className={styles.h5}>Emits · outbound</h5>
          <ContractList
            items={detail.outbound}
            empty="Pure — no I/O. It is imported, and returns values in-process."
          />
        </div>
      </div>

      <WorkspaceLld id={id} />

      <h4 className={styles.h4}>Structure &amp; facts · read from disk</h4>
      <ModuleFacts id={id} />

      <h4 className={styles.h4}>How to work on it</h4>
      <CardGrid columns={2}>
        <Card title="If you are a human">
          <ol className={styles.steps}>
            {detail.humanSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
        <Card title="If you are an agent">
          <ol className={styles.steps}>
            {detail.agentSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
      </CardGrid>

      <h5 className={styles.h5}>Roadmap for this workspace · generated</h5>
      <p className={styles.sub}>
        The two tracks are strictly sequential — capability (M1→M7) then packaging (S0→S6). A task
        that touches two workspaces is coordinated, not parallel. Steps below are gated by their{' '}
        <em>runs after</em> dependencies.
      </p>
      <Roadmap id={id} />
    </article>
  );
}
