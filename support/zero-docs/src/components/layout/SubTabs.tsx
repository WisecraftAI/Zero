import { useRef } from 'react';
import styles from './SubTabs.module.scss';

export interface SubTabDef {
  id: string;
  label: string;
  tag?: string;
}

export interface SubTabsProps {
  tabs: readonly SubTabDef[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}

export function SubTabs({ tabs, active, onSelect, ariaLabel }: SubTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (from: number, delta: 1 | -1) => {
    const next = (from + delta + tabs.length) % tabs.length;
    const t = tabs[next];
    if (t) {
      refs.current[next]?.focus();
      onSelect(t.id);
    }
  };
  return (
    <div className={styles.bar} role="tablist" aria-label={ariaLabel}>
      {tabs.map((t, i) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`subtab-${t.id}`}
            aria-controls={`subpanel-${t.id}`}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={`${styles.tab} ${on ? styles.on : ''}`}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(i, 1); }
              if (e.key === 'ArrowLeft')  { e.preventDefault(); move(i, -1); }
            }}
          >
            <span>{t.label}</span>
            {t.tag !== undefined && <span className={styles.tag}>{t.tag}</span>}
          </button>
        );
      })}
    </div>
  );
}
