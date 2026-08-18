import type { ReactNode } from 'react';
import styles from './Hero.module.scss';

export interface HeroProps {
  lede: ReactNode;
}

export function Hero({ lede }: HeroProps) {
  return <p className={styles.lede}>{lede}</p>;
}
