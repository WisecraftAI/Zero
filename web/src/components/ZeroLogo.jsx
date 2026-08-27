import { useId } from 'react';
import './ZeroLogo.scss';

/**
 * ZERO brand mark: a ring (the "0") enclosing a geometric "Z" whose three
 * strokes stand for the pipeline walk. Colours come from the active theme so
 * the mark follows every palette ThemePicker can set.
 */
export function ZeroMark({ size = 32, className = '', title }) {
  const gradientId = useId();

  return (
    <svg
      className={`zero-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-hover)" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <circle cx="16" cy="16" r="10.25" stroke="var(--on-accent)" strokeOpacity=".26" strokeWidth="1.2" />
      <path
        d="M11 11.5h10L11 20.5h10"
        stroke="var(--on-accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full lockup: mark plus the ZERO wordmark and an optional product line. */
export default function ZeroLogo({ size = 30, tagline, className = '' }) {
  return (
    <span className={`zero-logo ${className}`.trim()}>
      <ZeroMark size={size} />
      <span className="zero-logo-text">
        <span className="zero-logo-word">ZERO</span>
        {tagline && <span className="zero-logo-tagline">{tagline}</span>}
      </span>
    </span>
  );
}
