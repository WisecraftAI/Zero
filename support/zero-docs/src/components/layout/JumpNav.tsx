import type { MouseEvent, ReactNode } from 'react';
import styles from './JumpNav.module.scss';

export interface JumpLink {
  href: string;
  label: ReactNode;
  hot?: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function jumpTo(
  href: string,
  event: MouseEvent<HTMLAnchorElement>,
  updateHash: boolean,
) {
  const id = href.replace(/^#/, '');
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
  if (updateHash) history.replaceState(null, '', href);
}

export function JumpNav({
  links,
  ariaLabel,
  updateHash = true,
}: {
  links: readonly JumpLink[];
  ariaLabel: string;
  /** Keep false for in-page jumps that must not steal the tab hash (e.g. #tech-schema). */
  updateHash?: boolean;
}) {
  return (
    <nav className={styles.nav} aria-label={ariaLabel}>
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className={l.hot === true ? styles.hot : undefined}
          onClick={(e) => jumpTo(l.href, e, updateHash)}
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
