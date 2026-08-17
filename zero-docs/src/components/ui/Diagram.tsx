import type { PropsWithChildren } from 'react';
import styles from './Diagram.module.scss';

export interface DiagramProps {
  ariaLabel: string;
}

export function Diagram({ ariaLabel, children }: PropsWithChildren<DiagramProps>) {
  return (
    <figure className={styles.box} role="img" aria-label={ariaLabel}>
      <pre className={styles.pre}>{children}</pre>
    </figure>
  );
}
