import React from 'react';

/**
 * On-brand SVG illustrations used across the site in place of stock photography.
 * All artwork uses the official NZUD palette:
 *   navy   #0d2347
 *   navy d #081735
 *   orange #f47820
 *   silver #c8ccd1
 *
 * These render crisply at any size, never 404, and visually align with the
 * supplied flyer / business-card branding.
 */

interface BrandImageProps {
  variant: 'locator' | 'trench' | 'map' | 'mark';
  className?: string;
  title?: string;
}

const Locator: React.FC = () => (
  <svg viewBox="0 0 600 400" className="w-full h-full" aria-hidden>
    <defs>
      <linearGradient id="bg-locator" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#15326b" />
        <stop offset="100%" stopColor="#081735" />
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0d2347" />
        <stop offset="100%" stopColor="#050d22" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#bg-locator)" />
    {/* Grid */}
    <g stroke="#1c3a73" strokeWidth="1" opacity="0.6">
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 50} x2="600" y2={i * 50} />
      ))}
    </g>
    {/* Ground line */}
    <rect x="0" y="260" width="600" height="140" fill="url(#ground)" />
    <line x1="0" y1="260" x2="600" y2="260" stroke="#f47820" strokeWidth="2" />

    {/* Underground utility lines (colour coded) */}
    <path d="M0,310 Q150,295 300,310 T600,300" stroke="#f47820" strokeWidth="6" fill="none" />
    <path d="M0,340 Q150,360 300,340 T600,355" stroke="#3aa6ff" strokeWidth="6" fill="none" />
    <path d="M0,375 Q150,365 300,378 T600,370" stroke="#ffd23a" strokeWidth="6" fill="none" />

    {/* Locator wand */}
    <g transform="translate(255 70)">
      {/* handle */}
      <rect x="38" y="0" width="14" height="170" rx="4" fill="#c8ccd1" />
      <rect x="32" y="0" width="26" height="22" rx="4" fill="#f47820" />
      {/* head */}
      <ellipse cx="45" cy="190" rx="70" ry="14" fill="#f47820" />
      <ellipse cx="45" cy="190" rx="55" ry="9" fill="#0d2347" />
      {/* signal arcs */}
      <g stroke="#f47820" strokeWidth="2.5" fill="none" opacity="0.85">
        <path d="M-25,210 Q45,180 115,210" />
        <path d="M-45,225 Q45,180 135,225" opacity="0.6" />
        <path d="M-65,240 Q45,180 155,240" opacity="0.4" />
      </g>
      {/* operator hand */}
      <circle cx="45" cy="11" r="9" fill="#c8ccd1" />
    </g>

    {/* Brand label */}
    <g>
      <rect x="20" y="20" width="6" height="34" fill="#f47820" />
      <text x="36" y="38" fill="#ffffff" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="16" letterSpacing="2">
        EMF LOCATING
      </text>
      <text x="36" y="56" fill="#c8ccd1" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="10" letterSpacing="3">
        SURVEY-GRADE · RTK ACCURATE
      </text>
    </g>
  </svg>
);

const Trench: React.FC = () => (
  <svg viewBox="0 0 600 400" className="w-full h-full" aria-hidden>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#15326b" />
        <stop offset="100%" stopColor="#0d2347" />
      </linearGradient>
      <linearGradient id="dirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a2a4a" />
        <stop offset="100%" stopColor="#050d22" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#sky)" />
    {/* surface */}
    <path d="M0,180 L240,180 L280,210 L320,210 L360,180 L600,180 L600,400 L0,400 Z" fill="url(#dirt)" />
    {/* trench walls */}
    <path d="M240,180 L280,210 L280,400 L240,400 Z" fill="#03081a" opacity="0.55" />
    <path d="M360,180 L320,210 L320,400 L360,400 Z" fill="#03081a" opacity="0.55" />

    {/* Colour coded utilities */}
    <g>
      {/* orange power */}
      <ellipse cx="300" cy="248" rx="22" ry="9" fill="#f47820" />
      <rect x="280" y="240" width="40" height="14" fill="#f47820" />
      {/* yellow gas */}
      <ellipse cx="300" cy="282" rx="20" ry="8" fill="#ffd23a" />
      <rect x="282" y="276" width="36" height="12" fill="#ffd23a" />
      {/* blue water */}
      <ellipse cx="300" cy="316" rx="18" ry="7" fill="#3aa6ff" />
      <rect x="284" y="311" width="32" height="11" fill="#3aa6ff" />
      {/* green comms */}
      <ellipse cx="300" cy="346" rx="16" ry="6" fill="#3ad97e" />
      <rect x="286" y="342" width="28" height="10" fill="#3ad97e" />
    </g>

    {/* surface markers */}
    <g>
      <rect x="80" y="160" width="14" height="22" fill="#f47820" />
      <rect x="86" y="138" width="2" height="22" fill="#c8ccd1" />
      <rect x="500" y="160" width="14" height="22" fill="#f47820" />
      <rect x="506" y="138" width="2" height="22" fill="#c8ccd1" />
    </g>

    {/* horizon stripe */}
    <rect x="0" y="0" width="600" height="4" fill="#f47820" />

    {/* label */}
    <g>
      <rect x="20" y="22" width="6" height="34" fill="#f47820" />
      <text x="36" y="40" fill="#ffffff" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="16" letterSpacing="2">
        KNOW WHAT'S BELOW
      </text>
      <text x="36" y="58" fill="#c8ccd1" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="10" letterSpacing="3">
        COLOUR-CODED UNDERGROUND SERVICES
      </text>
    </g>
  </svg>
);

