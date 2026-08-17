import type { PropsWithChildren } from 'react';
import styles from './Note.module.scss';

export type NoteTone = 'info' | 'warn' | 'danger';

export function Note({ tone = 'warn', children }: PropsWithChildren<{ tone?: NoteTone }>) {
  return (
    <aside className={`${styles.note} ${styles[tone]}`} role="note">
      {children}
    </aside>
  );
}
