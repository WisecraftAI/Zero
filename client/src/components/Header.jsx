import './Header.css';

/* ZERO QA Brand: Monochrome White Shield with Checkmark - min 32px, clearspace 10px */
function ZeroLogoIcon({ className, size = 40 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Shield outline - polygon, flat top, pointed bottom */}
      <path
        d="M32 4L56 16v24c0 11-10 20-24 24-14-4-24-13-24-24V16L32 4z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Checkmark */}
      <path
        d="M18 32l10 10 18-22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo-block">
          <div className="logo-icon-wrap" style={{ minWidth: 32, minHeight: 32 }}>
            <ZeroLogoIcon className="logo-icon" size={40} />
          </div>
          <div className="logo-text">
            <h1 className="logo-word">ZERO</h1>
            <p className="motto">Defects Eliminated</p>
            <p className="tagline">CSV-driven QA pipeline · Run · Assert · Review</p>
          </div>
        </div>
      </div>
    </header>
  );
}
