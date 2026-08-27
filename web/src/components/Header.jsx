import './Header.scss';

/* Wisecraft AI Brand Logo - Bird in speech bubble (matches official logo) */
function WisecraftLogoIcon({ className, size = 36 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Speech bubble shape */}
      <path
        d="M8 6h28a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H18l-8 8v-8H8a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z"
        fill="#2563eb"
      />
      {/* Bird head/face - simplified parrot profile */}
      <ellipse cx="26" cy="20" rx="10" ry="12" fill="white" />
      {/* Bird beak */}
      <path
        d="M16 18c-3 0-5 2-5 4s2 3 4 2l6-4c-1-1-3-2-5-2z"
        fill="white"
      />
      {/* Eye */}
      <circle cx="28" cy="17" r="3" fill="#2563eb" />
      <circle cx="29" cy="16" r="1" fill="white" />
    </svg>
  );
}

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
        <div className="wisecraft-branding">
          <a href="https://wisecraft.ai/" target="_blank" rel="noopener noreferrer" className="wisecraft-link">
            <WisecraftLogoIcon className="wisecraft-logo-icon" size={40} />
            <span className="wisecraft-text">
              <span className="wisecraft-brand-name">
                <span className="wise-part">wise</span><span className="craft-part">craft.</span>
              </span>
              <span className="wisecraft-tagline">AI-Driven Innovation</span>
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
