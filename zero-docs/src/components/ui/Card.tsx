import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Card.module.scss';

export interface CardProps {
  title?: ReactNode;
  as?: 'div' | 'article' | 'section';
}

export function Card({ title, as: Tag = 'div', children }: PropsWithChildren<CardProps>) {
  return (
    <Tag className={styles.card}>
      {title !== undefined && <h4 className={styles.title}>{title}</h4>}
      <div className={styles.body}>{children}</div>
    </Tag>
  );
}

export function CardGrid({
  children,
  columns = 'auto',
}: PropsWithChildren<{ columns?: 'auto' | 1 | 2 | 3 }>) {
  const cls =
    columns === 1
      ? styles.grid1
      : columns === 2
        ? styles.grid2
        : columns === 3
          ? styles.grid3
          : styles.gridAuto;
  return <div className={cls}>{children}</div>;
}
