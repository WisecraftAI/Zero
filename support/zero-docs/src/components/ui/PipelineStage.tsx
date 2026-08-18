import type { PropsWithChildren, ReactNode } from 'react';
import type { MigStatus } from '@/data/migration';
import { StatusBadge } from './StatusBadge';
import styles from './PipelineStage.module.scss';

export interface PipelineStageProps {
  id: string;
  title: ReactNode;
  status?: MigStatus;
}

export function Pipeline({ children }: PropsWithChildren) {
  return <div className={styles.pipeline}>{children}</div>;
}

export function PipelineStage({
  id,
  title,
  status,
  children,
}: PropsWithChildren<PipelineStageProps>) {
  return (
    <article className={styles.stage}>
      <div className={styles.badge}>{id}</div>
      <div>
        <h3 className={styles.title}>
          {title}
          {status !== undefined && (
            <>
              {' '}
              <StatusBadge status={status} />
            </>
          )}
        </h3>
        <p className={styles.body}>{children}</p>
      </div>
    </article>
  );
}
