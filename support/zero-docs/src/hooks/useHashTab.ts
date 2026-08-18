import { useCallback, useEffect, useState } from 'react';

/**
 * Hash-based tab state: reads `location.hash`, writes on select.
 * Accepts a list of valid ids; falls back to the first if the hash is unknown.
 *
 * Deep anchors map to a parent tab (`#architecture-x` → architecture) or an alias
 * (`#v3-repos` → architecture when aliases.v3 is set).
 */
export function useHashTab(
  validIds: readonly string[],
  fallback: string,
  aliases: Readonly<Record<string, string>> = {},
): [string, (id: string) => void] {
  const resolve = useCallback(
    (raw: string) => {
      const id = raw.replace(/^#/, '');
      if (!id) return fallback;
      if (validIds.includes(id)) return id;
      const mapped = aliases[id];
      if (mapped !== undefined && validIds.includes(mapped)) return mapped;
      for (const [from, to] of Object.entries(aliases)) {
        if (id.startsWith(`${from}-`) && validIds.includes(to)) return to;
      }
      const head = validIds.find((v) => id === v || id.startsWith(`${v}-`));
      return head ?? fallback;
    },
    [validIds, fallback, aliases],
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
