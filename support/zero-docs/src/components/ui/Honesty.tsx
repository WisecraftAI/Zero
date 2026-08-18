import type { ReactNode } from 'react';
import styles from './Honesty.module.scss';

export interface HonestyItem {
  label: ReactNode;
  detail?: ReactNode;
}

export interface HonestyProps {
  worksTitle?: string;
  stubTitle?: string;
  works: readonly HonestyItem[];
  stub: readonly HonestyItem[];
}

/**
 * Two-column split showing what works today vs what's advertised/broken.
 * Deliberately blunt — the whole doc's honesty rests on this.
 */
export function Honesty({
  worksTitle = 'works today',
  stubTitle = 'ui present · not wired',
  works,
  stub,
}: HonestyProps) {
  return (
    <div className={styles.grid}>
      <section className={`${styles.col} ${styles.works}`}>
        <h5 className={styles.h5}>{worksTitle}</h5>
        <ul>
          {works.map((it, i) => (
            <li key={i}>
              <strong>{it.label}</strong>
              {it.detail !== undefined && <> — {it.detail}</>}
            </li>
          ))}
        </ul>
      </section>
      <section className={`${styles.col} ${styles.stub}`}>
        <h5 className={styles.h5}>{stubTitle}</h5>
        <ul>
          {stub.map((it, i) => (
            <li key={i}>
              <strong>{it.label}</strong>
              {it.detail !== undefined && <> — {it.detail}</>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
