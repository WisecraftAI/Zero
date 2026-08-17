import { useRef } from 'react';
import styles from './Tabs.module.scss';

export interface TabDef {
  id: string;
  num: string;
  label: string;
  short?: string;
}

export interface TabsProps {
  tabs: readonly TabDef[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}

/**
 * Sticky, keyboard-navigable tab bar.
 * Roving tabindex per ARIA APG; ArrowLeft/ArrowRight moves focus and activates.
 */
export function Tabs({ tabs, active, onSelect, ariaLabel }: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (from: number, delta: 1 | -1) => {
    const next = (from + delta + tabs.length) % tabs.length;
    const target = refs.current[next];
    const tab = tabs[next];
    if (target && tab) {
      target.focus();
      onSelect(tab.id);
    }
  };

  const first = tabs[0];
  const last = tabs[tabs.length - 1];

  return (
    <div className={styles.bar} role="tablist" aria-label={ariaLabel}>
      {tabs.map((t, i) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
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
              if (e.key === 'Home' && first) {
                e.preventDefault();
                onSelect(first.id);
                refs.current[0]?.focus();
              }
              if (e.key === 'End' && last) {
                e.preventDefault();
                onSelect(last.id);
                refs.current[tabs.length - 1]?.focus();
              }
            }}
          >
            <span className={styles.num}>{t.num}</span>
            <span className={styles.labelFull}>{t.label}</span>
            <span className={styles.labelShort} aria-hidden="true">{t.short ?? t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
