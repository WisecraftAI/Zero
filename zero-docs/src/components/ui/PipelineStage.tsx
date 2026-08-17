import type { PropsWithChildren, ReactNode } from 'react';
import styles from './PipelineStage.module.scss';

export interface PipelineStageProps {
  id: string;
  title: ReactNode;
}

export function Pipeline({ children }: PropsWithChildren) {
  return <div className={styles.pipeline}>{children}</div>;
}

export function PipelineStage({
  id,
  title,
  children,
}: PropsWithChildren<PipelineStageProps>) {
  return (
    <article className={styles.stage}>
      <div className={styles.badge}>{id}</div>
      <div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.body}>{children}</p>
      </div>
    </article>
  );
}
