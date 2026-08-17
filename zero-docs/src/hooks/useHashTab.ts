import { useCallback, useEffect, useState } from 'react';

/**
 * Hash-based tab state: reads `location.hash`, writes on select.
 * Accepts a list of valid ids; falls back to the first if the hash is unknown.
 *
 * We split hash into `tab#subtab` shape by looking at the leading segment.
 * Example: `#v3-lld` → tab "v3-lld"; `#v3` → tab "v3".
 */
export function useHashTab(validIds: readonly string[], fallback: string): [string, (id: string) => void] {
  const resolve = useCallback(
    (raw: string) => {
      const id = raw.replace(/^#/, '');
      if (!id) return fallback;
      if (validIds.includes(id)) return id;
      // Allow deep-anchor within a tab: use the leading segment before `-`
      const head = validIds.find((v) => id === v || id.startsWith(`${v}-`));
      return head ?? fallback;
    },
    [validIds, fallback],
  );

  const [current, setCurrent] = useState(() =>
    typeof window === 'undefined' ? fallback : resolve(window.location.hash),
  );

  useEffect(() => {
    const onHash = () => setCurrent(resolve(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [resolve]);

  const select = useCallback((id: string) => {
    if (typeof window === 'undefined') return;
    if (window.location.hash.replace(/^#/, '') !== id) {
      history.replaceState(null, '', `#${id}`);
      setCurrent(id);
    }
  }, []);

  return [current, select];
}
