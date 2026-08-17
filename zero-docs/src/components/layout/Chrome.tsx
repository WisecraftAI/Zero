import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import styles from './Chrome.module.scss';

export function Chrome({ children }: { children: ReactNode }) {
  return (
    <header className={styles.chrome} id="docs-chrome">
      <div className={styles.inner}>
        <p className={styles.mark}>
          ZER0 <span>docs</span>
        </p>
        <div className={styles.nav}>{children}</div>
        <div className={styles.tools}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
