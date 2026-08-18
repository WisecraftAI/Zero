import { useMemo, type ReactNode } from 'react';
import { SubTabs, type SubTabDef } from '@/components/layout/SubTabs';
import { Card, CardGrid } from '@/components/ui/Card';
import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';
import { RepoIdentity } from '@/components/ui/RepoIdentity';
import { useHashTab } from '@/hooks/useHashTab';
import { ANALYZER_DOC } from '@/data/analyzerDoc.generated';
import { PACKAGES_DOC } from '@/data/packagesDoc.generated';
import { REPOS } from '@/data/repos';
import { SchemaEr } from '@/components/ui/SchemaEr';
import styles from './Packages.module.scss';

const PACKAGE_ORDER = ['analyzer', 'domain', 'db', 'locators', 'builders', 'cloud'] as const;

const PKG_TABS = PACKAGE_ORDER.map((id) => {
  const repo = REPOS.find((r) => r.id === id);
  return {
    id: `pkg-${id}`,
    label: id === 'analyzer' ? 'Analyzer' : (repo?.name ?? id),
    tag: repo?.pkg ?? '',
  };
}) satisfies readonly SubTabDef[];

const DEFAULT_PKG_TAB = 'pkg-analyzer';

interface LivePackageDocModel {
  generatedAt: string;
  description: string;
  main: string | null;
  fileCount: number;
  loc: number;
  dependencies: string[];
  workspaceDeps: string[];
  entries: ReadonlyArray<{
    file: string;
    role: string;
    reExportsFrom: string | null;
    exports: readonly string[];
  }>;
  modules: ReadonlyArray<{
    folder: string;
    role: string;
    modules: ReadonlyArray<{ file: string; loc: number; exports: readonly string[] }>;
  }>;
  tree: string;
  tests: readonly string[];
}

function LivePackageDoc({
  doc,
  repoId,
}: {
  doc: LivePackageDocModel;
  repoId: string;
}) {
  const when = new Date(doc.generatedAt).toLocaleString();
  const repo = REPOS.find((r) => r.id === repoId);

  return (
    <>
      <h3>{repo?.name ?? repoId} · live-code doc</h3>
      <RepoIdentity id={repoId} />
      <p className="sub">{doc.description || repo?.purpose}</p>

      <Note tone="info">
        Generated from disk — facade exports, <code>lib/</code> modules, and folder tree. Last
        generated <strong>{when}</strong> · {doc.fileCount} files · {doc.loc.toLocaleString()} LOC
        {doc.workspaceDeps.length > 0 && (
          <>
            {' '}
            · workspace deps{' '}
            {doc.workspaceDeps.map((dep) => (
              <code key={dep} className={styles.dep}>
                {dep}
              </code>
            ))}
          </>
        )}
        .
      </Note>

      {doc.tests.length > 0 && (
        <Note tone="info">
          Jest coverage:{' '}
          {doc.tests.map((t) => (
            <code key={t} className={styles.dep}>
              {t}
            </code>
          ))}
        </Note>
      )}

      <h4 className={styles.h4}>Facade entries</h4>
      <p className="sub">
        Package <code>main</code> is <code>{doc.main ?? '—'}</code>. Root files are thin re-exports
        into <code>lib/</code>.
      </p>
      <CardGrid columns={3}>
        {doc.entries.map((entry) => (
          <Card key={entry.file} title={<code>{entry.file}</code>}>
            <p className={styles.strategy}>{entry.role}</p>
            {entry.reExportsFrom !== null ? (
              <p className={styles.reexport}>
                re-exports <code>{entry.reExportsFrom}</code>
              </p>
            ) : (
              <ul className={styles.exports}>
                {entry.exports.map((name) => (
                  <li key={name}>
                    <code>{name}</code>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </CardGrid>

      <h4 className={styles.h4}>Module map</h4>
      <Diagram ariaLabel={`${repoId} module tree`}>{doc.tree}</Diagram>

      {doc.modules.length > 0 && (
        <>
          <h4 className={styles.h4}>lib/ modules · exported symbols</h4>
          <div className={styles.folders}>
            {doc.modules.map((folder) => (
              <section key={folder.folder} className={styles.folder}>
                <h5 className={styles.folderName}>
                  <code>{folder.folder}/</code>
                  {folder.role !== '' && <span className={styles.role}> — {folder.role}</span>}
                </h5>
                <ul className={styles.moduleList}>
                  {folder.modules.map((mod) => (
                    <li key={mod.file}>
                      <code>{mod.file.split('/').pop()}</code>
                      <span className={styles.loc}> · {mod.loc} LOC</span>
                      {mod.exports.length > 0 && (
                        <span className={styles.moduleExports}>
                          {' '}
                          {mod.exports.map((name) => (
                            <code key={name} className={styles.dep}>
                              {name}
                            </code>
                          ))}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

    </>
  );
}

function AnalyzerDoc() {
  return (
    <LivePackageDoc
      repoId="analyzer"
      doc={{
        ...ANALYZER_DOC,
        workspaceDeps: ANALYZER_DOC.dependencies.filter((d) => d.startsWith('@zero/')),
        entries: ANALYZER_DOC.entries.map((e) => ({ ...e, role: e.strategy })),
        tests: ['test/analyzer.test.js', 'test/proFlows.test.js'],
      }}
    />
  );
}

function PackagePanel({ id }: { id: string }) {
  let body: ReactNode;
  if (id === 'analyzer') {
    body = <AnalyzerDoc />;
  } else {
    const doc = PACKAGES_DOC.find((p) => p.id === id);
    if (doc !== undefined) {
      body = <LivePackageDoc repoId={id} doc={doc} />;
    } else {
      const repo = REPOS.find((r) => r.id === id);
      if (repo === undefined) {
        return null;
      }
      body = (
        <>
          <h3>{repo.name}</h3>
          <RepoIdentity id={id} />
          <p className="sub">{repo.purpose}</p>
          <Note tone="info">{repo.statusNote}</Note>
        </>
      );
    }
  }

  return (
    <>
      {body}
      {id === 'db' && (
        <>
          <h4 className={styles.h4}>Schema · ER</h4>
          <SchemaEr />
        </>
      )}
    </>
  );
}

const PKG_ALIASES: Record<string, string> = {
  'tech-domain': 'pkg-domain',
  'tech-db': 'pkg-db',
  'tech-locators': 'pkg-locators',
  'tech-builders': 'pkg-builders',
  'tech-analyzer': 'pkg-analyzer',
  'tech-cloud': 'pkg-cloud',
};

export function PackagesPage() {
  const tabIds = useMemo(() => [...PKG_TABS.map((t) => t.id), ...Object.keys(PKG_ALIASES)], []);
  const [rawTab, setTab] = useHashTab(tabIds, DEFAULT_PKG_TAB);
  const tab = PKG_ALIASES[rawTab] ?? rawTab;
  const activeId = tab.replace(/^pkg-/, '');

  return (
    <section className="section" id="packages-intro">
      <h2>Packages · shared @zero/* libraries</h2>
      <p className="sub">
        Pure code shared by <code>services/*</code> — no HTTP, no SDKs (except{' '}
        <code>@zero/cloud</code>). Each sub-tab is generated from the live package tree on disk;
        run <code>npm run packages-doc</code> or <code>npm run analyser-doc</code> to refresh.
      </p>

      <SubTabs tabs={PKG_TABS} active={tab} onSelect={setTab} ariaLabel="Shared package views" />

      <div id={`subpanel-${tab}`} role="tabpanel" aria-labelledby={`subtab-${tab}`}>
        <PackagePanel id={activeId} />
      </div>
    </section>
  );
}
