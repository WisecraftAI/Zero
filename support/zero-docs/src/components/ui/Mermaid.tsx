import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '@/hooks/useTheme';
import styles from './Mermaid.module.scss';

let renderSeq = 0;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function mermaidConfig(): Parameters<typeof mermaid.initialize>[0] {
  const text = cssVar('--text');
  const panel = cssVar('--panel');
  const panel2 = cssVar('--panel-2');
  const line = cssVar('--line');
  const lineStrong = cssVar('--line-strong');
  const signal = cssVar('--signal');
  const mute = cssVar('--mute');
  const canvas = cssVar('--canvas');
  const tint = cssVar('--tint-info');
  const sans = cssVar('--font-sans');
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';

  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: sans,
    themeVariables: {
      darkMode: dark,
      background: canvas,
      primaryColor: panel2,
      primaryTextColor: text,
      primaryBorderColor: lineStrong,
      lineColor: signal,
      secondaryColor: panel,
      tertiaryColor: tint,
      mainBkg: panel,
      nodeBorder: lineStrong,
      clusterBkg: panel2,
      titleColor: text,
      actorBkg: panel,
      actorBorder: signal,
      actorTextColor: text,
      actorLineColor: lineStrong,
      signalColor: signal,
      signalTextColor: text,
      labelBoxBkgColor: panel,
      labelBoxBorderColor: line,
      labelTextColor: mute,
      loopTextColor: mute,
      noteBkgColor: tint,
      noteTextColor: text,
      noteBorderColor: signal,
      activationBkgColor: tint,
      sequenceNumberColor: panel,
      attributeBackgroundColorOdd: panel,
      attributeBackgroundColorEven: panel2,
      fontFamily: sans,
    },
    er: { useMaxWidth: true },
    sequence: {
      useMaxWidth: true,
      actorMargin: 28,
      messageMargin: 32,
      mirrorActors: false,
      wrap: true,
    },
  };
}

export interface MermaidProps {
  chart: string;
  ariaLabel: string;
}

/**
 * Official Mermaid API for React: initialize with startOnLoad false, then
 * mermaid.render(uniqueId, definition) → SVG. Charts are static strings from
 * this repo, never user input.
 */
export function Mermaid({ chart, ariaLabel }: MermaidProps) {
  const host = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, '');
  const [theme] = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = host.current;
    if (el === null) return undefined;

    let cancelled = false;
    renderSeq += 1;
    const id = `zmd${reactId}${String(renderSeq)}`;

    const draw = async (): Promise<void> => {
      mermaid.initialize(mermaidConfig());
      try {
        const { svg } = await mermaid.render(id, chart);
        if (cancelled || host.current === null) return;
        host.current.innerHTML = svg;
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Mermaid failed to render';
        setError(message);
      }
    };

    void draw();
    return () => {
      cancelled = true;
    };
  }, [chart, theme, reactId]);

  return (
    <figure className={styles.box} aria-label={ariaLabel}>
      {error !== null && (
        <p className={styles.err} role="alert">
          {error}
        </p>
      )}
      <div ref={host} className={styles.svg} />
    </figure>
  );
}
