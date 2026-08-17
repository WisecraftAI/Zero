import styles from './Footer.module.scss';

export function Footer() {
  return (
    <footer className={styles.footer}>
      ZER0 · Target architecture docs · scored against the live tree ·
      React 19 + Vite 6 + TypeScript strict
    </footer>
  );
}
