import { useCallback, useState } from 'react';
import styles from './PromptBlock.module.scss';

export interface PromptBlockProps {
  label: string;
  text: string;
}

export function PromptBlock({ label, text }: PromptBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      void navigator.clipboard.writeText(text).then(done).catch(done);
      return;
    }
    done();
  }, [text]);

  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.bar}>
        <span>{label}</span>
        <button type="button" className={styles.copy} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <pre className={styles.pre}>
        <code>{text}</code>
      </pre>
    </figure>
  );
}
