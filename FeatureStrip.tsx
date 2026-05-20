import React from 'react';
import BrandImage from './BrandImage';
import { Phone, ArrowRight } from 'lucide-react';

interface FeatureStripProps {
  onQuoteClick?: () => void;
}

/**
 * Wide visual feature strip — uses the existing on-brand BrandImage artwork
 * (not changing imagery style). Adds a layered orange/navy overlay and CTA.
 */
const FeatureStrip: React.FC<FeatureStripProps> = ({ onQuoteClick }) => {
  return (
    <section className="relative bg-brand-navy-dark overflow-hidden">
      {/* Wide artwork */}
      <div className="relative h-[300px] md:h-[420px] w-full">
        <BrandImage
          variant="trench"
          title="On-site EMF Locating"
          className="absolute inset-0 w-full h-full"
        />
        {/* Navy left-to-right overlay so text reads cleanly */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,23,53,0.95) 0%, rgba(13,35,71,0.85) 40%, rgba(13,35,71,0.4) 75%, rgba(13,35,71,0.15) 100%)',
          }}
        />

        <div className="relative z-10 container mx-auto px-4 md:px-8 h-full flex items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 border border-brand-orange/60 bg-brand-orange/15 rounded-full">
              <span className="text-brand-orange text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase">
                On the Job
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-[0.95] mb-4">
              Know what's below.<br />
              <span className="text-brand-orange">Mark what matters.</span>
            </h2>
            <p className="text-brand-silver text-sm md:text-base mb-6 max-w-md">
              Underground power, comms, water and gas — colour-coded, marked
              and mapped before you break ground.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onQuoteClick}
                className="group bg-brand-orange hover:bg-brand-orange-light text-white font-bold py-3 px-6 text-xs md:text-sm uppercase tracking-wider rounded-md flex items-center gap-2 transition-colors"
              >
                Book a Locate
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="tel:0272670217"
                className="border border-white/40 hover:border-brand-orange text-white hover:text-brand-orange font-bold py-3 px-5 text-xs md:text-sm uppercase tracking-wider rounded-md flex items-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4" />
                027 267 0217
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Orange tagline ribbon */}
      <div className="bg-brand-orange">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-white text-xs md:text-sm font-bold uppercase tracking-[0.25em]">
          <span>Accurate.</span>
          <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/80" />
          <span>Reliable.</span>
          <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/80" />
          <span>Safe.</span>
        </div>
      </div>
    </section>
  );
};

export default FeatureStrip;
