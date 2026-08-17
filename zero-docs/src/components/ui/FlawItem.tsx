import type { PropsWithChildren, ReactNode } from 'react';
import styles from './FlawItem.module.scss';

export type Severity = 'p0' | 'p1' | 'p2' | 'gate';

export interface FlawItemProps {
  severity: Severity;
  tag: string;
  title: ReactNode;
}

export function FlawItem({
  severity,
  tag,
  title,
  children,
}: PropsWithChildren<FlawItemProps>) {
  return (
    <article className={`${styles.item} ${styles[severity]}`}>
      <h3 className={styles.head}>
        <span className={styles.tag}>{tag}</span>
        {title}
      </h3>
      <p className={styles.body}>{children}</p>
    </article>
  );
}
