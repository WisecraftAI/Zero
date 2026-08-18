import type { MigStatus } from '@/data/migration';
import { STATUS_LABEL } from '@/data/migration';
import styles from './StatusBadge.module.scss';

export function StatusBadge({ status }: { status: MigStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{STATUS_LABEL[status]}</span>;
}
