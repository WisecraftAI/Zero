import { useTheme } from '@/hooks/useTheme';
import styles from './ThemeToggle.module.scss';

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      className={styles.btn}
      aria-label={`Switch to ${next} theme`}
      aria-pressed={theme === 'dark'}
      onClick={() => setTheme(next)}
    >
      {next === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}
