import { Diagram } from '@/components/ui/Diagram';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GENERATED_LLD } from '@/data/generated';
import { REPOS } from '@/data/repos';
import styles from './Tech.module.scss';

function findGenerated(id: string) {
  return GENERATED_LLD.modules.find((m) => m.id === id);
}

function findRepo(id: string) {
  return REPOS.find((r) => r.id === id);
}

function extSummary(filesByExt: Record<string, number>): string {
  return Object.entries(filesByExt)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, n]) => `${n}× ${ext}`)
    .join(' · ');
}

/**
 * Per-workspace low-level design card. Facts (deps, LOC, tree, scripts) are read
 * from disk by `npm run docs`; design patterns + done/not-done come from the
 * curated REPOS table so the two never silently drift.
 */
export function ModuleFacts({ id }: { id: string }) {
  const gen = findGenerated(id);
  const repo = findRepo(id);
  if (gen === undefined || repo === undefined) {
    return (
      <p className={styles.missing}>
        No generated data for <code>{id}</code>. Run <code>npm run docs</code>.
      </p>
    );
  }

  return (
    <article className={styles.module}>
      <header className={styles.moduleHead}>
        <h4 className={styles.moduleTitle}>
          {repo.name} <StatusBadge status={repo.status} />
        </h4>
        <p className={styles.identity}>
          <code>{repo.path}</code> · npm <code>{repo.pkg}</code> · skill <code>{repo.skill}</code>
        </p>
        <p className={styles.desc}>{gen.description || repo.purpose}</p>
      </header>

      <dl className={styles.facts}>
        <div>
          <dt>Lines of code</dt>
          <dd>{gen.loc.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Source files</dt>
          <dd>
            {gen.fileCount} <span className={styles.muted}>({extSummary(gen.filesByExt)})</span>
          </dd>
        </div>
        <div>
          <dt>Entry</dt>
          <dd>{gen.entry !== null ? <code>{gen.entry}</code> : <span className={styles.muted}>—</span>}</dd>
        </div>
        <div>
          <dt>Image / tests</dt>
          <dd>
            {gen.hasDockerfile ? 'Dockerfile' : 'no Dockerfile'} ·{' '}
            {gen.hasTests ? 'tests' : 'no tests'}
          </dd>
        </div>
      </dl>

      <div className={styles.cols}>
        <div>
          <h5 className={styles.h5}>Design patterns</h5>
          <ul className={styles.tags}>
            {repo.patterns.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className={styles.h5}>Modules used (runtime)</h5>
          <p className={styles.deplist}>
            {gen.workspaceDeps.map((d) => (
              <code key={d} className={styles.zdep}>
                {d}
              </code>
            ))}
            {gen.runtimeDeps.map((d) => (
              <code key={d}>{d}</code>
            ))}
            {gen.workspaceDeps.length === 0 && gen.runtimeDeps.length === 0 && (
              <span className={styles.muted}>no runtime dependencies</span>
            )}
          </p>
        </div>
      </div>

      <h5 className={styles.h5}>Application structure · read from disk</h5>
      <Diagram ariaLabel={`${repo.name} folder tree`}>{gen.tree}</Diagram>

      <p className={styles.gap}>
        <strong>Current vs target:</strong> {repo.statusNote}
      </p>
    </article>
  );
}
