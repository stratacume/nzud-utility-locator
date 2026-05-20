import React from 'react';

/**
 * NZUDTextLogo — premium top brand banner.
 *
 * Sits directly below the fixed Navigation and above the HeroSection.
 * Renders the NZUD wordmark (metallic silver "NZ" + orange "UD") on a deep
 * navy gradient with a subtle premium glow, and the full company name
 * centred underneath. A thin orange divider line at the bottom separates
 * this banner from the rest of the page (which is unchanged).
 */
interface NZUDTextLogoProps {
  className?: string;
}

const NZUDTextLogo: React.FC<NZUDTextLogoProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        background:
          'linear-gradient(180deg, #03081a 0%, #061230 45%, #0a1d3d 100%)',
      }}
    >
      {/* Subtle premium glow — centred, behind the wordmark */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-[900px] h-[120%] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,138,31,0.10) 0%, rgba(159,192,236,0.05) 35%, rgba(0,0,0,0) 70%)',
          filter: 'blur(40px)',
        }}
        aria-hidden="true"
      />

      {/* Faint top highlight for depth */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 container mx-auto px-5 md:px-8 py-12 md:py-20">
        <div className="flex flex-col items-center text-center">
          {/* NZUD wordmark */}
          <div className="flex items-baseline leading-none select-none">
            <span
              className="font-black tracking-tight"
              style={{
                fontSize: 'clamp(3.75rem, 13vw, 9rem)',
                background:
                  'linear-gradient(180deg, #f4f8ff 0%, #c5d8f2 30%, #6b8fc0 55%, #d8e6f8 78%, #7a9cc8 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 18px rgba(159,192,236,0.18)',
                fontFamily: '"Arial Black", "Helvetica Neue", sans-serif',
                letterSpacing: '-0.04em',
              }}
            >
              NZ
            </span>
            <span
              className="font-black tracking-tight"
              style={{
                fontSize: 'clamp(3.75rem, 13vw, 9rem)',
                background:
                  'linear-gradient(180deg, #ffe3bf 0%, #ff9a35 32%, #d76a14 58%, #ffc079 82%, #c9560a 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 22px rgba(255,138,31,0.30)',
                fontFamily: '"Arial Black", "Helvetica Neue", sans-serif',
                letterSpacing: '-0.04em',
              }}
            >
              UD
            </span>
          </div>

          {/* Tagline */}
          <p
            className="text-white/90 font-semibold uppercase mt-6 md:mt-8"
            style={{
              fontSize: 'clamp(0.8rem, 1.9vw, 1.15rem)',
              letterSpacing: '0.32em',
            }}
          >
            NZ Utility Detection Ltd
          </p>
        </div>
      </div>

      {/* Thin orange divider line at the bottom (retained) */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-orange" />
    </div>
  );
};

export default NZUDTextLogo;