const MapPlan: React.FC = () => (
  <svg viewBox="0 0 600 400" className="w-full h-full" aria-hidden>
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0d2347" />
        <stop offset="100%" stopColor="#081735" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#paper)" />
    {/* grid */}
    <g stroke="#1c3a73" strokeWidth="1" opacity="0.6">
      {Array.from({ length: 24 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="400" />
      ))}
      {Array.from({ length: 16 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 25} x2="600" y2={i * 25} />
      ))}
    </g>

    {/* roads */}
    <path d="M0,140 L600,160" stroke="#1f3f7a" strokeWidth="22" fill="none" />
    <path d="M0,140 L600,160" stroke="#c8ccd1" strokeWidth="1" strokeDasharray="8 8" fill="none" opacity="0.6" />
    <path d="M180,0 L200,400" stroke="#1f3f7a" strokeWidth="22" fill="none" />
    <path d="M180,0 L200,400" stroke="#c8ccd1" strokeWidth="1" strokeDasharray="8 8" fill="none" opacity="0.6" />

    {/* parcel outline */}
    <rect x="240" y="190" width="220" height="130" fill="none" stroke="#c8ccd1" strokeWidth="1.5" strokeDasharray="4 4" />

    {/* utility runs (colour coded) */}
    <path d="M40,300 L260,300 L260,220 L460,220" stroke="#f47820" strokeWidth="4" fill="none" />
    <circle cx="40" cy="300" r="6" fill="#f47820" />
    <circle cx="460" cy="220" r="6" fill="#f47820" />

    <path d="M60,330 L280,330 L280,260 L470,260" stroke="#3aa6ff" strokeWidth="4" fill="none" />
    <circle cx="60" cy="330" r="6" fill="#3aa6ff" />
    <circle cx="470" cy="260" r="6" fill="#3aa6ff" />

    <path d="M80,360 L300,360 L300,290 L480,290" stroke="#ffd23a" strokeWidth="4" fill="none" />
    <circle cx="80" cy="360" r="6" fill="#ffd23a" />
    <circle cx="480" cy="290" r="6" fill="#ffd23a" />

    {/* north */}
    <g transform="translate(540 50)">
      <circle r="22" fill="#0d2347" stroke="#f47820" strokeWidth="2" />
      <polygon points="0,-14 6,8 0,4 -6,8" fill="#f47820" />
      <text x="0" y="-26" textAnchor="middle" fill="#c8ccd1" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="10">N</text>
    </g>

    {/* legend */}
    <g transform="translate(20 20)">
      <rect width="170" height="86" fill="#081735" stroke="#f47820" strokeWidth="1" />
      <text x="10" y="18" fill="#ffffff" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="11" letterSpacing="2">RTK AS-BUILT</text>
      <g fontFamily="Inter, sans-serif" fontSize="10" fill="#c8ccd1">
        <rect x="10" y="28" width="14" height="4" fill="#f47820" /><text x="30" y="34">Power</text>
        <rect x="10" y="44" width="14" height="4" fill="#3aa6ff" /><text x="30" y="50">Water</text>
        <rect x="10" y="60" width="14" height="4" fill="#ffd23a" /><text x="30" y="66">Gas</text>
        <rect x="90" y="28" width="14" height="4" fill="#3ad97e" /><text x="110" y="34">Comms</text>
        <rect x="90" y="44" width="14" height="4" fill="#c8ccd1" /><text x="110" y="50">Boundary</text>
      </g>
    </g>
  </svg>
);

const Mark: React.FC = () => (
  <svg viewBox="0 0 600 400" className="w-full h-full" aria-hidden>
    <rect width="600" height="400" fill="#0d2347" />
    <g transform="translate(300 200)">
      {/* shield */}
      <path d="M0,-130 L110,-90 L100,60 Q60,140 0,160 Q-60,140 -100,60 L-110,-90 Z"
            fill="#081735" stroke="#f47820" strokeWidth="3" />
      {/* wave */}
      <path d="M-80,10 Q-40,-30 0,10 T80,10" stroke="#f47820" strokeWidth="10" fill="none" strokeLinecap="round" />
      <text y="-30" textAnchor="middle" fill="#c8ccd1" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="38" letterSpacing="6">NZ</text>
      <text y="80" textAnchor="middle" fill="#f47820" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="38" letterSpacing="6">UD</text>
    </g>
  </svg>
);

const BrandImage: React.FC<BrandImageProps> = ({ variant, className = '', title }) => {
  const Picked =
    variant === 'locator' ? Locator :
    variant === 'trench'  ? Trench  :
    variant === 'map'     ? MapPlan :
                            Mark;

  return (
    <div
      role={title ? 'img' : undefined}
      aria-label={title}
      className={`relative overflow-hidden bg-brand-navy ${className}`}
    >
      <Picked />
      {/* subtle orange corner accents to match brand */}
      <span className="absolute top-0 left-0 w-8 h-1 bg-brand-orange" />
      <span className="absolute bottom-0 right-0 w-8 h-1 bg-brand-orange" />
    </div>
  );
};

export default BrandImage;
