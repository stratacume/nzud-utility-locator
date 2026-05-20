import React from 'react';

/**
 * BrandBanner — top hero banner showing the NZUD acronym and full company name.
 * Sits above the Navigation bar.
 */
const BrandBanner: React.FC = () => {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #050d22 0%, #0a1d3d 55%, #15326b 100%)',
      }}
    >
      {/* Top + bottom orange safety stripes */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-brand-orange" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />

      {/* Decorative glow */}
      <div className="absolute -left-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 container mx-auto px-5 md:px-8 py-8 md:py-12">
        <div className="flex flex-col items-center text-center">
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-none"
            style={{ letterSpacing: '0.05em' }}
          >
            NZ<span className="text-brand-orange">U</span>D
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-px w-8 md:w-12 bg-brand-orange" />
            <p className="text-sm sm:text-base md:text-lg text-white/90 font-bold uppercase tracking-[0.25em]">
              Nzutilitydetection
            </p>
            <span className="h-px w-8 md:w-12 bg-brand-orange" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandBanner;
