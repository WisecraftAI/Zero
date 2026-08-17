import type { ReactNode } from 'react';
import styles from './ProvidersTable.module.scss';

export interface ProvidersTableProps {
  headers: readonly string[];
  rows: ReadonlyArray<readonly ReactNode[]>;
  caption?: string;
}

export function ProvidersTable({ headers, rows, caption }: ProvidersTableProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        {caption !== undefined && <caption className={styles.caption}>{caption}</caption>}
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (j === 0
                ? <th key={j} scope="row">{c}</th>
                : <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
