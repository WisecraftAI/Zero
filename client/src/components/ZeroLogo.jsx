import './ZeroLogo.css';

export default function ZeroLogo({ size = 40, showWordmark = true, className = '' }) {
  return (
    <div className={`zero-logo ${className}`.trim()}>
      <svg width={size} height={size} viewBox="0 0 88 88" fill="none" aria-hidden="true">
        <defs>
          <radialGradient id="zero-core" cx="0" cy="0" r="1" gradientTransform="translate(44 44) rotate(90) scale(40)">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#12102a" />
          </radialGradient>
          <linearGradient id="zero-trace" x1="20" y1="20" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle cx="44" cy="44" r="40" fill="url(#zero-core)" stroke="#6d40d9" strokeWidth="2" />
        <path d="M24 36c4-7 11-10 19-10m20 12c-2-8-8-14-16-17m-2 44c-8 0-15-4-19-11m43-7c-4 9-12 14-22 14" stroke="url(#zero-trace)" strokeWidth="7" strokeLinecap="round" opacity="0.95"/>
        <path d="M27 52l2-10m33-6l-8-5m-17 32l-9-4m36-13l-8 8" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="30" cy="27" r="3" fill="#a78bfa"/>
        <circle cx="64" cy="61" r="3" fill="#a78bfa"/>
        <circle cx="65" cy="27" r="3" fill="#a78bfa"/>
      </svg>
      {showWordmark && <span className="zero-logo-wordmark">ZERO</span>}
    </div>
  );
}

