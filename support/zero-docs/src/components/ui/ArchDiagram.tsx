import { Fragment } from 'react';
import styles from './ArchDiagram.module.scss';

/** Visual role of a node — drives its accent colour and the little role tag. */
export type ArchRole =
  | 'client'
  | 'edge'
  | 'api'
  | 'async'
  | 'worker'
  | 'store'
  | 'external'
  | 'shared';

/** What travels on a connector between two tiers. */
export type ArchWire = 'http' | 'sse' | 'queue' | 'db' | 'call' | 'blob' | 'event' | 'data';

export interface ArchNode {
  label: string;
  /** Second line — protocol, file, or one-liner. */
  sub?: string;
  role: ArchRole;
  /** Highlight the workspace this diagram is about. */
  focus?: boolean;
}

export interface ArchConnector {
  label?: string;
  wire?: ArchWire;
}

export interface ArchTier {
  id: string;
  /** Left-rail label, e.g. "Client", "HTTP API", "Data plane". */
  label: string;
  nodes: readonly ArchNode[];
  /** The arrow *into* this tier from the one above (omit on the first tier). */
  into?: ArchConnector;
}

export interface ArchSpec {
  title?: string;
  caption?: string;
  tiers: readonly ArchTier[];
}

const ROLE_LABEL: Record<ArchRole, string> = {
  client: 'client',
  edge: 'edge',
  api: 'service',
  async: 'queue',
  worker: 'worker',
  store: 'store',
  external: 'external',
  shared: 'shared lib',
};

const WIRE_LABEL: Record<ArchWire, string> = {
  http: 'HTTP',
  sse: 'SSE',
  queue: 'queue',
  db: 'SQL',
  call: 'in-proc',
  blob: 'blob',
  event: 'event',
  data: 'data',
};

function NodeCard({ node }: { node: ArchNode }) {
  return (
    <div
      className={`${styles.node} ${node.focus === true ? styles.focus : ''}`}
      data-role={node.role}
    >
      <span className={styles.nodeRole}>{ROLE_LABEL[node.role]}</span>
      <span className={styles.nodeLabel}>{node.label}</span>
      {node.sub !== undefined && <span className={styles.nodeSub}>{node.sub}</span>}
    </div>
  );
}

function Connector({ into }: { into?: ArchConnector }) {
  const wire = into?.wire;
  return (
    <div className={styles.connector} aria-hidden="true">
      <span className={styles.line} />
      {into?.label !== undefined && (
        <span className={styles.wire} data-wire={wire}>
          {wire !== undefined && <span className={styles.wireKind}>{WIRE_LABEL[wire]}</span>}
          {into.label}
        </span>
      )}
      <span className={styles.arrow} />
    </div>
  );
}

/**
 * Layered architecture infographic. Reads like a tech-lead's whiteboard: numbered
 * tiers top-to-bottom, colour-coded node cards, and labelled connectors that name
 * exactly what crosses each boundary. Theme-aware; degrades to a stacked list on
 * narrow screens. Pure presentation — every fact comes from the caller's spec.
 */
export function ArchDiagram({ spec }: { spec: ArchSpec }) {
  const roles = new Set<ArchRole>();
  for (const tier of spec.tiers) for (const n of tier.nodes) roles.add(n.role);

  const label = spec.title ?? 'architecture diagram';

  return (
    <figure className={styles.fig} role="img" aria-label={label}>
      {(spec.title !== undefined || spec.caption !== undefined) && (
        <figcaption className={styles.cap}>
          {spec.title !== undefined && <span className={styles.capTitle}>{spec.title}</span>}
          {spec.caption !== undefined && <span className={styles.capSub}>{spec.caption}</span>}
        </figcaption>
      )}

      <div className={styles.stack}>
        {spec.tiers.map((tier, i) => (
          <Fragment key={tier.id}>
            {i > 0 && (tier.into !== undefined ? <Connector into={tier.into} /> : <Connector />)}
            <div className={styles.tier}>
              <div className={styles.rail}>
                <span className={styles.tierNum}>{i + 1}</span>
                <span className={styles.tierLabel}>{tier.label}</span>
              </div>
              <div className={styles.nodes}>
                {tier.nodes.map((n, j) => (
                  <NodeCard key={`${tier.id}-${j}`} node={n} />
                ))}
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      <ul className={styles.legend}>
        {[...roles].map((r) => (
          <li key={r} data-role={r}>
            <span className={styles.dot} />
            {ROLE_LABEL[r]}
          </li>
        ))}
      </ul>
    </figure>
  );
}
