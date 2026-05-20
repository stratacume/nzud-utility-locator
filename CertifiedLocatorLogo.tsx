import React from 'react';

/**
 * NZL CERTLOC CERTIFIED beforeudig LOCATOR · CERTIFIED LOCATOR
 *
 * Rebuilt as a pure HTML/SVG composition (no embedded image) so it
 * scales crisply and matches the official artwork supplied by
 * Before You Dig NZ (NZ_Certified Locator_Logo-2024_Landscape).
 *
 * Layout: vertical badge on the left (red top / black bottom) and
 * large "CERTIFIED LOCATOR" wordmark to the right.
 */

interface CertifiedLocatorLogoProps {
  className?: string;
  /** Pixel height of the badge portion. Wordmark scales with it. Default 88 */
  size?: number;
  /** Variant: 'full' shows badge + wordmark, 'badge' shows badge only */
  variant?: 'full' | 'badge';
  /** When true, uses a light/white wordmark suited for dark backgrounds */
  onDark?: boolean;
}

const RED = '#E4202A';
const BLACK = '#111111';

/** The small location-pin-with-tick icon used on the red panel */
const PinTick: React.FC<{ size: number; color?: string }> = ({
  size,
  color = BLACK,
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.42-3.58-8-8-8z"
      fill={color}
    />
    <path
      d="M8.5 10.2l2.4 2.4 4.6-4.6"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const Badge: React.FC<{ height: number }> = ({ height }) => {
  // The badge artwork is roughly a 4:5 portrait rectangle.
  const width = Math.round(height * 0.78);
  const redH = Math.round(height * 0.32);
  const blackH = height - redH;

  return (
    <div
      className="relative flex flex-col shrink-0 rounded-[6px] overflow-hidden shadow-sm"
      style={{ width, height }}
      aria-label="NZL Certloc Certified beforeudig Locator"
    >
      {/* Red top panel: pin-tick + NZL */}
      <div
        className="flex items-center justify-center gap-[6%] px-[8%]"
        style={{ background: RED, height: redH }}
      >
        <PinTick size={Math.round(redH * 0.62)} color={BLACK} />
        <span
          className="font-black leading-none"
          style={{
            color: BLACK,
            fontSize: Math.round(redH * 0.62),
            letterSpacing: '-0.02em',
            fontFamily:
              "'Inter', 'Helvetica Neue', Arial, system-ui, sans-serif",
          }}
        >
          NZL
        </span>
      </div>

      {/* Black bottom panel */}
      <div
        className="flex flex-col items-center justify-center text-center px-[6%]"
        style={{ background: BLACK, height: blackH }}
      >
        <span
          className="font-black text-white leading-none"
          style={{
            fontSize: Math.round(blackH * 0.18),
            letterSpacing: '0.02em',
          }}
        >
          CERTLOC
        </span>

        <span
          className="font-black leading-none mt-[6%]"
          style={{
            color: RED,
            fontSize: Math.round(blackH * 0.18),
            letterSpacing: '0.04em',
          }}
        >
          CERTIFIED
        </span>

        {/* divider */}
        <span
          className="block bg-white/90 mt-[5%]"
          style={{ height: 1, width: '78%' }}
        />

        {/* beforeudig — lowercase wordmark, red "u" */}
        <span
          className="font-extrabold leading-none mt-[7%] tracking-tight"
          style={{
            fontSize: Math.round(blackH * 0.22),
            color: '#fff',
          }}
        >
          before
          <span style={{ color: RED }}>u</span>
          dig
        </span>

        <span
          className="font-black text-white leading-none mt-[8%]"
          style={{
            fontSize: Math.round(blackH * 0.13),
            letterSpacing: '0.18em',
          }}
        >
          LOCATOR
        </span>
      </div>
    </div>
  );
};

const CertifiedLocatorLogo: React.FC<CertifiedLocatorLogoProps> = ({
  className = '',
  size = 88,
  variant = 'full',
  onDark = false,
}) => {
  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <Badge height={size} />
      </span>
    );
  }

  // Wordmark sizing relative to the badge height
  const certifiedSize = Math.round(size * 0.42);
  const locatorSize = Math.round(size * 0.38);
  const wordmarkColor = onDark ? '#ffffff' : BLACK;

  return (
    <span
      className={`inline-flex items-center gap-[3%] ${className}`}
      style={{ gap: Math.round(size * 0.08) }}
    >
      <Badge height={size} />

      <span className="flex flex-col leading-[0.9] select-none">
        <span
          className="font-black tracking-tight"
          style={{
            color: RED,
            fontSize: certifiedSize,
            letterSpacing: '-0.01em',
            fontFamily:
              "'Inter', 'Helvetica Neue', Arial, system-ui, sans-serif",
          }}
        >
          CERTIFIED
        </span>
        <span
          className="font-light tracking-tight"
          style={{
            color: wordmarkColor,
            fontSize: locatorSize,
            letterSpacing: '0.01em',
            marginTop: Math.round(size * 0.02),
            fontFamily:
              "'Inter', 'Helvetica Neue', Arial, system-ui, sans-serif",
          }}
        >
          LOCATOR
        </span>
      </span>
    </span>
  );
};

export default CertifiedLocatorLogo;
