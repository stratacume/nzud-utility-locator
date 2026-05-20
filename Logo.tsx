import React from 'react';

/**
 * NZUD Logo - official brand mark.
 * Uses the supplied logo asset (silver "NZ" + orange "UD" wave-mark
 * with "NZ UTILITY DETECTION LTD" beneath).
 */
const LOGO_SRC =
  'https://d64gsuwffb70l.cloudfront.net/6854e23134e69dd158550ff3_1777610697119_e144c31f.png';

interface LogoProps {
  className?: string;
  /** Kept for API compatibility — the official mark already includes the tagline. */
  showTagline?: boolean;
  alt?: string;
}

const Logo: React.FC<LogoProps> = ({
  className = '',
  alt = 'NZUD - NZ Utility Detection Ltd',
}) => {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  );
};

export default Logo;
