import type { PropsWithChildren } from 'react';
import styles from './CodeBlock.module.scss';

export interface CodeBlockProps {
  lang?: string;
  label?: string;
}

/**
 * Non-highlighted, semantic code block. We deliberately do not ship a syntax
 * highlighter — 30 KB for docs is a bad trade. Use bold color tokens via
 * `<span class="hi">…</span>` inside children when accent is needed.
 */
export function CodeBlock({ lang, label, children }: PropsWithChildren<CodeBlockProps>) {
  return (
    <figure className={styles.wrap}>
      {label !== undefined && (
        <figcaption className={styles.label}>
          <span>{label}</span>
          {lang !== undefined && <span className={styles.lang}>{lang}</span>}
        </figcaption>
      )}
      <pre className={styles.pre}>
        <code>{children}</code>
      </pre>
    </figure>
  );
}
