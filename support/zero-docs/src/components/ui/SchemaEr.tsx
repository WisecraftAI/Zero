import { JumpNav } from '@/components/layout/JumpNav';
import { Card, CardGrid } from '@/components/ui/Card';
import { Diagram } from '@/components/ui/Diagram';
import { Mermaid } from '@/components/ui/Mermaid';
import { Note } from '@/components/ui/Note';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { RUN_SEQUENCE_MERMAID, SCHEMA_ER_MERMAID } from '@/data/diagrams';
import {
  SCHEMA_ASSETS,
  SCHEMA_ASCII,
  SCHEMA_GROUPS,
  SCHEMA_RELATIONS,
  SCHEMA_TABLES,
  type SchemaColumn,
  type SchemaTable,
} from '@/data/schema';
import styles from './SchemaEr.module.scss';

function colFlags(c: SchemaColumn): string {
  const bits: string[] = [];
  if (c.pk === true) bits.push('PK');
  if (c.notNull === true && c.pk !== true) bits.push('NOT NULL');
  if (c.def !== undefined) bits.push(`default ${c.def}`);
  return bits.join(' · ');
}

function TableCard({ table }: { table: SchemaTable }) {
  return (
    <Card
      as="article"
      title={
        <>
          <code>{table.name}</code>
        </>
      }
    >
      <p className={styles.purpose}>{table.purpose}</p>
      <p className={styles.meta}>
        <span>
          <code>{table.init}()</code>
        </span>
        {table.unique !== undefined && table.unique.length > 0 && (
          <span>
            unique <code>{table.unique.join(', ')}</code>
          </span>
        )}
        {table.indexes.map((idx) => (
          <span key={idx}>
            idx <code>{idx}</code>
          </span>
        ))}
      </p>
      <table className={styles.cols}>
        <thead>
          <tr>
            <th scope="col">Column</th>
            <th scope="col">Type</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {table.columns.map((c) => (
            <tr key={c.name}>
              <td>
                {c.name}
                {colFlags(c) !== '' && <span className={styles.flags}>{colFlags(c)}</span>}
              </td>
              <td>{c.type}</td>
              <td>{c.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/**
 * ER sketch + column catalog for `@zero/db`. Data lives in `src/data/schema.ts`
 * so the Tech tab and the V3 LLD cannot drift.
 */
export function SchemaEr() {
  return (
    <section id="tech-schema">
      <p className={styles.intro}>
        Nine tables from <code>packages/db/lib/schema/init.js</code> <code>initAllTables</code>. The
        only enforced foreign key is <code>qa_assets.run_id → qa_runs(id) ON DELETE CASCADE</code>.
        Every other <code>project_id</code> / <code>run_id</code> is a TEXT column with no{' '}
        <code>REFERENCES</code>. Postgres is optional — unset <code>DATABASE_URL</code> falls back
        to memory + <code>dist/artifacts/&lt;runId&gt;/run.json</code>.
      </p>

      <JumpNav
        ariaLabel="Schema sections"
        updateHash={false}
        links={[
          { href: '#schema-er', label: 'ER diagram', hot: true },
          { href: '#schema-seq', label: 'Sequence' },
          { href: '#schema-rels', label: 'Relationships' },
          { href: '#schema-runs', label: 'Runs' },
          { href: '#schema-projects', label: 'Projects' },
          { href: '#schema-locators', label: 'Locators' },
          { href: '#schema-providers', label: 'LLM settings' },
        ]}
      />

      <h3 id="schema-er" className={styles.h3}>
        Entity relationship
      </h3>
      <div className={styles.legend} aria-label="Relationship kinds">
        <span className={styles.chip}>
          <b>{SCHEMA_TABLES.length}</b> tables
        </span>
        <span className={styles.chip} data-kind="enforced">
          <b>1</b> enforced FK
        </span>
        <span className={styles.chip} data-kind="logical">
          <b>{SCHEMA_RELATIONS.filter((r) => r.kind === 'logical').length}</b> logical links
        </span>
      </div>

      <Mermaid
        ariaLabel="ZER0 Postgres entity relationship diagram"
        chart={SCHEMA_ER_MERMAID}
      />

      <h3 id="schema-seq" className={styles.h3}>
        Sequence · start a run
      </h3>
      <p className={styles.intro}>
        UI → API → queue → orchestrator DAG → executor Chromium → reports. Solid arrows are calls;
        dashed arrows are replies. Paths are S7 (no <code>/api</code> prefix).
      </p>
      <Mermaid ariaLabel="ZER0 start-a-run sequence diagram" chart={RUN_SEQUENCE_MERMAID} />

      <details className={styles.ascii}>
        <summary>ASCII ER sketch (copy-paste)</summary>
        <Diagram ariaLabel="ZER0 Postgres entity relationship diagram, ASCII">{SCHEMA_ASCII}</Diagram>
      </details>

      <h5 id="schema-rels" className={styles.h5}>
        Relationships
      </h5>
      <ProvidersTable
        caption="Enforced = REFERENCES in DDL. Logical = matching TEXT column, no constraint."
        headers={['Child', 'Column', 'Parent', 'Kind', 'Notes']}
        rows={SCHEMA_RELATIONS.map((r) => [
          <code key={`${r.from}-t`}>{r.from}</code>,
          <code key={`${r.from}-c`}>{r.fromCol}</code>,
          <>
            <code>{r.to}</code>
            <span className={styles.arrow}>.</span>
            <code>{r.toCol}</code>
          </>,
          <span key={`${r.from}-k`} className={styles.kind} data-kind={r.kind}>
            {r.kind}
          </span>,
          r.note,
        ])}
      />

      <Note tone="info">
        Login passwords never land here. <code>sanitizeRunInput</code> strips{' '}
        <code>loginPassword</code> / <code>password</code> / <code>login.password</code> before{' '}
        <code>upsertRun</code>. Provider secrets are stored encrypted in{' '}
        <code>provider_keys.encrypted_key</code> only.
      </Note>

      {SCHEMA_GROUPS.map((g) => {
        const tables = SCHEMA_TABLES.filter((t) => t.group === g.id);
        return (
          <div key={g.id} id={`schema-${g.id}`} className={styles.group}>
            <h5 className={styles.h5}>
              {g.label} · {tables.map((t) => t.name).join(' · ')}
            </h5>
            <CardGrid columns={g.id === 'runs' ? 1 : 2}>
              {tables.map((t) => (
                <TableCard key={t.name} table={t} />
              ))}
            </CardGrid>
          </div>
        );
      })}

      <h5 className={styles.h5}>qa_assets rows written by replaceAssets</h5>
      <ProvidersTable
        headers={['asset_type', 'asset_name', 'When']}
        rows={SCHEMA_ASSETS.map((a) => [
          <code key={a.type}>{a.type}</code>,
          <code key={`${a.type}-n`}>{a.name}</code>,
          a.when,
        ])}
      />
    </section>
  );
}
