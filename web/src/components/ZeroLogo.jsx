import { useId } from 'react';
import { ICON, MARK, WORDMARK } from './zeroBrandArt';
import './ZeroLogo.scss';

/**
 * ZERO brand artwork:
 *
 *   zero-mark      robot + gear — the only crop that survives the 30px rail
 *   zero-icon      full workflow ring — use at 48px and up
 *   zero-wordmark  ZER0 wordmark
 *   zero-lockup    mark, wordmark, and positioning copy
 *
 * The art is drawn from traced paths (zeroBrandArt.js) rather than an <img>,
 * so every region can be filled from a theme token. That is what lets the logo
 * follow the operator palette instead of shipping one bitmap per colorway.
 * The tokens live in _themes.scss next to the palettes.
 */

const TAGLINE = 'AI-first QA orchestration';

/**
 * Paints one traced artwork. Flat regions take a token directly; the two large
 * regions take a gradient so the shading of the original masters survives.
 */
function BrandArt({ art, size, className = '', label }) {
  // useId() embeds colons, which are legal in markup but trip up anything that
  // later feeds the id to a selector.
  const uid = useId().replace(/:/g, '');
  const fills = {
    accent: `url(#${uid}-accent)`,
    ink: `url(#${uid}-ink)`,
    plate: 'var(--logo-plate)',
    eye: 'var(--logo-eye)',
  };

  // Sizing is optional: the lockup drives its pieces from CSS instead.
  const box = size
    ? { width: size * (art.width / art.height), height: size }
    : null;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${art.width} ${art.height}`}
      width={box?.width}
      height={box?.height}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      <defs>
        {/* Bottom-left to top-right, following the shading of the masters. */}
        <linearGradient id={`${uid}-ink`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--logo-ink)" />
          <stop offset="100%" stopColor="var(--logo-ink-lift)" />
        </linearGradient>
        <linearGradient id={`${uid}-accent`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--logo-accent-deep)" />
          <stop offset="52%" stopColor="var(--logo-accent)" />
          <stop offset="100%" stopColor="var(--logo-accent-soft)" />
        </linearGradient>
      </defs>
      {/* Layers overlap on purpose — order is load-bearing. */}
      {art.layers.map((layer) => (
        <path key={layer.role} d={layer.d} fill={fills[layer.role]} />
      ))}
    </svg>
  );
}

/** Square brand mark. `ring` swaps in the full workflow circle for large sizes. */
export function ZeroMark({ size = 32, ring = false, className = '', label }) {
  return (
    <BrandArt
      art={ring ? ICON : MARK}
      size={size}
      label={label}
      className={`zero-mark ${className}`.trim()}
    />
  );
}

/** ZER0 wordmark. `size` is the rendered height in px; width follows the art. */
export function ZeroWordmark({ size = 26, className = '', label = 'ZERO' }) {
  return (
    <BrandArt
      art={WORDMARK}
      size={size}
      label={label}
      className={`zero-wordmark ${className}`.trim()}
    />
  );
}

/** Mark plus wordmark, with the tagline as live text so it stays crisp. */
export default function ZeroLogo({ size = 34, tagline, className = '' }) {
  return (
    <span className={`zero-logo ${className}`.trim()}>
      <ZeroMark size={size} ring={size >= 48} />
      <span className="zero-logo-text">
        <ZeroWordmark size={size * 0.62} />
        {tagline && <span className="zero-logo-tagline">{tagline}</span>}
      </span>
    </span>
  );
}

/**
 * Ring, wordmark, and tagline. The tagline is live text rather than baked
 * artwork, so it stays sharp at any size and is readable to a screen reader.
 * The capability strip that the raster lockup carried lives with the page that
 * wants it — repeating it here duplicated copy the marketing view already has.
 */
export function ZeroLogoFull({ width = 360, className = '' }) {
  return (
    // `width` is a ceiling, not a fixed size. The lockup fills whatever space
    // it is given up to that, and scales its copy off its own rendered width,
    // so it stays proportioned on narrow screens without a breakpoint.
    <div className={`zero-lockup ${className}`.trim()} style={{ maxWidth: width }}>
      <div className="zero-lockup-stack">
        <BrandArt art={ICON} className="zero-lockup-icon" />
        <BrandArt art={WORDMARK} className="zero-lockup-wordmark" label="ZERO" />
        <p className="zero-lockup-tagline">{TAGLINE}</p>
      </div>
    </div>
  );
}
